// Everything event-specific lives here (plus venue coordinates in wrangler.jsonc).
// To reuse Connect for another event, change this file and the vars in wrangler.jsonc.

export const EVENT = {
  name: "DevFest Lagos",
  app: "Connect",
  venue: "Landmark Event Centre",
  tagline: "One community, endless opportunities.",
  shareText: "See who's around you at DevFest Lagos",
} as const;

// Shown as "I am" chips. Max 3 per person.
export const ROLE_TAGS = [
  "Engineer",
  "Designer",
  "Product",
  "Data / AI",
  "Cloud / DevOps",
  "Mobile",
  "Student",
  "Founder",
  "Recruiter",
  "DevRel",
  "Speaker",
  "Volunteer",
] as const;

// Shown as "Looking for" chips. Max 4 per person.
export const LOOKING_FOR = [
  "A job",
  "Hiring",
  "Mentors",
  "Mentees",
  "Collaborators",
  "Cofounder",
  "Open source",
  "New friends",
] as const;
