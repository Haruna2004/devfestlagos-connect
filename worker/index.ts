import { Hono } from "hono";
import type { Context } from "hono";
import { cleanSkills, SKILL_LIMITS } from "../shared/skills";
import { LIMITS, LOOKING_FOR, ROLE_TAGS } from "../shared/types";
import type { Conversation, Links, Message, PersonLite, ProfileInput, Thread } from "../shared/types";
import { now, room, sha256, toMine, toProfile } from "./common";
import type { Env, Row } from "./common";

export { EventRoom } from "./room";

type Ctx = Context<{ Bindings: Env; Variables: { me: Row } }>;

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const app = new Hono<{ Bindings: Env; Variables: { me: Row } }>();

// ---------- helpers ----------

function randomId(bytes: number) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : undefined;

function cleanLink(v: unknown) {
  const s = clip(v, LIMITS.link);
  if (!s) return undefined;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// Turns client input into DB columns. Unknown or invalid fields are dropped.
function toColumns(input: ProfileInput) {
  const cols: Record<string, string | number> = {};
  const name = clip(input.name, LIMITS.name);
  if (name !== undefined) cols.name = name;
  const title = clip(input.title, LIMITS.title);
  if (title !== undefined) cols.title = title;
  const company = clip(input.company, LIMITS.company);
  if (company !== undefined) cols.company = company;
  const bio = clip(input.bio, LIMITS.bio);
  if (bio !== undefined) cols.bio = bio;
  const findMe = clip(input.findMe, LIMITS.findMe);
  if (findMe !== undefined) cols.find_me = findMe;
  if (Array.isArray(input.tags)) {
    cols.tags = JSON.stringify(
      input.tags
        .filter((t) => (ROLE_TAGS as readonly string[]).includes(t))
        .slice(0, 3),
    );
  }
  if (Array.isArray(input.lookingFor)) {
    cols.looking_for = JSON.stringify(
      input.lookingFor
        .filter((t) => (LOOKING_FOR as readonly string[]).includes(t))
        .slice(0, 4),
    );
  }
  if (Array.isArray(input.skills)) cols.skills = JSON.stringify(cleanSkills(input.skills, SKILL_LIMITS.have));
  if (Array.isArray(input.wantsSkills)) cols.wants_skills = JSON.stringify(cleanSkills(input.wantsSkills, SKILL_LIMITS.want));
  if (input.links && typeof input.links === "object") {
    const links: Links = {
      linkedin: cleanLink(input.links.linkedin),
      x: cleanLink(input.links.x),
      website: cleanLink(input.links.website),
    };
    cols.links = JSON.stringify(links);
  }
  if (typeof input.visible === "boolean") cols.visible = input.visible ? 1 : 0;
  return cols;
}

// ---------- auth: "Authorization: Bearer <id>.<secret>" ----------

async function auth(c: Ctx, next: () => Promise<void>) {
  const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const [id, secret] = token.split(".");
  if (!id || !secret) return c.json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<Row>();
  if (!row || row.secret_hash !== (await sha256(secret)))
    return c.json({ error: "unauthorized" }, 401);
  c.set("me", row);
  await next();
}

// ---------- routes ----------

app.post("/api/me", async (c) => {
  const input = await c.req
    .json<ProfileInput>()
    .catch(() => ({}) as ProfileInput);
  const cols = toColumns(input);
  if (!cols.name) return c.json({ error: "name required" }, 400);
  const id = randomId(10);
  const secret = randomId(32);
  const t = now();
  const all = {
    ...cols,
    id,
    secret_hash: await sha256(secret),
    created_at: t,
    updated_at: t,
  };
  const keys = Object.keys(all);
  await c.env.DB.prepare(
    `INSERT INTO users (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
  )
    .bind(...Object.values(all))
    .run();
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<Row>();
  return c.json({ id, secret, profile: toMine(row!) });
});

app.get("/api/me", auth, (c) => c.json(toMine(c.get("me"))));

app.patch("/api/me", auth, async (c) => {
  const me = c.get("me");
  const cols = toColumns(await c.req.json<ProfileInput>().catch(() => ({})));
  if (cols.name === "") return c.json({ error: "name required" }, 400);
  if (Object.keys(cols).length) {
    cols.updated_at = now();
    const keys = Object.keys(cols);
    await c.env.DB.prepare(
      `UPDATE users SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
    )
      .bind(...Object.values(cols), me.id)
      .run();
    await room(c.env).forget(me.id);
  }
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(me.id)
    .first<Row>();
  return c.json(toMine(row!));
});

