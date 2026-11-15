import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import qrcode from "qrcode-generator";
import { EVENT } from "../../shared/event";
import { IconShare } from "./icons";

// Scannable card for getting the person next to you onto Connect.
export function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const url = location.origin;
  const label = url.replace(/^https?:\/\//, "");
  const [copied, setCopied] = useState(false);

  const qr = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(url);
    q.make();
    const n = q.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, d };
  }, [url]);

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: `${EVENT.name} ${EVENT.app}`, text: EVENT.shareText, url });
      else await copy();
    } catch {
      // cancelled
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt("Copy this link:", url);
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper px-5 pt-5 pb-safe outline-none">
          <Drawer.Title className="font-display text-[28px] leading-tight">Scan to join</Drawer.Title>
          <Drawer.Description className="mt-1 text-[16px] text-muted">Point their camera here. No app to download.</Drawer.Description>

          <div className="pop mx-auto mt-5 w-full max-w-[300px] border-2 border-ink bg-white p-4">
            <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} className="block aspect-square w-full" shapeRendering="crispEdges" role="img" aria-label={`QR code for ${label}`}>
              <rect x="-2" y="-2" width={qr.n + 4} height={qr.n + 4} fill="#fff" />
              <path d={qr.d} fill="#171717" />
            </svg>
            <p className="mt-3 text-center font-display text-[18px] leading-tight [overflow-wrap:anywhere]">
              {label.split(/(?<=\.)/).map((part, i) => (
                <span key={i}>
                  {part}
                  <wbr />
                </span>
              ))}
            </p>
          </div>

          <div className="mt-6 mb-4 grid grid-cols-2 gap-3">
            <button onClick={copy} className="press pop-sm h-12 border-2 border-ink bg-card text-[16px] font-semibold">
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button onClick={share} className="press pop-sm flex h-12 items-center justify-center gap-2 border-2 border-ink bg-amber text-[16px] font-semibold">
              <IconShare width={18} height={18} /> Share
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
