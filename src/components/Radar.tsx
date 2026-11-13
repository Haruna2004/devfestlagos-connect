import { motion } from "motion/react";
import type { NearbyPerson } from "../../shared/types";
import { Avatar } from "./Avatar";

// Amber half-disc at the bottom of the header. You sit at the centre.
// Rings, inside out: a few steps, nearby, short walk. People further out aren't drawn.
// Matches get an outline so they stand out.
type Ring = "steps" | "near" | "walk";
const RINGS: { band: Ring; r: number; label: string }[] = [
  { band: "steps", r: 0.34, label: "steps" },
  { band: "near", r: 0.6, label: "nearby" },
  { band: "walk", r: 0.86, label: "walk" },
];
const CAP: Record<Ring, number> = { steps: 3, near: 5, walk: 6 }; // faces that fit per ring

function angles(people: NearbyPerson[]) {
  const out = new Map<string, number>();
  RINGS.forEach(({ band }, ring) => {
    const group = people.filter((p) => p.band === band);
    const step = 140 / (group.length + 1);
    group.forEach((p, i) => out.set(p.id, 200 + step * (i + 1) + (ring % 2 ? step / 3 : 0)));
  });
  return out;
}

export function Radar({
  people,
  intros,
  onPick,
}: {
  people: NearbyPerson[];
  intros: Set<string>;
  onPick: (p: NearbyPerson) => void;
}) {
  // Matches first within each ring, then nearest.
  const shown = RINGS.flatMap(({ band }) =>
    people
      .filter((p) => p.band === band)
      .sort((x, y) => Number(intros.has(y.id)) - Number(intros.has(x.id)))
      .slice(0, CAP[band]),
  );
  const angle = angles(shown);

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[460px] overflow-hidden">
      <div className="absolute inset-x-0 top-0 aspect-square rounded-full bg-amber" />
      {RINGS.map(({ r, label }) => (
        <div key={r}>
          <div
            className="absolute left-1/2 top-full aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-ink/40"
            style={{ width: `${r * 100}%` }}
          />
          {/* label sits just inside each ring, on the baseline at the left */}
          <span
            className="absolute bottom-1 text-[10px] font-semibold tracking-wide text-ink/55 uppercase"
            style={{ left: `calc(${50 - r * 50}% + 6px)` }}
          >
            {label}
          </span>
        </div>
      ))}

      {/* you */}
      <div className="absolute left-1/2 top-full">
        <span className="absolute size-16 rounded-full bg-ink/25 [animation:pulse-ring_2.4s_ease-out_infinite]" />
        <span className="absolute size-16 rounded-full bg-ink/25 [animation:pulse-ring_2.4s_1.2s_ease-out_infinite]" />
        <span className="absolute size-4 -translate-x-1/2 -translate-y-full bg-ink" />
      </div>

      {shown.map((p, i) => {
        const a = (angle.get(p.id)! * Math.PI) / 180;
        const r = RINGS.find((x) => x.band === p.band)!.r;
        const left = 50 + Math.cos(a) * r * 50;
        const top = 100 + Math.sin(a) * r * 100;
        const isIntro = intros.has(p.id);
        const stale = p.seenAgo >= 120;
        return (
          <motion.button
            key={p.id}
            initial={{ scale: 0, opacity: 0, left: `${left}%`, top: `${top}%` }}
            animate={{ scale: 1, opacity: stale ? 0.45 : 1, left: `${left}%`, top: `${top}%` }}
            transition={{ type: "spring", stiffness: 380, damping: 26, delay: i * 0.03 }}
            onClick={() => onPick(p)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            aria-label={p.name}
          >
            <Avatar
              name={p.name}
              photo={p.photo}
              seed={p.id}
              size={p.band === "steps" ? 40 : 34}
              className={isIntro ? "pop-sm outline-2 outline-offset-2 outline-paper" : "pop-sm"}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
