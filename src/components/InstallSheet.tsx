import { useState } from "react";
import { Drawer } from "vaul";
import { restoreLink } from "../lib/api";
import type { Identity } from "../lib/api";
import { isIOS, nativeInstall } from "../lib/install";
import { IconPlusSquare, IconShare } from "./icons";

// Shown once, after the first good moment (an intro or a chat), not on the landing page.
// On iPhone the installed app has its own storage, so we hand over the login link first.
export function InstallSheet({ open, identity, onClose }: { open: boolean; identity: Identity; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const ios = isIOS();

  async function copy() {
    try {
      await navigator.clipboard.writeText(restoreLink(identity));
      setCopied(true);
    } catch {
      prompt("Copy this link:", restoreLink(identity));
      setCopied(true);
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-ink bg-paper px-5 pt-5 pb-safe outline-none">
          <Drawer.Title className="font-display text-[28px] leading-tight">Keep Connect one tap away</Drawer.Title>
          <Drawer.Description className="mt-2 text-[16px] text-muted">
            Add it to your home screen so you can jump back in between talks.
          </Drawer.Description>

          {ios ? (
            <ol className="mt-5 grid gap-3 text-[16px]">
              <li className="flex gap-3">
                <b className="font-display text-[20px]">1</b>
                <span className="flex-1">
                  Copy your login link so your card comes with you.
                  <button onClick={copy} className="press pop-sm mt-2 block h-11 w-full border-2 border-ink bg-amber text-[15px] font-semibold">
                    {copied ? "Copied ✓" : "Copy my login link"}
                  </button>
                </span>
              </li>
              <li className="flex gap-3">
                <b className="font-display text-[20px]">2</b>
                <span className="flex flex-wrap items-center gap-1">
                  Tap <IconShare width={18} height={18} className="text-g-blue" /> then
                  <span className="inline-flex items-center gap-1 font-medium">
                    <IconPlusSquare width={18} height={18} /> Add to Home Screen
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <b className="font-display text-[20px]">3</b>
                <span>Open it and tap "Restore my card".</span>
              </li>
            </ol>
          ) : (
            <button
              onClick={() => nativeInstall().then(onClose)}
              className="press pop mt-5 h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper"
            >
              Install app
            </button>
          )}

          <button onClick={onClose} className="mt-3 mb-4 h-12 w-full text-[15px] text-muted">
            Not now
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
