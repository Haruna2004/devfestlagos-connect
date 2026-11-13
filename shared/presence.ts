// How we turn raw GPS into something people can trust.
// Indoor GPS is often 20–50m off, so we:
//   1. smooth each person's position over their last few fixes,
//   2. pick a plain-words band using both phones' accuracy (not just distance),
//   3. only switch bands when someone is clearly past the line (hysteresis),
//   4. show a range ("about 20–50m"), never a fake-precise number.

import type { Band } from "./types";

export type Fix = { lat: number; lng: number; acc: number; at: number };

export const BAND_ORDER: Band[] = ["steps", "near", "walk", "venue"];
const LIMIT: Record<Exclude<Band, "venue">, number> = { steps: 20, near: 60, walk: 150 };
const STEPS_MAX_UNCERTAINTY = 30; // GPS too rough? Don't promise "a few steps".
const MARGIN = 8; // metres past a line before we move someone to another band
const WALK_M_PER_MIN = 80;

export function metres(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Weighted average of recent fixes; better fixes count more.
export function smooth(fixes: Fix[]): Fix {
  let w = 0,
    lat = 0,
    lng = 0,
    acc = 0;
  for (const f of fixes) {
    const k = 1 / Math.max(f.acc, 5);
    w += k;
    lat += f.lat * k;
    lng += f.lng * k;
    acc += f.acc * k;
  }
  const last = fixes[fixes.length - 1];
  return { lat: lat / w, lng: lng / w, acc: acc / w, at: last.at };
}

function rawBand(d: number, uncertainty: number): Band {
  if (d <= LIMIT.steps && uncertainty <= STEPS_MAX_UNCERTAINTY) return "steps";
  if (d <= LIMIT.near) return "near";
  if (d <= LIMIT.walk) return "walk";
  return "venue";
}

// Keep the previous band unless the new distance is clearly past the line.
export function band(d: number, uncertainty: number, prev?: Band): Band {
  const next = rawBand(d, uncertainty);
  if (!prev || prev === next) return next;
  const p = BAND_ORDER.indexOf(prev);
  const n = BAND_ORDER.indexOf(next);
  if (n > p && prev !== "venue") {
    // moving away: must be beyond the old band's limit by a margin
    return d > LIMIT[prev as Exclude<Band, "venue">] + MARGIN ? next : prev;
  }
  if (n < p && next !== "venue") {
    // coming closer: must be inside the new band's limit by a margin
    return d < LIMIT[next as Exclude<Band, "venue">] - MARGIN ? next : prev;
  }
  return next;
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

// What two people should see about each other.
export function describe(d: number, accA: number, accB: number, prev?: Band) {
  const uncertainty = Math.min((accA + accB) / 2, 100);
  const b = band(d, uncertainty, prev);
  return {
    band: b,
    distance: round5(d),
    range: [round5(Math.max(0, d - uncertainty)), round5(d + uncertainty)] as [number, number],
    walkMin: Math.max(1, Math.round(d / WALK_M_PER_MIN)),
  };
}
