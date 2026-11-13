import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { api } from "../lib/api";
import type { Identity } from "../lib/api";
import { IconClose } from "./icons";

// The last few metres: both phones show the same bright colour and your
// first name, full screen. Hold it up and spot each other across the room.
// The colour comes from the pair of ids, so both phones agree without talking.
const COLOURS = [
  { name: "yellow", bg: "#F9AB00", fg: "#171717" },
  { name: "blue", bg: "#4285F4", fg: "#FFFFFF" },
  { name: "green", bg: "#34A853", fg: "#FFFFFF" },
  { name: "red", bg: "#EA4335", fg: "#FFFFFF" },
  { name: "orange", bg: "#F04E23", fg: "#FFFFFF" },
  { name: "pink", bg: "#F06292", fg: "#FFFFFF" },
];

export function pairColour(a: string, b: string) {
  const key = [a, b].sort().join(":");
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLOURS[Math.abs(h) % COLOURS.length];
}

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

export function LightUp({
  identity,
  myName,
  other,
  onClose,
}: {
  identity: Identity;
  myName: string;
  other: { id: string; name: string };
  onClose: () => void;
}) {
  const colour = pairColour(identity.id, other.id);
  const [told, setTold] = useState(false);

  // Keep the screen awake while lit.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  async function tell() {
    setTold(true);
    try {
      await api.send(identity, other.id, `I'm holding up a ${colour.name} screen with my name on it. Tap Light up to show yours 👋`);
    } catch {
      setTold(false);
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex flex-col pt-safe pb-safe"
      style={{ background: colour.bg, color: colour.fg }}
      onClick={onClose}
    >
      <div className="flex justify-end p-3">
        <button className="grid size-12 place-items-center" aria-label="Close">
          <IconClose />
        </button>
      </div>
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex flex-1 flex-col items-center justify-center px-6 text-center"
      >
        <div className="font-display text-[22vw] leading-none break-all">{first(myName)}</div>
        <p className="mt-6 max-w-[320px] text-[18px] font-medium opacity-90">
          Hold your phone up. {first(other.name)} sees this same {colour.name} screen.
        </p>
      </motion.div>
      <div className="px-6 pb-6" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={tell}
          disabled={told}
          className="h-14 w-full border-2 text-[17px] font-semibold disabled:opacity-60"
          style={{ borderColor: colour.fg }}
        >
          {told ? `Told ${first(other.name)} ✓` : `Tell ${first(other.name)} to light up too`}
        </button>
        <p className="mt-3 text-center text-[13px] opacity-75">Tap anywhere to close</p>
      </div>
    </motion.div>,
    document.body,
  );
}
