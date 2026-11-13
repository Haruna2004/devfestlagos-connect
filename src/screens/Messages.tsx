import { useEffect, useState } from "react";
import type { PersonLite, Thread } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { api } from "../lib/api";
import type { Identity } from "../lib/api";

const POLL_MS = 8000;

export function Messages({
  identity,
  unread,
  onOpen,
}: {
  identity: Identity;
  unread: number; // from the latest ping; refetch when it changes
  onOpen: (p: PersonLite) => void;
}) {
  const [threads, setThreads] = useState<Thread[] | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => !document.hidden && api.threads(identity).then((t) => live && setThreads(t)).catch(() => {});
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [identity, unread]);

  return (
    <div className="min-h-full pb-28">
      <header className="bg-ink pt-safe">
        <TopBar />
      </header>
      <h1 className="px-5 pt-6 pb-4 font-display text-[36px] leading-none">Messages</h1>

      {threads && threads.length === 0 && (
        <div className="px-6 pt-6 text-center">
          <p className="mx-auto max-w-[300px] text-[16px] leading-snug text-muted">
            No messages yet. Open someone's card on Nearby and tap Message to say hi or tell them where you are.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 px-5">
        {threads?.map((t) => (
          <li key={t.person.id} className="min-w-0">
            <button
              onClick={() => onOpen(t.person)}
              className={`press pop-sm flex w-full items-center gap-3 border-2 border-ink p-3 text-left ${t.unread ? "bg-amber" : "bg-card"}`}
            >
              <Avatar name={t.person.name} photo={t.person.photo} seed={t.person.id} size={50} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[17px] font-semibold">{t.person.name}</span>
                  <span className="ml-auto shrink-0 text-[12px] text-ink/60">{time(t.last.at)}</span>
                </div>
                <div className={`truncate text-[15px] ${t.unread ? "font-medium" : "text-muted"}`}>
                  {t.last.from === identity.id ? "You: " : ""}
                  {t.last.body}
                </div>
              </div>
              {t.unread > 0 && <span className="grid h-6 min-w-6 place-items-center bg-ink px-1.5 text-[13px] font-semibold text-paper">{t.unread}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function time(ms: number) {
  const d = new Date(ms);
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
