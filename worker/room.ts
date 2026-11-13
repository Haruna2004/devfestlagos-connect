// The live event room: one Durable Object holds everyone's position in memory.
// Pings never write to D1. Cloudflare can shut an idle room down at any time
// (and wipe its memory), so the room also keeps a small copy of positions in its
// own storage: written at most once a minute per person (or after a real move),
// deleted when someone leaves or goes quiet for 10 minutes.
// Profiles, blocks and unread counts are loaded from D1 once and cached here;
// the API tells the room when they change.

import { DurableObject } from "cloudflare:workers";
import { INTRO_MIN, match, rarityFrom } from "../shared/match";
import { describe, metres, smooth } from "../shared/presence";
import type { Fix } from "../shared/presence";
import type { Band, NearbyPerson, PingResult, Profile } from "../shared/types";
import { now, sha256, toProfile } from "./common";
import type { Env, Row } from "./common";

const STALE_MS = 10 * 60 * 1000; // drop people not heard from in 10 min
const FIX_WINDOW_MS = 90 * 1000; // smooth over fixes from the last 90s
const MAX_FIXES = 3;
const NEAREST = 30;
const MAX_INTROS = 5;
const PERSIST_MS = 60 * 1000; // copy a position to storage at most this often…
const PERSIST_MOVE_M = 10; // …unless the person moved this far

type Member = {
  profile: Profile;
  secretHash: string;
  visible: boolean;
  blocked: Set<string>; // I blocked them or they blocked me
  unread: number;
};

type Presence = { fixes: Fix[]; seenAt: number };

export type PingError = { error: string; status: 400 | 401 };

