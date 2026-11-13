// Matching: who should meet whom, and why.
// Pure functions, no I/O, so they're easy to test and tweak.
//
// Combines three things on both sides:
//   tags        what you are         (Engineer, Recruiter…)
//   lookingFor  what you want        (A job, Mentors, Cofounder…)  ← the verb
//   skills      what you work with   (Go, Flutter, Fundraising…)   ← the noun
//   wantsSkills skills you're after in others
// e.g. you want Mentors + PyTorch, they know PyTorch and want Mentees
//   → "Ada works with PyTorch and wants to mentor."

import type { Band } from "./types";

export type Side = { name: string; tags: string[]; lookingFor: string[]; skills: string[]; wantsSkills: string[] };

// How special a skill is in the room right now. Rare skills count more.
export type Rarity = (skill: string) => number;

export const INTRO_MIN = 4; // score needed to show as an intro

const has = (list: string[], v: string) => list.includes(v);
const hiring = (s: Side) => has(s.lookingFor, "Hiring") || has(s.tags, "Recruiter");
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const lower = (l: string[]) => new Set(l.map((x) => x.toLowerCase()));

// Skills in `a` that also appear in `b`, rarest first.
function overlap(a: string[], b: string[], rarity: Rarity) {
  const set = lower(b);
  return a.filter((s) => set.has(s.toLowerCase())).sort((x, y) => rarity(y) - rarity(x));
}

function list(skills: string[]) {
  const s = skills.slice(0, 2);
  return s.length === 2 ? `${s[0]} and ${s[1]}` : s[0];
}

export function match(me: Side, them: Side, band: Band, rarity: Rarity = () => 1) {
  const n = first(them.name);
  const hits: { score: number; say: string }[] = [];
  const add = (score: number, say: string) => hits.push({ score, say });
  const weight = (skills: string[]) => skills.slice(0, 3).reduce((t, s) => t + rarity(s), 0);

  // Skills they have that I'm after, and skills I have that they're after.
  const iWantTheyHave = overlap(me.wantsSkills, them.skills, rarity);
  const theyWantIHave = overlap(them.wantsSkills, me.skills, rarity);
  const shared = overlap(me.skills, them.skills, rarity);

  // Jobs
  if (hiring(them) && has(me.lookingFor, "A job")) {
    if (theyWantIHave.length) add(6 + weight(theyWantIHave), `${n} is hiring for ${list(theyWantIHave)}, and you know ${theyWantIHave.length > 1 ? "both" : "it"}.`);
    else add(5, `${n} is hiring, and you're looking for a job.`);
  }
  if (hiring(me) && has(them.lookingFor, "A job")) {
    if (iWantTheyHave.length) add(6 + weight(iWantTheyHave), `${n} knows ${list(iWantTheyHave)} and is looking for a job.`);
    else add(5, `${n} is looking for a job, and you're hiring.`);
  }

  // Mentoring
  if (has(me.lookingFor, "Mentors") && has(them.lookingFor, "Mentees")) {
    if (iWantTheyHave.length) add(6 + weight(iWantTheyHave), `${n} works with ${list(iWantTheyHave)} and wants to mentor.`);
    else add(5, `${n} wants to mentor, and you're looking for a mentor.`);
  }
  if (has(me.lookingFor, "Mentees") && has(them.lookingFor, "Mentors")) {
    if (theyWantIHave.length) add(6 + weight(theyWantIHave), `${n} wants a mentor in ${list(theyWantIHave)}. That's you.`);
    else add(5, `${n} is looking for a mentor, and you want to mentor.`);
  }

  // Cofounders
  if (has(me.lookingFor, "Cofounder") && (has(them.lookingFor, "Cofounder") || has(them.tags, "Founder"))) {
    if (iWantTheyHave.length) add(5 + weight(iWantTheyHave), `${n} knows ${list(iWantTheyHave)} and is open to cofounding.`);
    else if (has(them.lookingFor, "Cofounder")) add(4, `You're both looking for a cofounder.`);
    else add(3, `${n} is a founder, and you're looking for a cofounder.`);
  }

  // Building together
  const builder = (s: Side) => has(s.lookingFor, "Collaborators") || has(s.lookingFor, "Open source");
  if (builder(me) && builder(them)) {
    if (shared.length) add(3 + weight(shared), `You both build with ${list(shared)} and want collaborators.`);
    else add(3, `You're both looking for people to build with.`);
  }

  // Plain skill needs, when no goal above already used them
  const said = hits.map((h) => h.say).join(" ");
  if (iWantTheyHave.length && !said.includes(iWantTheyHave[0])) {
    add(2 * weight(iWantTheyHave), `${n} works with ${list(iWantTheyHave)}, which you're looking for.`);
  }
  if (theyWantIHave.length && !said.includes(theyWantIHave[0])) {
    add(2 * weight(theyWantIHave), `${n} is looking for someone who knows ${list(theyWantIHave)}. That's you.`);
  }

  // Lighter signals
  if (has(them.tags, "Speaker")) add(2, `${n} is speaking at DevFest. Catch them after the talk.`);
  if (shared.length && !hits.some((h) => h.say.includes(shared[0]))) add(weight(shared.slice(0, 1)), `You both work with ${shared[0]}.`);
  if (has(me.lookingFor, "New friends") && has(them.lookingFor, "New friends")) add(1, `You're both here to make friends.`);

  hits.sort((a, b) => b.score - a.score);
  let score = hits.reduce((t, h) => t + h.score, 0);
  // Only boost by distance when there's already a reason to meet.
  if (score > 0) score += band === "steps" ? 2 : band === "near" ? 1 : 0;
  return { score: Math.round(score * 10) / 10, reasons: hits.slice(0, 2).map((h) => h.say) };
}

// Rarity from how many people present list a skill: 1 (everyone has it) to 3 (only one other person).
export function rarityFrom(people: { skills: string[] }[]): Rarity {
  const counts = new Map<string, number>();
  for (const p of people) for (const s of p.skills) counts.set(s.toLowerCase(), (counts.get(s.toLowerCase()) ?? 0) + 1);
  const total = Math.max(people.length, 1);
  return (skill) => {
    const c = counts.get(skill.toLowerCase()) ?? 1;
    return Math.min(3, Math.max(1, 1 + Math.log2(total / c) / 2));
  };
}
