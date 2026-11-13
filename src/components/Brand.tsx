import type { ReactNode } from "react";
import { EVENT } from "../../shared/event";

// Four Google-colour squares, used as a small mark.
export function Mark({ size = 8 }: { size?: number }) {
  const s = { width: size, height: size };
  return (
    <span className="inline-grid grid-cols-2 gap-[2px]">
      <span style={s} className="bg-g-blue" />
      <span style={s} className="bg-g-red" />
      <span style={s} className="bg-g-yellow" />
      <span style={s} className="bg-g-green" />
    </span>
  );
}

// Black bar at the top of every screen, like the DevFest Lagos site nav.
export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <div className="flex h-14 items-center justify-between px-5">
      <span className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-paper">
        <Mark />
        {EVENT.name} <span className="text-amber">{EVENT.app}</span>
      </span>
      {right}
    </div>
  );
}