export class EventRoom extends DurableObject<Env> {
  private members = new Map<string, Member>();
  private here = new Map<string, Presence>();
  // Last band each viewer saw for each person, so bands don't flicker.
  private lastBand = new Map<string, Map<string, Band>>();
  private persisted = new Map<string, Fix>(); // last copy written to storage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      sql.exec("CREATE TABLE IF NOT EXISTS presence (id TEXT PRIMARY KEY, lat REAL, lng REAL, acc REAL, seen_at INTEGER)");
      const cutoff = now() - STALE_MS;
      sql.exec("DELETE FROM presence WHERE seen_at < ?", cutoff);
      for (const r of sql.exec<{ id: string; lat: number; lng: number; acc: number; seen_at: number }>("SELECT * FROM presence")) {
        const fix = { lat: r.lat, lng: r.lng, acc: r.acc, at: r.seen_at };
        this.here.set(r.id, { fixes: [fix], seenAt: r.seen_at });
        this.persisted.set(r.id, fix);
      }
    });
  }

  // ---------- called by the API ----------

  async ping(token: string, lat: number, lng: number, accuracy: number): Promise<PingResult | PingError> {
    const me = await this.auth(token);
    if (!me) return { error: "unauthorized", status: 401 };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "bad location", status: 400 };
    const acc = Number.isFinite(accuracy) ? Math.min(Math.max(accuracy, 3), 5000) : 100;

    const radius = Number(this.env.VENUE_RADIUS_M) || 0;
    const venueDistance = Math.round(metres(lat, lng, Number(this.env.VENUE_LAT), Number(this.env.VENUE_LNG)));
    // Give a bad GPS fix some benefit of the doubt, up to 200m.
    const atVenue = radius === 0 || venueDistance <= radius + Math.min(acc, 200);
    const base = { atVenue, venueDistance, people: [], more: 0, intros: [], unread: me.unread };
    if (!atVenue) {
      this.leave(me.profile.id); // outside the venue we forget where you are
      return base;
    }

    const t = now();
    const p = this.here.get(me.profile.id) ?? { fixes: [], seenAt: t };
    p.fixes = [...p.fixes.filter((f) => t - f.at < FIX_WINDOW_MS), { lat, lng, acc, at: t }].slice(-MAX_FIXES);
    p.seenAt = t;
    this.here.set(me.profile.id, p);
    this.persist(me.profile.id, smooth(p.fixes));
    this.sweep(t);

    const all = await this.visibleTo(me);
    const nearest = all.slice(0, NEAREST);
    const intros = all
      .filter((x) => x.match >= INTRO_MIN)
      .sort((a, b) => b.match - a.match || a.distance - b.distance)
      .slice(0, MAX_INTROS);
    return { ...base, people: nearest, more: Math.max(0, all.length - nearest.length), intros };
  }

  // Search everyone at the venue, not just your nearest 30.
  async search(token: string, q: string): Promise<NearbyPerson[] | PingError> {
    const me = await this.auth(token);
    if (!me) return { error: "unauthorized", status: 401 };
    const query = q.trim().toLowerCase();
    if (!query || !this.here.has(me.profile.id)) return [];
    return (await this.visibleTo(me))
      .filter((x) => [x.name, x.title, x.company, ...x.tags, ...x.skills].some((f) => f.toLowerCase().includes(query)))
      .slice(0, NEAREST);
  }

  // Profile, visibility or photo changed: reload on next use.
  async forget(id: string) {
    this.members.delete(id);
  }

  // Card deleted.
  async remove(id: string) {
    this.members.delete(id);
    this.leave(id);
  }

  async setUnread(id: string, n: number) {
    const m = this.members.get(id);
    if (m) m.unread = n;
  }

  async bumpUnread(id: string) {
    const m = this.members.get(id);
    if (m) m.unread += 1;
  }

  // ---------- internals ----------

  private async auth(token: string): Promise<Member | null> {
    const [id, secret] = token.split(".");
    if (!id || !secret) return null;
    const m = await this.member(id);
    return m && m.secretHash === (await sha256(secret)) ? m : null;
  }

  private async member(id: string): Promise<Member | null> {
    const cached = this.members.get(id);
    if (cached) return cached;
    const db = this.env.DB;
    const [row, blocks, unread] = await Promise.all([
      db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<Row>(),
      db
        .prepare("SELECT blocked AS id FROM blocks WHERE blocker = ?1 UNION SELECT blocker AS id FROM blocks WHERE blocked = ?1")
        .bind(id)
        .all<{ id: string }>(),
      db.prepare("SELECT COUNT(*) AS n FROM messages WHERE to_id = ? AND read_at IS NULL").bind(id).first<number>("n"),
    ]);
    if (!row) return null;
    const m: Member = {
      profile: toProfile(row),
      secretHash: row.secret_hash,
      visible: row.visible === 1,
      blocked: new Set(blocks.results.map((b) => b.id)),
      unread: unread ?? 0,
    };
    this.members.set(id, m);
    return m;
  }

  private persist(id: string, fix: Fix) {
    const last = this.persisted.get(id);
    if (last && fix.at - last.at < PERSIST_MS && metres(last.lat, last.lng, fix.lat, fix.lng) < PERSIST_MOVE_M) return;
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO presence (id, lat, lng, acc, seen_at) VALUES (?, ?, ?, ?, ?)",
      id,
      fix.lat,
      fix.lng,
      fix.acc,
      fix.at,
    );
    this.persisted.set(id, fix);
  }

  private leave(id: string) {
    if (this.here.has(id) || this.persisted.has(id)) this.ctx.storage.sql.exec("DELETE FROM presence WHERE id = ?", id);
    this.persisted.delete(id);
    this.here.delete(id);
    this.lastBand.delete(id);
    for (const seen of this.lastBand.values()) seen.delete(id);
  }

  private sweep(t: number) {
    for (const [id, p] of this.here) if (t - p.seenAt > STALE_MS) this.leave(id);
  }

  // Everyone this person may see, closest first, with match scores.
  private async visibleTo(me: Member): Promise<NearbyPerson[]> {
    const t = now();
    const mine = this.here.get(me.profile.id);
    if (!mine) return [];
    // Reload anyone whose card changed since we cached it.
    await Promise.all([...this.here.keys()].filter((id) => !this.members.has(id)).map((id) => this.member(id)));
    const myPos = smooth(mine.fixes);
    const others: { m: Member; pos: Fix; seenAt: number }[] = [];
    for (const [id, p] of this.here) {
      if (id === me.profile.id || me.blocked.has(id)) continue;
      const m = this.members.get(id);
      if (!m || !m.visible || m.blocked.has(me.profile.id)) continue;
      others.push({ m, pos: smooth(p.fixes), seenAt: p.seenAt });
    }
    const rarity = rarityFrom(others.map((o) => o.m.profile));
    const seen = this.lastBand.get(me.profile.id) ?? new Map<string, Band>();
    this.lastBand.set(me.profile.id, seen);

    const out = others.map(({ m, pos, seenAt }) => {
      const p = m.profile;
      const d = metres(myPos.lat, myPos.lng, pos.lat, pos.lng);
      const where = describe(d, myPos.acc, pos.acc, seen.get(p.id));
      seen.set(p.id, where.band);
      const fit = match(me.profile, p, where.band, rarity);
      const person: NearbyPerson = {
        id: p.id,
        name: p.name,
        title: p.title,
        company: p.company,
        photo: p.photo,
        findMe: p.findMe,
        tags: p.tags,
        lookingFor: p.lookingFor,
        skills: p.skills,
        ...where,
        seenAgo: Math.max(0, Math.round((t - seenAt) / 1000)),
        match: fit.score,
        reasons: fit.reasons,
      };
      return person;
    });
    return out.sort((a, b) => a.distance - b.distance);
  }
}