app.delete("/api/me", auth, async (c) => {
  const me = c.get("me");
  if (me.photo) await c.env.PHOTOS.delete(me.photo);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(me.id),
    c.env.DB.prepare("DELETE FROM messages WHERE from_id = ?1 OR to_id = ?1").bind(me.id),
    c.env.DB.prepare("DELETE FROM blocks WHERE blocker = ?1 OR blocked = ?1").bind(me.id),
  ]);
  await room(c.env).remove(me.id);
  return c.json({ ok: true });
});

app.put("/api/me/photo", auth, async (c) => {
  const me = c.get("me");
  const type = c.req.header("content-type") ?? "";
  if (!/^image\/(jpeg|webp|png)$/.test(type))
    return c.json({ error: "bad image type" }, 400);
  const body = await c.req.arrayBuffer();
  if (body.byteLength > MAX_PHOTO_BYTES)
    return c.json({ error: "image too large" }, 413);
  const key = `${me.id}/${now()}`;
  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType: type } });
  await c.env.DB.prepare(
    "UPDATE users SET photo = ?, updated_at = ? WHERE id = ?",
  )
    .bind(key, now(), me.id)
    .run();
  if (me.photo) await c.env.PHOTOS.delete(me.photo);
  await room(c.env).forget(me.id);
  return c.json({ photo: `/photos/${key}` });
});

app.get("/api/users/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(c.req.param("id"))
    .first<Row>();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(toProfile(row));
});

// ---------- live presence (handled by the event room, see room.ts) ----------

const token = (c: Ctx) => c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

app.post("/api/me/ping", async (c) => {
  const body = await c.req.json<{ lat: number; lng: number; accuracy: number }>().catch(() => null);
  if (!body) return c.json({ error: "bad location" }, 400);
  const res = await room(c.env).ping(token(c), body.lat, body.lng, body.accuracy);
  return "error" in res ? c.json({ error: res.error }, res.status) : c.json(res);
});

app.get("/api/me/search", async (c) => {
  const res = await room(c.env).search(token(c), c.req.query("q") ?? "");
  return "error" in res ? c.json({ error: res.error }, res.status) : c.json(res);
});

// ---------- messages ----------

