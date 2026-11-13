// Matching: who should meet whom, and why.
// Pure functions, no I/O, so they're easy to test and tweak.
// Each rule looks at "what you are" (tags) and "what you're looking for" on both sides.

import type { Band } from "./types";

export type Side = { name: string; tags: string[]; lookingFor: string[] };

type Rule = {
  score: number;
  test: (me: Side, them: Side) => boolean;
  say: (them: Side) => string;
};

const has = (list: string[], v: string) => list.includes(v);
const hiring = (s: Side) => has(s.lookingFor, "Hiring") || has(s.tags, "Recruiter");
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

// Order matters: stronger, more specific reasons first.
const RULES: Rule[] = [
  {
    score: 5,
    test: (me, t) => hiring(t) && has(me.lookingFor, "A job"),
    say: (t) => `${first(t.name)} is hiring, and you're looking for a job.`,
  },
  {
    score: 5,
    test: (me, t) => hiring(me) && has(t.lookingFor, "A job"),
    say: (t) => `${first(t.name)} is looking for a job, and you're hiring.`,
  },
  {
    score: 5,
    test: (me, t) => has(me.lookingFor, "Mentors") && has(t.lookingFor, "Mentees"),
    say: (t) => `${first(t.name)} wants to mentor, and you're looking for a mentor.`,
  },
  {
    score: 5,
    test: (me, t) => has(me.lookingFor, "Mentees") && has(t.lookingFor, "Mentors"),
    say: (t) => `${first(t.name)} is looking for a mentor, and you want to mentor.`,
  },
  {
    score: 4,
    test: (me, t) => has(me.lookingFor, "Cofounder") && has(t.lookingFor, "Cofounder"),
    say: () => `You're both looking for a cofounder.`,
  },
  {
    score: 3,
    test: (me, t) => has(me.lookingFor, "Cofounder") && has(t.tags, "Founder"),
    say: (t) => `${first(t.name)} is a founder, and you're looking for a cofounder.`,
  },
  {
    score: 3,
    test: (me, t) => has(me.lookingFor, "Collaborators") && has(t.lookingFor, "Collaborators"),
    say: () => `You're both looking for people to build with.`,
  },
  {
    score: 3,
    test: (me, t) => has(me.lookingFor, "Open source") && has(t.lookingFor, "Open source"),
    say: () => `You're both into open source.`,
  },
  {
    score: 2,
    test: (_me, t) => has(t.tags, "Speaker"),
    say: (t) => `${first(t.name)} is speaking at DevFest. Catch them after the talk.`,
  },
  {
    score: 1,
    test: (me, t) => has(me.lookingFor, "New friends") && has(t.lookingFor, "New friends"),
    say: () => `You're both here to make friends.`,
  },
];

// Score one pair from "me"'s point of view. Returns up to 2 reasons.
export function match(me: Side, them: Side, band: Band): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const r of RULES) {
    if (!r.test(me, them)) continue;
    score += r.score;
    if (reasons.length < 2) reasons.push(r.say(them));
  }
  const shared = me.tags.filter((t) => them.tags.includes(t) && t !== "Volunteer" && t !== "Speaker");
  if (shared.length) {
    score += 1;
    if (reasons.length < 2) reasons.push(`Same world as you: ${shared[0]}.`);
  }
  // Only boost by distance when there's already a reason to meet.
  if (score > 0) score += band === "close" ? 2 : band === "near" ? 1 : 0;
  return { score, reasons };
}

// A match strong enough to show as an intro.
export const INTRO_MIN = 4;
