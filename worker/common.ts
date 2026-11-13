import type { MyProfile, Profile } from "../shared/types";
import type { EventRoom } from "./room";

export type Env = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ROOM: DurableObjectNamespace<EventRoom>;
  VENUE_LAT: string;
  VENUE_LNG: string;
  VENUE_RADIUS_M: string;
};

export type Row = {
  id: string;
  secret_hash: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  find_me: string;
  tags: string;
  looking_for: string;
  skills: string;
  wants_skills: string;
  links: string;
  photo: string | null;
  visible: number;
};

export const now = () => Date.now();

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function parse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function toProfile(r: Row): Profile {
  return {
    id: r.id,
    name: r.name,
    title: r.title,
    company: r.company,
    bio: r.bio,
    findMe: r.find_me,
    tags: parse(r.tags, []),
    lookingFor: parse(r.looking_for, []),
    skills: parse(r.skills, []),
    wantsSkills: parse(r.wants_skills, []),
    links: parse(r.links, {}),
    photo: r.photo ? `/photos/${r.photo}` : null,
  };
}

export const toMine = (r: Row): MyProfile => ({ ...toProfile(r), visible: r.visible === 1 });

// The single live room for this event. Placed near Africa.
export const room = (env: Env) => env.ROOM.get(env.ROOM.idFromName("event"), { locationHint: "afr" });
