import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EVENT } from "../../shared/event";
import type { Band, MyProfile, NearbyPerson } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { Radar } from "../components/Radar";
import { BAND_TITLE, freshness, gpsQuality, km, STALE_S, where } from "../components/format";
import { IconChevron, IconClose, IconEyeOff, IconPin, IconShare, IconSpark } from "../components/icons";
import { api } from "../lib/api";
import type { Identity } from "../lib/api";
import { useHiddenIntros } from "../lib/hiddenIntros";
import { missing, NEXT_LABEL, STEPS } from "../lib/strength";
import type { useNearby } from "../lib/useNearby";

const BANDS: Band[] = ["steps", "near", "walk", "venue"];

export function Nearby({
  me,
  identity,
  nearby,
  onPick,
  onMessage,
  onBoost,
}: {
  me: MyProfile;
  identity: Identity;
  nearby: ReturnType<typeof useNearby>;
  onPick: (p: NearbyPerson) => void;
  onMessage: (p: NearbyPerson) => void;
  onBoost: () => void;
}) {
  const { geo, start, result, accuracy, error } = nearby;
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<NearbyPerson[] | null>(null);

  const people = result?.people ?? [];
  const { hidden, hide } = useHiddenIntros();
  const introIds = useMemo(() => new Set((result?.intros ?? []).map((p) => p.id)), [result]);
  // Said hi or dismissed? Drop them from "You should meet" (they stay in the list below).
  const intros = (result?.intros ?? []).filter((p) => !hidden.has(p.id));

  // Search runs in the event room across everyone, not just your nearest 30.
  const query = q.trim();
  useEffect(() => {
    if (!query) return setFound(null);
    let live = true;
    const t = setTimeout(() => {
      api
        .search(identity, query)
        .then((r) => live && setFound(r))
        .catch(() => {});
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, identity]);

  const base = query && found ? found : people;
  const list = onlyMatches ? base.filter((p) => p.match > 0) : base;

  const ready = geo === "on" && result?.atVenue;
  const total = people.length + (result?.more ?? 0);
  const todo = missing(me);
  const gps = accuracy != null ? gpsQuality(accuracy) : null;

  return (
    <div className="min-h-full pb-28">
      <header className="bg-ink pt-safe text-paper">
        <TopBar
          right={
            gps && (
              <span className="flex items-center gap-1.5 border border-paper/30 px-2 py-0.5 text-[12px] text-paper/85">
                <span className={`size-2 ${gps.tone === "good" ? "bg-g-green" : gps.tone === "rough" ? "bg-amber" : "bg-g-red"}`} />
                GPS {gps.label}
              </span>
            )
          }
        />
        <h1 className="px-5 pt-3 pb-5 font-display text-[34px] leading-[1.02]">
          {!ready ? (
            "Who's around?"
          ) : total === 0 ? (
            "Just you so far"
          ) : (
            <>
              <span className="text-amber">{total}</span> {total === 1 ? "person" : "people"} here
            </>
          )}
        </h1>
        <Radar people={ready ? people : []} intros={introIds} onPick={onPick} />
      </header>

      <div className="border-t-2 border-ink pt-5">
        {!me.visible && (
          <Banner tone="ink" icon={<IconEyeOff width={20} height={20} />}>
            You're hidden. Others can't see you. Turn it off in Me.
          </Banner>
        )}
        {ready && gps?.tone === "weak" && (
          <Banner tone="ink" icon={<IconPin width={20} height={20} />}>
            Weak GPS signal. Distances will be rough. Step near a door or window for a better one.
          </Banner>
        )}

        {geo !== "on" ? (
          <LocationAsk geo={geo} onStart={start} />
        ) : !result ? (
          <Skeletons />
        ) : !result.atVenue ? (
          <Empty
            title={`You're not at ${EVENT.name} yet`}
            body={`You're about ${km(result.venueDistance)} from ${EVENT.venue}. Connect works once you're at the venue.`}
          />
        ) : (
          <>
            {todo.length > 0 && <StrengthCard doneCount={STEPS.length - todo.length} next={NEXT_LABEL[todo[0]]} onClick={onBoost} />}

            <AnimatePresence initial={false}>
              {intros.length > 0 && (
                <motion.section key="intros" exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                  <h2 className="flex items-center gap-2 px-5 pb-3 font-display text-[24px] leading-none">
                    <IconSpark width={18} height={18} className="text-amber" /> You should meet
                  </h2>
                  <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                    <AnimatePresence initial={false}>
                      {intros.map((p) => (
                        <IntroCard
                          key={p.id}
                          p={p}
                          onOpen={() => onPick(p)}
                          onMessage={() => {
                            hide(p.id);
                            onMessage(p);
                          }}
                          onDismiss={() => hide(p.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {total > 0 && (
              <div className="flex gap-2 px-5">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Find anyone: skill, role, name"
                  autoCapitalize="off"
                  className="h-11 min-w-0 flex-1 border-2 border-ink bg-card px-3 outline-none placeholder:text-ink/35 focus:bg-white"
                />
                <button
                  onClick={() => setOnlyMatches(!onlyMatches)}
                  className={`h-11 shrink-0 border-2 border-ink px-3 text-[15px] font-medium ${onlyMatches ? "bg-ink text-paper" : "bg-card"}`}
                >
                  ★ Matches
                </button>
              </div>
            )}

            {total === 0 ? (
              <Empty
                title="No one else yet"
                body={`Share Connect with the people you meet at ${EVENT.name}. The more who join, the better the intros.`}
                action={<ShareApp />}
              />
            ) : list.length === 0 ? (
              <p className="px-5 pt-6 text-center text-[15px] text-muted">{query ? "No one here matches that." : "No matches nearby right now."}</p>
            ) : (
              BANDS.map((band) => {
                const group = list.filter((p) => p.band === band);
                if (!group.length) return null;
                return (
                  <section key={band} className="mt-6">
                    <h2 className="px-5 pb-2 font-display text-[22px] leading-none">{BAND_TITLE[band]}</h2>
                    <ul className="grid grid-cols-1 gap-3 px-5">
                      {group.map((p, i) => (
                        <PersonRow key={p.id} p={p} i={i} isMatch={introIds.has(p.id) || p.match > 0} onClick={() => onPick(p)} />
                      ))}
                    </ul>
                  </section>
                );
              })
            )}

            {!query && (result.more ?? 0) > 0 && (
              <p className="mx-5 mt-6 border-2 border-dashed border-ink/30 p-4 text-center text-[15px]">
                <b>{result.more} more</b> elsewhere at the venue. Search to find anyone.
              </p>
            )}
            {error && <p className="mt-4 text-center text-[13px] text-muted">Offline? Retrying…</p>}
            <p className="mx-auto mt-8 max-w-[300px] px-5 text-center text-[13px] text-muted">
              Distances are a rough guide. Use "find me" notes, photos, messages and Light up to find each other.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function IntroCard({
  p,
  onOpen,
  onMessage,
  onDismiss,
}: {
  p: NearbyPerson;
  onOpen: () => void;
  onMessage: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.9, width: 0, marginRight: -12 }}
      transition={{ duration: 0.2 }}
      className="pop relative flex w-[280px] shrink-0 snap-start flex-col border-2 border-ink bg-amber p-4"
    >
      <button
        onClick={onDismiss}
        className="absolute top-1.5 right-1.5 grid size-9 place-items-center text-ink/70 active:text-ink"
        aria-label={`Dismiss ${p.name}`}
      >
        <IconClose width={18} height={18} />
      </button>
      <button onClick={onOpen} className="flex items-center gap-3 pr-6 text-left">
        <Avatar name={p.name} photo={p.photo} seed={p.id} size={52} />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{p.name}</div>
          <div className="truncate text-[14px]">{where(p)}</div>
        </div>
      </button>
      <p className="mt-3 flex-1 text-[15px] leading-snug">{p.reasons[0]}</p>
      <button onClick={onMessage} className="press mt-3 h-10 border-2 border-ink bg-ink text-[15px] font-semibold text-paper">
        Say hi
      </button>
    </motion.div>
  );
}

// The "find me" note leads; distance is a soft hint; stale people fade.
function PersonRow({ p, i, isMatch, onClick }: { p: NearbyPerson; i: number; isMatch: boolean; onClick: () => void }) {
  const stale = p.seenAgo >= STALE_S;
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: stale ? 0.55 : 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
      <button onClick={onClick} className="press pop-sm flex w-full items-center gap-3.5 border-2 border-ink bg-card p-3 text-left">
        <Avatar name={p.name} photo={p.photo} seed={p.id} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-semibold">{p.name}</span>
            {isMatch && <IconSpark width={13} height={13} className="shrink-0 text-amber" />}
          </div>
          {(p.title || p.company) && <div className="truncate text-[14px] text-muted">{[p.title, p.company].filter(Boolean).join(" · ")}</div>}
          {p.findMe && (
            <div className="mt-1 flex items-center gap-1 text-[15px] font-medium">
              <IconPin width={15} height={15} className="shrink-0 text-flame" />
              <span className="truncate">{p.findMe}</span>
            </div>
          )}
          <div className="mt-1 text-[12px] text-muted">
            {where(p)}
            {stale && ` · ${freshness(p.seenAgo)}`}
          </div>
        </div>
        <IconChevron width={18} height={18} className="shrink-0 text-ink/30" />
      </button>
    </motion.li>
  );
}

function StrengthCard({ doneCount, next, onClick }: { doneCount: number; next: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press pop mx-5 mb-6 block w-[calc(100%-2.5rem)] border-2 border-ink bg-amber p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-[21px] leading-none">
          <IconSpark width={16} height={16} /> Get better intros
        </span>
        <span className="text-[13px] font-medium">
          {doneCount}/{STEPS.length}
        </span>
      </div>
      <div className="mt-3 flex gap-1">
        {STEPS.map((_, n) => (
          <span key={n} className={`h-1.5 flex-1 ${n < doneCount ? "bg-ink" : "bg-ink/20"}`} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[15px]">
        {next} <IconChevron width={18} height={18} />
      </div>
    </button>
  );
}

function LocationAsk({ geo, onStart }: { geo: string; onStart: () => void }) {
  if (geo === "denied") {
    return (
      <Empty
        title="Location is off"
        body="Connect needs your location to find people around you. Turn it on in Settings → Safari (or your browser) → Location, then reopen the app."
      />
    );
  }
  if (geo === "unavailable") return <Empty title="No location on this device" body="Try opening Connect on your phone." />;
  return (
    <Empty
      title="Turn on location"
      body="We use it only while the app is open, to show who's close. Your exact spot is never shown to anyone."
      action={
        <button
          onClick={onStart}
          disabled={geo === "asking"}
          className="press pop h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper disabled:opacity-60"
        >
          {geo === "asking" ? "Finding you…" : "Turn on location"}
        </button>
      }
    />
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="px-6 pt-8 text-center">
      <h2 className="font-display text-[26px] leading-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-[320px] text-[16px] leading-snug text-muted">{body}</p>
      {action && <div className="mx-auto mt-6 max-w-[340px]">{action}</div>}
    </div>
  );
}

function Banner({ children, icon, tone, onClick }: { children: ReactNode; icon: ReactNode; tone: "amber" | "ink"; onClick?: () => void }) {
  const cls = tone === "amber" ? "bg-amber text-ink" : "bg-ink text-paper";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`mx-5 mb-4 flex w-[calc(100%-2.5rem)] items-center gap-3 border-2 border-ink px-4 py-3 text-left text-[15px] font-medium ${cls}`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {onClick && <IconChevron width={18} height={18} />}
    </button>
  );
}

function Skeletons() {
  return (
    <ul className="grid gap-3 px-5 pt-2">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="relative flex items-center gap-3.5 overflow-hidden border-2 border-ink/15 bg-card p-3">
          <div className="size-14 bg-paper-deep" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 bg-paper-deep" />
            <div className="h-3.5 w-3/5 bg-paper-deep" />
          </div>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent [animation:shimmer_1.4s_infinite]" />
        </li>
      ))}
    </ul>
  );
}

function ShareApp() {
  return (
    <button
      onClick={async () => {
        const data = { title: `${EVENT.name} ${EVENT.app}`, text: EVENT.shareText, url: location.origin };
        try {
          if (navigator.share) await navigator.share(data);
          else await navigator.clipboard.writeText(data.url);
        } catch {
          // cancelled
        }
      }}
      className="press pop flex h-14 w-full items-center justify-center gap-2 border-2 border-ink bg-ink text-[17px] font-semibold text-paper"
    >
      <IconShare width={20} height={20} /> Share Connect
    </button>
  );
}
