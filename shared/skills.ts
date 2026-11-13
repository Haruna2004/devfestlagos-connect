// Skill catalog. People can also type their own; these just make picking fast.

export const SKILL_GROUPS: Record<string, string[]> = {
  Languages: ["JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift", "Dart", "C#", "C++", "PHP", "Ruby", "Elixir", "Scala", "SQL"],
  Mobile: ["Flutter", "React Native", "Android", "iOS", "Jetpack Compose", "SwiftUI", "Expo"],
  Web: ["React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind", "Node.js", "Web Performance", "Accessibility", "PWA"],
  Backend: ["Django", "FastAPI", "Spring Boot", "Laravel", "Rails", ".NET", "NestJS", "GraphQL", "REST APIs", "Microservices", "PostgreSQL", "MongoDB", "Redis", "Kafka"],
  "Cloud & DevOps": ["Google Cloud", "Firebase", "AWS", "Azure", "Cloudflare", "Kubernetes", "Docker", "Terraform", "CI/CD", "Linux", "SRE", "Serverless"],
  "Data & AI": ["Machine Learning", "PyTorch", "TensorFlow", "Gemini API", "LLMs", "RAG", "Computer Vision", "NLP", "Data Engineering", "Data Analysis", "BigQuery", "Spark", "dbt", "MLOps"],
  Security: ["Cybersecurity", "AppSec", "Pentesting", "Cloud Security", "IAM"],
  "Web3 & Fintech": ["Blockchain", "Solidity", "Payments", "Open Banking", "Compliance"],
  Design: ["Product Design", "UI Design", "UX Research", "Figma", "Motion Design", "Design Systems", "Brand Design", "Illustration"],
  Product: ["Product Management", "Product Strategy", "Growth", "Analytics", "A/B Testing", "Technical Writing", "Agile", "QA / Testing"],
  Business: ["Fundraising", "Sales", "Marketing", "Partnerships", "Community", "DevRel", "Public Speaking", "Content Creation", "Hiring", "Leadership", "Project Management", "Legal", "Finance", "Operations"],
};

export const ALL_SKILLS = Object.values(SKILL_GROUPS).flat();

// One-tap suggestions based on the "I am" tags someone picked.
export const SUGGEST_BY_TAG: Record<string, string[]> = {
  Engineer: ["TypeScript", "Python", "Go", "React", "Node.js", "Docker", "PostgreSQL", "Java"],
  Mobile: ["Flutter", "Dart", "Kotlin", "Swift", "React Native", "Jetpack Compose", "Firebase"],
  "Cloud / DevOps": ["Kubernetes", "Docker", "Terraform", "Google Cloud", "AWS", "CI/CD", "Linux", "Go"],
  "Data / AI": ["Python", "PyTorch", "Machine Learning", "LLMs", "Gemini API", "Data Engineering", "SQL", "BigQuery"],
  Designer: ["Figma", "Product Design", "UI Design", "UX Research", "Design Systems", "Motion Design"],
  Product: ["Product Management", "Product Strategy", "Growth", "Analytics", "UX Research", "Agile"],
  Student: ["Python", "JavaScript", "Flutter", "React", "Machine Learning", "UI Design"],
  Founder: ["Fundraising", "Product Strategy", "Sales", "Hiring", "Leadership", "Growth"],
  Recruiter: ["Hiring", "Partnerships", "Community", "Operations"],
  DevRel: ["DevRel", "Public Speaking", "Content Creation", "Community", "Technical Writing"],
  Speaker: ["Public Speaking", "Content Creation", "Leadership"],
  Volunteer: ["Community", "Operations", "Project Management", "Public Speaking"],
};

export const SKILL_LIMITS = { have: 8, want: 5, length: 32 };

const byLower = new Map(ALL_SKILLS.map((s) => [s.toLowerCase(), s]));

// Clean a skill: use the catalog spelling if it matches, else a tidy custom one.
export function normalizeSkill(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim().slice(0, SKILL_LIMITS.length);
  if (!s) return null;
  const known = byLower.get(s.toLowerCase());
  if (known) return known;
  if (!/^[\p{L}\p{N} .+#/&()-]+$/u.test(s)) return null;
  return s;
}

export function cleanSkills(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const s = normalizeSkill(raw);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function suggestFor(tags: string[], exclude: string[]): string[] {
  const picked = new Set(exclude.map((e) => e.toLowerCase()));
  const pool = tags.flatMap((t) => SUGGEST_BY_TAG[t] ?? []);
  const fallback = ["Python", "JavaScript", "Flutter", "Product Design", "Machine Learning", "Kubernetes", "Fundraising", "Public Speaking"];
  return [...new Set([...pool, ...fallback])].filter((s) => !picked.has(s.toLowerCase())).slice(0, 8);
}

export function searchSkills(q: string, exclude: string[]): string[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const picked = new Set(exclude.map((e) => e.toLowerCase()));
  const starts = ALL_SKILLS.filter((s) => s.toLowerCase().startsWith(query));
  const has = ALL_SKILLS.filter((s) => !s.toLowerCase().startsWith(query) && s.toLowerCase().includes(query));
  return [...starts, ...has].filter((s) => !picked.has(s.toLowerCase())).slice(0, 6);
}
