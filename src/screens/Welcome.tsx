import { useState } from "react";
import { motion } from "motion/react";
import { EVENT } from "../../shared/event";
import { TopBar } from "../components/Brand";
import { parseRestore } from "../lib/api";
import type { Identity } from "../lib/api";
import { isStandalone } from "../lib/install";

const STEPS = [
  ["01", "Make your card", "Name, photo, what you do. 20 seconds."],
  ["02", "See who's around", "People near you, closest first."],
  ["03", "Get intros, say hi", "We point out who you should meet. Message them to find each other."],
];

export function Welcome({ onStart, onRestore }: { onStart: () => void; onRestore: (id: Identity) => void }) {
  // In the installed app, people often already made a card in the browser.
  const [restoring, setRestoring] = useState(isStandalone());
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setLink(text);
      tryRestore(text);
    } catch {
      setError("Couldn't read the clipboard. Paste the link in the box.");
    }
  }

  function tryRestore(text: string) {
    const id = parseRestore(text);
    if (id) onRestore(id);
    else setError("That doesn't look like a Connect login link.");
  }

  return (
    <div className="flex min-h-full flex-col bg-paper pb-safe">
      <div className="bg-ink pt-safe">
        <TopBar />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="px-5 pt-10 font-display text-[48px] leading-[0.98] tracking-tight"
      >
        Meet your <span className="text-amber">people</span>, right here.
      </motion.h1>
      <p className="max-w-[340px] px-5 pt-4 text-[18px] leading-snug">
        See who's near you at {EVENT.name}, get intros to the ones you should meet, and say hi.
      </p>

      <div className="mt-8 bg-flame px-5 py-6 text-paper">
        {STEPS.map(([n, t, d]) => (
          <div key={n} className="flex gap-4 border-b border-paper/25 py-3 last:border-0">
            <span className="font-display text-[26px] leading-none text-ink">{n}</span>
            <div>
              <div className="text-[17px] font-semibold">{t}</div>
              <div className="text-[15px] text-paper/85">{d}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto px-5 pt-6 pb-6">
        <button onClick={onStart} className="press pop h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper">
          Get started
        </button>

        {restoring ? (
          <div className="mt-4 border-2 border-ink bg-card p-4">
            <div className="text-[15px] font-semibold">Already made a card? Restore it</div>
            <div className="mt-2 flex gap-2">
              <input
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setError(null);
                }}
                placeholder="Paste your login link"
                autoCapitalize="off"
                className="h-11 min-w-0 flex-1 border-2 border-ink bg-paper px-3 text-[15px] outline-none"
              />
              <button
                onClick={() => (link ? tryRestore(link) : paste())}
                className="h-11 shrink-0 border-2 border-ink bg-amber px-3 text-[15px] font-semibold"
              >
                {link ? "Restore" : "Paste"}
              </button>
            </div>
            {error && <p className="mt-2 text-[13px] text-g-red">{error}</p>}
          </div>
        ) : (
          <button onClick={() => setRestoring(true)} className="mt-3 block w-full text-center text-[14px] text-muted underline underline-offset-4">
            Already made a card? Restore it
          </button>
        )}
      </div>
    </div>
  );
}
