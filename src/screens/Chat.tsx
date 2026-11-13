import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { LIMITS } from "../../shared/types";
import type { Message, PersonLite } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { IconBack, IconBlock, IconSend, IconSpark } from "../components/icons";
import { LightUp } from "../components/LightUp";
import { api } from "../lib/api";
import type { Identity } from "../lib/api";
import { time } from "./Messages";

const POLL_MS = 4000;

const QUICK = ["Hey! Saw you on Connect 👋", "Where are you right now?", "I'm wearing…", "Want to grab a coffee?"];

// Full-screen text chat. Polls for new messages while open.
export function Chat({
  identity,
  myName,
  person,
  onBack,
  onOpenProfile,
}: {
  identity: Identity;
  myName: string;
  person: PersonLite;
  onBack: () => void;
  onOpenProfile?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [gone, setGone] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lit, setLit] = useState(false);
  const lastId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const c = await api.messages(identity, person.id, lastId.current);
        if (!live) return;
        setBlocked(c.blocked);
        setGone(!c.person);
        if (c.messages.length) {
          lastId.current = c.messages[c.messages.length - 1].id;
          setMessages((m) => {
            const known = new Set(m.map((x) => x.id));
            return [...m, ...c.messages.filter((x) => !known.has(x.id))];
          });
        }
        setLoaded(true);
      } catch {
        // offline: keep what we have, retry on next tick
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [identity, person.id]);

  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: loaded ? "smooth" : "auto" });
  }, [messages.length, loaded]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError(null);
    try {
      const m = await api.send(identity, person.id, body);
      lastId.current = Math.max(lastId.current, m.id);
      setMessages((list) => [...list, m]);
    } catch (err) {
      setText(body);
      setError(err instanceof Error ? err.message : "Couldn't send");
    }
  }

  async function toggleBlock() {
    if (blocked) {
      await api.unblock(identity, person.id);
      setBlocked(false);
    } else if (confirm(`Block ${person.name}? You won't see each other or be able to message.`)) {
      await api.block(identity, person.id);
      onBack();
    }
  }

  const canSend = !blocked && !gone;

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="bg-ink pt-safe text-paper">
        <div className="flex h-16 items-center gap-2 px-2">
          <button onClick={onBack} className="p-2" aria-label="Back">
            <IconBack />
          </button>
          <button onClick={onOpenProfile} disabled={!onOpenProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar name={person.name} photo={person.photo} seed={person.id} size={38} className="border-paper" />
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold">{person.name}</div>
              {(person.title || person.company) && (
                <div className="truncate text-[13px] text-paper/60">{[person.title, person.company].filter(Boolean).join(" · ")}</div>
              )}
            </div>
          </button>
          {!blocked && !gone && (
            <button onClick={() => setLit(true)} className="flex items-center gap-1 bg-amber px-2.5 py-1.5 text-[13px] font-semibold text-ink" aria-label="Light up">
              <IconSpark width={14} height={14} /> Light up
            </button>
          )}
          <button onClick={toggleBlock} className="p-2 text-paper/70" aria-label={blocked ? "Unblock" : "Block"}>
            <IconBlock width={20} height={20} />
          </button>
        </div>
      </header>

      <div ref={scroller} className="grid-paper flex-1 overflow-y-auto px-4 py-4">
        {loaded && messages.length === 0 && (
          <p className="mx-auto mt-6 max-w-[280px] text-center text-[15px] text-muted">
            Say hi to {person.name.split(" ")[0]}. Tell them where you are or what you're wearing so you can find each other.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m, i) => {
            const mine = m.from === identity.id;
            const showTime = i === messages.length - 1 || messages[i + 1].from !== m.from || messages[i + 1].at - m.at > 5 * 60_000;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] border-2 border-ink px-3 py-2 text-[16px] leading-snug break-words whitespace-pre-wrap ${
                    mine ? "bg-ink text-paper" : "pop-sm bg-card"
                  }`}
                >
                  {m.body}
                </div>
                {showTime && <span className="mt-1 text-[11px] text-muted">{time(m.at)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {canSend ? (
        <div className="border-t-2 border-ink bg-paper pb-safe">
          {messages.length === 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setText(q);
                    input.current?.focus();
                  }}
                  className="shrink-0 border-2 border-ink bg-card px-3 py-1.5 text-[14px]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {error && <p className="px-4 pt-2 text-[13px] text-g-red">{error}</p>}
          <form onSubmit={send} className="flex items-end gap-2 p-3">
            <textarea
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={LIMITS.message}
              placeholder="Message"
              className="max-h-32 min-h-12 flex-1 resize-none border-2 border-ink bg-card px-3 py-2.5 leading-snug outline-none field-sizing-content"
            />
            <button type="submit" disabled={!text.trim()} className="grid size-12 shrink-0 place-items-center border-2 border-ink bg-amber disabled:opacity-40" aria-label="Send">
              <IconSend width={20} height={20} />
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t-2 border-ink bg-paper-deep px-5 py-4 pb-safe text-center text-[14px] text-muted">
          {gone ? "This person deleted their card." : "You blocked this person."}
        </div>
      )}
      {lit && <LightUp identity={identity} myName={myName} other={person} onClose={() => setLit(false)} />}
    </div>
  );
}
