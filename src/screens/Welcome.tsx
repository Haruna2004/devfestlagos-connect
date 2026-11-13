import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { EVENT } from "../../shared/event";
import { TopBar } from "../components/Brand";
import { IconPlusSquare, IconShare } from "../components/icons";

type BIPEvent = Event & { prompt: () => Promise<void> };

const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const STEPS = [
  ["01", "Make your card", "Who you are and what you're looking for."],
  ["02", "See who's around", "People near you, closest first."],
  ["03", "Get intros, say hi", "We point out who you should meet. Message them to find each other."],
];

export function Welcome({ onStart }: { onStart: () => void }) {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  // iOS keeps separate storage for Safari and the home-screen app,
  // so nudge people to install before they make a card.
  const showIOSHint = isIOS() && !isStandalone();

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    addEventListener("beforeinstallprompt", h);
    return () => removeEventListener("beforeinstallprompt", h);
  }, []);

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
        {showIOSHint && (
          <div className="mb-4 border-2 border-ink bg-card p-4">
            <div className="text-[15px] font-semibold">Add it to your Home Screen first</div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[14px] text-muted">
              Tap <IconShare width={17} height={17} className="text-g-blue" /> then
              <span className="inline-flex items-center gap-1 text-ink">
                <IconPlusSquare width={17} height={17} /> Add to Home Screen
              </span>
              . Then open it from there.
            </div>
          </div>
        )}
        {installEvt && (
          <button
            onClick={() => installEvt.prompt().then(() => setInstallEvt(null))}
            className="press pop-sm mb-3 h-14 w-full border-2 border-ink bg-amber text-[17px] font-semibold"
          >
            Install app
          </button>
        )}
        <button onClick={onStart} className="press pop h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper">
          {showIOSHint ? "Continue in browser" : "Get started"}
        </button>
        <p className="mt-3 text-center text-[13px] text-muted">No sign up. Takes 30 seconds.</p>
      </div>
    </div>
  );
}
