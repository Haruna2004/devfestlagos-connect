import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { EVENT } from "../../shared/event";
import type { Band, MyProfile, NearbyPerson } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { Radar } from "../components/Radar";
import { ago, km } from "../components/format";
import { IconChevron, IconEyeOff, IconPin, IconShare, IconSpark } from "../components/icons";
import type { useNearby } from "../lib/useNearby";
import { missing, NEXT_LABEL, STEPS } from "../lib/strength";

const SECTIONS: { band: Band; title: string; hint: string }[] = [
  { band: "close", title: "Right around you", hint: "within ~30m" },
  { band: "near", title: "Nearby", hint: "within ~100m" },
  { band: "venue", title: "Around the venue", hint: "further out" },
];


export function Nearby({
  me,
  nearby,
  onPick,
  onMessage,
  onBoost,
}: {
  me: MyProfile;
  nearby: ReturnType<typeof useNearby>;
  onPick: (p: NearbyPerson) => void;
  onMessage: (p: NearbyPerson) => void;
  onBoost: () => void;
}) {
  const { geo, start, result, accuracy, error } = nearby;
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [q, setQ] = useState("");

  const people = result?.people ?? [];
  const introIds = useMemo(() => new Set(result?.intros ?? []), [result]);
  const intros = (result?.intros ?? []).map((id) => people.find((p) => p.id === id)!).filter(Boolean);

  // Search across name, role, company, tags and skills, e.g. "flutter" or "recruiter".
  const query = q.trim().toLowerCase();
  const list = people.filter(
    (p) =>
      (!onlyMatches || p.match > 0) &&
      (!query || [p.name, p.title, p.company, ...p.tags, ...p.skills].some((f) => f.toLowerCase().includes(query))),
  );

  const ready = geo === "on" && result?.atVenue;
  const todo = missing(me);

  return (
    <div className="min-h-full pb-28">
      <header className="bg-ink pt-safe text-paper">
        <TopBar
          right={
            geo === "on" &&
            accuracy != null && <span className="border border-paper/30 px-2 py-0.5 text-[12px] text-paper/80">GPS ±{accuracy}m</span>
          }
        />
        <h1 className="px-5 pt-3 pb-5 font-display text-[34px] leading-[1.02]">
          {!ready ? (
            "Who's around?"
          ) : people.length === 0 ? (
            "Just you so far"
          ) : (
            <>
              <span className="text-amber">{people.length}</span> {people.length === 1 ? "person" : "people"} around you
            </>
          )}
        </h1>
        <Radar people={ready ? list : []} intros={introIds} onPick={onPick} />
      </header>

      <div className="border-t-2 border-ink pt-5">
        {!me.visible && (
          <Banner tone="ink" icon={<IconEyeOff width={20} height={20} />}>
            You're hidden. Others can't see you. Turn it off in Me.
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

            {intros.length > 0 && (
              <section className="mb-6">
                <h2 className="flex items-center gap-2 px-5 pb-3 font-display text-[24px] leading-none">
                  <IconSpark width={18} height={18} className="text-amber" /> You should meet
                </h2>
                <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
                  {intros.map((p) => (
                    <IntroCard key={p.id} p={p} onOpen={() => onPick(p)} onMessage={() => onMessage(p)} />
                  ))}
                </div>
              </section>
            )}

            {people.length > 3 && (
              <div className="flex gap-2 px-5">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search skills, roles, names"
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
            {list.length === 0 && people.length > 0 && <p className="px-5 pt-6 text-center text-[15px] text-muted">No one matches that right now.</p>}

            {people.length === 0 ? (
              <Empty
                title="No one else yet"
                body={`Share Connect with the people you meet at ${EVENT.name}. The more who join, the better the intros.`}
                action={<ShareApp />}
              />
            ) : (
              SECTIONS.map(({ band, title, hint }) => {
                const group = list.filter((p) => p.band === band);
                if (!group.length) return null;
                return (
                  <section key={band} className="mt-6">
                    <div className="flex items-baseline justify-between px-5 pb-2">
                      <h2 className="font-display text-[22px] leading-none">{title}</h2>
                      <span className="text-[13px] text-muted">{hint}</span>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 px-5">
                      {group.map((p, i) => (
                        <PersonRow key={p.id} p={p} i={i} isMatch={introIds.has(p.id)} onClick={() => onPick(p)} />
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
            {error && <p className="mt-4 text-center text-[13px] text-muted">Offline? Retrying…</p>}
            <p className="mx-auto mt-8 max-w-[300px] px-5 text-center text-[13px] text-muted">
              Distances are rough. GPS indoors can be off by 20m+. Use "find me" notes, photos and messages to find each other.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function IntroCard({ p, onOpen, onMessage }: { p: NearbyPerson; onOpen: () => void; onMessage: () => void }) {
  return (
    <div className="pop flex w-[280px] shrink-0 snap-start flex-col border-2 border-ink bg-amber p-4">
      <button onClick={onOpen} className="flex items-center gap-3 text-left">
        <Avatar name={p.name} photo={p.photo} seed={p.id} size={52} />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold">{p.name}</div>
          <div className="truncate text-[14px]">
            ~{km(p.distance)} · {[p.title, p.company].filter(Boolean).join(" · ") || p.tags[0] || ""}
          </div>
        </div>
      </button>
      <p className="mt-3 flex-1 text-[15px] leading-snug">{p.reasons[0]}</p>
      <button onClick={onMessage} className="press mt-3 h-10 border-2 border-ink bg-ink text-[15px] font-semibold text-paper">
        Say hi
      </button>
    </div>
  );
}

function PersonRow({ p, i, isMatch, onClick }: { p: NearbyPerson; i: number; isMatch: boolean; onClick: () => void }) {
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
      <button onClick={onClick} className="press pop-sm flex w-full items-center gap-3.5 border-2 border-ink bg-card p-3 text-left">
        <Avatar name={p.name} photo={p.photo} seed={p.id} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[17px] font-semibold">{p.name}</span>
            {isMatch && <IconSpark width={13} height={13} className="shrink-0 text-amber" />}
            <span className="ml-auto shrink-0 text-[13px] font-medium text-flame">~{km(p.distance)}</span>
          </div>
          {(p.title || p.company) && (
            <div className="truncate text-[15px] text-muted">{[p.title, p.company].filter(Boolean).join(" · ")}</div>
          )}
          {p.findMe && (
            <div className="mt-1 flex items-center gap-1 truncate text-[14px]">
              <IconPin width={14} height={14} className="shrink-0 text-flame" />
              <span className="truncate">{p.findMe}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 self-stretch">
          <IconChevron width={18} height={18} className="my-auto text-ink/30" />
          {p.seenAgo >= 60 && <span className="text-[11px] text-muted">{ago(p.seenAgo)}</span>}
        </div>
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
