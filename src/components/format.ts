import type { Band } from "../../shared/types";

export const bandLabel = (b: Band) => ({ close: "Right here", near: "Nearby", venue: "At the venue" })[b];

export function ago(s: number) {
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  return `${m}m ago`;
}

export function km(m: number) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}
