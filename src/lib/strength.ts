import type { MyProfile } from "../../shared/types";

// The short steps that make intros better, in the order we ask for them.
export type Step = "skills" | "goals" | "findMe" | "about";

export const STEPS: Step[] = ["skills", "goals", "findMe", "about"];

export function done(me: MyProfile, step: Step) {
  switch (step) {
    case "skills":
      return me.skills.length > 0;
    case "goals":
      return me.lookingFor.length > 0;
    case "findMe":
      return !!me.findMe;
    case "about":
      return !!(me.title || me.company || me.bio);
  }
}

export const missing = (me: MyProfile) => STEPS.filter((s) => !done(me, s));

export const NEXT_LABEL: Record<Step, string> = {
  skills: "Add what you work with",
  goals: "Add what you're looking for",
  findMe: "Add where people can find you",
  about: "Add your role and a line about you",
};

// The follow-up question for "skills you're looking for", based on goals.
export function wantsLabel(lookingFor: string[]) {
  if (lookingFor.includes("Hiring")) return "Hiring for which skills?";
  if (lookingFor.includes("Mentors")) return "Mentors in what?";
  if (lookingFor.includes("Cofounder")) return "A cofounder who knows…";
  if (lookingFor.includes("Collaborators") || lookingFor.includes("Open source")) return "Collaborators who know…";
  if (lookingFor.includes("A job")) return "Jobs using which skills?";
  return "Skills you're looking for in others";
}
