import type { Conversation, Message, MyProfile, PingResult, Profile, ProfileInput, Thread } from "../../shared/types";

const KEY = "connect.identity";

export type Identity = { id: string; secret: string };

export function getIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function setIdentity(i: Identity | null) {
  try {
    if (i) localStorage.setItem(KEY, JSON.stringify(i));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: app still works for this session
  }
}

// Restore link: /#k=<id>.<secret>
export function readRestoreHash(): Identity | null {
  const m = location.hash.match(/k=([a-z0-9]+)\.([a-z0-9]+)/);
  if (!m) return null;
  history.replaceState(null, "", location.pathname + location.search);
  return { id: m[1], secret: m[2] };
}

export const restoreLink = (i: Identity) => `${location.origin}/#k=${i.id}.${i.secret}`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, id?: Identity | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (id) headers.set("authorization", `Bearer ${id.id}.${id.secret}`);
  if (init.body && typeof init.body === "string") headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "Something went wrong");
  return data as T;
}

export const api = {
  create: (input: ProfileInput) =>
    call<{ id: string; secret: string; profile: MyProfile }>("/api/me", { method: "POST", body: JSON.stringify(input) }),
  me: (id: Identity) => call<MyProfile>("/api/me", {}, id),
  update: (id: Identity, input: ProfileInput) =>
    call<MyProfile>("/api/me", { method: "PATCH", body: JSON.stringify(input) }, id),
  remove: (id: Identity) => call<{ ok: true }>("/api/me", { method: "DELETE" }, id),
  photo: (id: Identity, blob: Blob) =>
    call<{ photo: string }>("/api/me/photo", { method: "PUT", body: blob, headers: { "content-type": blob.type } }, id),
  ping: (id: Identity, lat: number, lng: number, accuracy: number) =>
    call<PingResult>("/api/me/ping", { method: "POST", body: JSON.stringify({ lat, lng, accuracy }) }, id),
  user: (userId: string) => call<Profile>(`/api/users/${userId}`),
  threads: (id: Identity) => call<Thread[]>("/api/me/threads", {}, id),
  messages: (id: Identity, other: string, after = 0) =>
    call<Conversation>(`/api/me/messages/${other}?after=${after}`, {}, id),
  send: (id: Identity, other: string, body: string) =>
    call<Message>(`/api/me/messages/${other}`, { method: "POST", body: JSON.stringify({ body }) }, id),
  block: (id: Identity, other: string) => call<{ ok: true }>(`/api/me/blocks/${other}`, { method: "PUT" }, id),
  unblock: (id: Identity, other: string) => call<{ ok: true }>(`/api/me/blocks/${other}`, { method: "DELETE" }, id),
};