// People I blocked, plus people who blocked me. Either way we don't see each other.
async function blockedSet(env: Env, id: string) {
  const { results } = await env.DB.prepare(
    "SELECT blocked AS id FROM blocks WHERE blocker = ?1 UNION SELECT blocker AS id FROM blocks WHERE blocked = ?1",
  )
    .bind(id)
    .all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

type MsgRow = { id: number; from_id: string; to_id: string; body: string; created_at: number };

const toMessage = (r: MsgRow): Message => ({ id: r.id, from: r.from_id, to: r.to_id, body: r.body, at: r.created_at });

const toLite = (r: Row): PersonLite => ({
  id: r.id,
  name: r.name,
  title: r.title,
  company: r.company,
  photo: r.photo ? `/photos/${r.photo}` : null,
});

const MSG_PER_MIN = 20;

app.get("/api/me/threads", auth, async (c) => {
  const me = c.get("me");
  // Latest message per person I've talked with.
  const { results: lasts } = await c.env.DB.prepare(
    `SELECT m.* FROM messages m
     JOIN (
       SELECT CASE WHEN from_id = ?1 THEN to_id ELSE from_id END AS other, MAX(id) AS last_id
       FROM messages WHERE from_id = ?1 OR to_id = ?1 GROUP BY other
     ) t ON m.id = t.last_id
     ORDER BY m.id DESC LIMIT 50`,
  )
    .bind(me.id)
    .all<MsgRow>();
  if (!lasts.length) return c.json([] as Thread[]);

  const others = lasts.map((m) => (m.from_id === me.id ? m.to_id : m.from_id));
  const marks = others.map(() => "?").join(",");
  const [{ results: users }, { results: counts }, blocked] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM users WHERE id IN (${marks})`).bind(...others).all<Row>(),
    c.env.DB.prepare(
      "SELECT from_id, COUNT(*) AS n FROM messages WHERE to_id = ? AND read_at IS NULL GROUP BY from_id",
    )
      .bind(me.id)
      .all<{ from_id: string; n: number }>(),
    blockedSet(c.env, me.id),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const unread = new Map(counts.map((r) => [r.from_id, r.n]));

  const threads: Thread[] = [];
  lasts.forEach((m, i) => {
    const u = byId.get(others[i]);
    if (!u || blocked.has(u.id)) return;
    threads.push({ person: toLite(u), last: toMessage(m), unread: unread.get(u.id) ?? 0 });
  });
  return c.json(threads);
});

app.get("/api/me/messages/:other", auth, async (c) => {
  const me = c.get("me");
  const other = c.req.param("other") ?? "";
  const after = Number(c.req.query("after")) || 0;
  const [user, { results }, iBlocked] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(other).first<Row>(),
    c.env.DB.prepare(
      `SELECT * FROM messages
       WHERE id > ?3 AND ((from_id = ?1 AND to_id = ?2) OR (from_id = ?2 AND to_id = ?1))
       ORDER BY id DESC LIMIT 200`,
    )
      .bind(me.id, other, after)
      .all<MsgRow>(),
    c.env.DB.prepare("SELECT 1 FROM blocks WHERE blocker = ? AND blocked = ?").bind(me.id, other).first(),
  ]);
  if (results.some((m) => m.to_id === me.id)) {
    await c.env.DB.prepare("UPDATE messages SET read_at = ? WHERE to_id = ? AND from_id = ? AND read_at IS NULL")
      .bind(now(), me.id, other)
      .run();
    const left = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE to_id = ? AND read_at IS NULL")
      .bind(me.id)
      .first<number>("n");
    await room(c.env).setUnread(me.id, left ?? 0);
  }
  const convo: Conversation = {
    person: user ? toLite(user) : null,
    messages: results.reverse().map(toMessage),
    blocked: !!iBlocked,
  };
  return c.json(convo);
});

app.post("/api/me/messages/:other", auth, async (c) => {
  const me = c.get("me");
  const other = c.req.param("other") ?? "";
  const input = await c.req.json<{ body?: string }>().catch(() => ({}) as { body?: string });
  const body = clip(input.body, LIMITS.message);
  if (!body) return c.json({ error: "Message is empty" }, 400);
  if (other === me.id) return c.json({ error: "That's you" }, 400);

  const [target, blocked, recent] = await Promise.all([
    c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(other).first(),
    blockedSet(c.env, me.id),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE from_id = ? AND created_at > ?")
      .bind(me.id, now() - 60_000)
      .first<number>("n"),
  ]);
  if (!target) return c.json({ error: "This person deleted their card" }, 404);
  if (blocked.has(other)) return c.json({ error: "You can't message this person" }, 403);
  if ((recent ?? 0) >= MSG_PER_MIN) return c.json({ error: "Slow down a little" }, 429);

  const t = now();
  const row = await c.env.DB.prepare(
    "INSERT INTO messages (from_id, to_id, body, created_at) VALUES (?, ?, ?, ?) RETURNING *",
  )
    .bind(me.id, other, body, t)
    .first<MsgRow>();
  await room(c.env).bumpUnread(other);
  return c.json(toMessage(row!));
});

app.put("/api/me/blocks/:other", auth, async (c) => {
  const me = c.get("me");
  const other = c.req.param("other") ?? "";
  await c.env.DB.prepare("INSERT OR IGNORE INTO blocks (blocker, blocked, created_at) VALUES (?, ?, ?)")
    .bind(me.id, other, now())
    .run();
  // Blocks hide both people from each other: reload both in the room.
  await Promise.all([room(c.env).forget(me.id), room(c.env).forget(other)]);
  return c.json({ ok: true });
});

app.delete("/api/me/blocks/:other", auth, async (c) => {
  const me = c.get("me");
  const other = c.req.param("other") ?? "";
  await c.env.DB.prepare("DELETE FROM blocks WHERE blocker = ? AND blocked = ?").bind(me.id, other).run();
  await Promise.all([room(c.env).forget(me.id), room(c.env).forget(other)]);
  return c.json({ ok: true });
});

app.get("/photos/*", async (c) => {
  const key = c.req.path.replace(/^\/photos\//, "");
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});

app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

export default app;
