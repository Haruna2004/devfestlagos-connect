import type { Band, NearbyPerson } from "../../shared/types";

// Plain words instead of fake-precise metres. GPS indoors is rough.
export function where(p: Pick<NearbyPerson, "band" | "walkMin">) {
  switch (p.band) {
    case "steps":
      return "A few steps away";
    case "near":
      return "Nearby";
    case "walk":
      return `Short walk · ~${p.walkMin} min`;
    case "venue":
      return "Elsewhere at the venue";
  }
}

export const BAND_TITLE: Record<Band, string> = {
  steps: "A few steps away",
  near: "Nearby",
  walk: "Short walk",
  venue: "Elsewhere at the venue",
};

// Honest range for the profile sheet, e.g. "about 20–50m away".
export function range(p: Pick<NearbyPerson, "range">) {
  const [lo, hi] = p.range;
  if (hi >= 1000) return `about ${km(lo)}–${km(hi)} away`;
  return lo <= 5 ? `within about ${hi}m` : `about ${lo}–${hi}m away`;
}

// How fresh someone's position is. Stale positions are wrong positions.
export const STALE_S = 120;
export function freshness(seenAgo: number) {
  if (seenAgo < 60) return "here now";
  return `seen ${Math.round(seenAgo / 60)} min ago`;
}

export function gpsQuality(accuracy: number) {
  if (accuracy <= 20) return { label: "Good", tone: "good" as const };
  if (accuracy <= 50) return { label: "Rough", tone: "rough" as const };
  return { label: "Weak", tone: "weak" as const };
}

export function ago(s: number) {
  if (s < 60) return "now";
  return `${Math.round(s / 60)}m ago`;
}

export function km(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}
