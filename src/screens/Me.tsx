import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { EVENT } from "../../shared/event";
import { LIMITS } from "../../shared/types";
import type { MyProfile } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { Tag } from "../components/Chips";
import { IconEdit, IconEye, IconEyeOff, IconLink, IconPin, IconShare } from "../components/icons";
import { restoreLink } from "../lib/api";
import type { Identity } from "../lib/api";

export function Me({
  me,
  identity,
  focusFindMe,
  onSaveFindMe,
  onToggleVisible,
  onEdit,
  onDelete,
}: {
  me: MyProfile;
  identity: Identity;
  focusFindMe: boolean;
  onSaveFindMe: (v: string) => Promise<void>;
  onToggleVisible: () => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [findMe, setFindMe] = useState(me.findMe);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFindMe(me.findMe), [me.findMe]);
  useEffect(() => {
    if (focusFindMe) findRef.current?.focus();
  }, [focusFindMe]);

  async function saveFind() {
    await onSaveFindMe(findMe);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    findRef.current?.blur();
  }

  async function copy(what: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      prompt("Copy this:", text);
    }
  }

  const profileUrl = `${location.origin}/p/${me.id}`;

  return (
    <div className="min-h-full pb-28">
      <header className="bg-ink pt-safe">
        <TopBar
          right={
            <button onClick={onEdit} className="flex items-center gap-1.5 border border-paper/40 px-2.5 py-1 text-[14px] text-paper">
              <IconEdit width={15} height={15} /> Edit
            </button>
          }
        />
      </header>

      <div className="px-5 pt-6">
        {/* the card others see */}
        <div className="pop border-2 border-ink bg-card p-5">
          <div className="flex items-start gap-4">
            <Avatar name={me.name} photo={me.photo} seed={me.id} size={84} />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[26px] leading-[1.05]">{me.name}</h1>
              {(me.title || me.company) && <p className="mt-1 text-[15px] text-muted">{[me.title, me.company].filter(Boolean).join(" · ")}</p>}
            </div>
          </div>
          {(me.tags.length > 0 || me.lookingFor.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {me.tags.map((t) => (
                <Tag key={t} tone="ink">
                  {t}
                </Tag>
              ))}
              {me.lookingFor.map((t) => (
                <Tag key={t} tone="amber">
                  {t}
                </Tag>
              ))}
            </div>
          )}
          {me.bio && <p className="mt-3 text-[15px] leading-snug">{me.bio}</p>}
        </div>

        <Card>
          <label className="flex items-center gap-2 font-display text-[19px]">
            <IconPin width={18} height={18} className="text-flame" /> Where can people find you?
          </label>
          <div className="mt-3 flex gap-2">
            <input
              ref={findRef}
              value={findMe}
              onChange={(e) => setFindMe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFind()}
              maxLength={LIMITS.findMe}
              placeholder="Hall B, row 3, green hoodie"
              className="h-12 min-w-0 flex-1 border-2 border-ink bg-paper px-3 outline-none placeholder:text-ink/35 focus:bg-white"
            />
            <button
              onClick={saveFind}
              disabled={findMe === me.findMe && !saved}
              className="h-12 border-2 border-ink bg-ink px-4 text-[15px] font-semibold text-paper disabled:opacity-35"
            >
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </Card>

        <Card>
          <button onClick={onToggleVisible} className="flex w-full items-center gap-3 text-left">
            <span className={`grid size-10 place-items-center border-2 border-ink ${me.visible ? "bg-amber" : "bg-ink text-paper"}`}>
              {me.visible ? <IconEye width={20} height={20} /> : <IconEyeOff width={20} height={20} />}
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-semibold">{me.visible ? "Visible" : "Hidden"}</span>
              <span className="block text-[14px] text-muted">
                {me.visible ? "People nearby can see your card" : "No one can see you on Connect"}
              </span>
            </span>
            <Switch on={me.visible} />
          </button>
        </Card>

        <Card>
          <Row
            icon={<IconShare width={20} height={20} />}
            title="Share my card"
            sub={copied === "card" ? "Copied!" : "Send people your profile link"}
            onClick={() =>
              navigator.share ? navigator.share({ title: `${me.name} at ${EVENT.name}`, url: profileUrl }).catch(() => {}) : copy("card", profileUrl)
            }
          />
          <div className="my-3 h-0.5 bg-ink/10" />
          <Row
            icon={<IconLink width={20} height={20} />}
            title="Save my login link"
            sub={copied === "key" ? "Copied! Keep it private." : "Open it on another phone to get your card back"}
            onClick={() => copy("key", restoreLink(identity))}
          />
        </Card>

        <button
          onClick={() => confirm("Delete your card and messages? People won't see you anymore.") && onDelete()}
          className="mx-auto mt-8 block text-[14px] font-medium text-g-red underline underline-offset-4"
        >
          Delete my card
        </button>
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="mt-4 border-2 border-ink bg-card p-4">{children}</div>;
}

function Row({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 text-left">
      <span className="grid size-10 place-items-center border-2 border-ink bg-paper">{icon}</span>
      <span>
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-[14px] text-muted">{sub}</span>
      </span>
    </button>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-[30px] w-[52px] shrink-0 border-2 border-ink transition-colors ${on ? "bg-amber" : "bg-paper-deep"}`}>
      <span className={`absolute top-[3px] size-5 bg-ink transition-transform ${on ? "translate-x-[25px]" : "translate-x-[3px]"}`} />
    </span>
  );
}
