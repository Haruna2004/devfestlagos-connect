export type Links = { linkedin?: string; x?: string; website?: string };

export type Profile = {
  id: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  findMe: string;
  tags: string[];
  lookingFor: string[];
  skills: string[]; // what I work with
  wantsSkills: string[]; // skills I'm looking for in others
  links: Links;
  photo: string | null; // url path, e.g. /photos/abc/123.jpg
};

export type MyProfile = Profile & { visible: boolean };

export type ProfileInput = Partial<Omit<Profile, "id" | "photo">> & { visible?: boolean };

// steps ≈ within ~20m, near ≈ ~60m, walk ≈ ~150m, venue = further. See shared/presence.ts.
export type Band = "steps" | "near" | "walk" | "venue";

export type NearbyPerson = Pick<
  Profile,
  "id" | "name" | "title" | "company" | "photo" | "findMe" | "tags" | "lookingFor" | "skills"
> & {
  distance: number; // metres, smoothed and rounded to 5
  range: [number, number]; // honest range given both phones' GPS accuracy
  walkMin: number;
  band: Band;
  seenAgo: number; // seconds
  match: number; // 0 = no match. Higher = better fit for you.
  reasons: string[]; // why you two should meet, written to you
};

export type PingResult = {
  atVenue: boolean;
  venueDistance: number; // metres from venue centre
  people: NearbyPerson[]; // your nearest 30
  more: number; // others at the venue beyond those 30 (find them with search)
  intros: NearbyPerson[]; // best matches anywhere at the venue, best first
  unread: number; // unread messages
};

export type PersonLite = Pick<Profile, "id" | "name" | "title" | "company" | "photo">;

export type Message = {
  id: number;
  from: string;
  to: string;
  body: string;
  at: number; // ms
};

export type Thread = {
  person: PersonLite;
  last: Message;
  unread: number;
};

export type Conversation = {
  person: PersonLite | null; // null if they deleted their card
  messages: Message[];
  blocked: boolean; // you blocked them
};

export { LOOKING_FOR, ROLE_TAGS } from "./event";

export const LIMITS = { name: 60, title: 60, company: 60, bio: 280, findMe: 80, link: 200, message: 500 };
