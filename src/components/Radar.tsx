import { motion } from "motion/react";
import type { NearbyPerson } from "../../shared/types";
import { Avatar } from "./Avatar";

// Amber half-disc at the bottom of the header. You sit at the centre.
// People sit on rings: inner = right here, middle = nearby, outer = venue.
// Matches get an amber outline so they stand out.
const RING = { close: 0.36, near: 0.62, venue: 0.86 };
const CAP = { close: 3, near: 5, venue: 6 }; // faces that fit per ring

function angles(people: NearbyPerson[]) {
  const out = new Map<string, number>();
  (["close", "near", "venue"] as const).forEach((band, ring) => {
    const group = people.filter((p) => p.band === band);
    const step = 150 / (group.length + 1);
    group.forEach((p, i) => out.set(p.id, 195 + step * (i + 1) + (ring % 2 ? step / 3 : 0)));
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
  const shown = (["close", "near", "venue"] as const).flatMap((b) =>
    people
      .filter((p) => p.band === b)
      .sort((x, y) => Number(intros.has(y.id)) - Number(intros.has(x.id)))
      .slice(0, CAP[b]),
  );
  const angle = angles(shown);

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[460px] overflow-hidden">
      <div className="absolute inset-x-0 top-0 aspect-square rounded-full bg-amber" />
      {[RING.close, RING.near, RING.venue].map((r) => (
        <div
          key={r}
          className="absolute left-1/2 top-full aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-ink/40"
          style={{ width: `${r * 100}%` }}
        />
      ))}

      {/* you */}
      <div className="absolute left-1/2 top-full">
        <span className="absolute size-16 rounded-full bg-ink/25 [animation:pulse-ring_2.4s_ease-out_infinite]" />
        <span className="absolute size-16 rounded-full bg-ink/25 [animation:pulse-ring_2.4s_1.2s_ease-out_infinite]" />
        <span className="absolute size-4 -translate-x-1/2 -translate-y-full bg-ink" />
      </div>

      {shown.map((p, i) => {
        const a = (angle.get(p.id)! * Math.PI) / 180;
        const r = RING[p.band];
        const left = 50 + Math.cos(a) * r * 50;
        const top = 100 + Math.sin(a) * r * 100;
        const isIntro = intros.has(p.id);
        return (
          <motion.button
            key={p.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 26, delay: i * 0.04 }}
            onClick={() => onPick(p)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
            aria-label={p.name}
          >
            <Avatar
              name={p.name}
              photo={p.photo}
              seed={p.id}
              size={p.band === "close" ? 40 : 34}
              className={isIntro ? "pop-sm outline-2 outline-offset-2 outline-paper" : "pop-sm"}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
