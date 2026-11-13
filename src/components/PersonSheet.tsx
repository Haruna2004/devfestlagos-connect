import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { EVENT } from "../../shared/event";
import type { NearbyPerson, Profile } from "../../shared/types";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { Tag } from "./Chips";
import { freshness, range, where } from "./format";
import { LightUp } from "./LightUp";
import type { Identity } from "../lib/api";
import { IconChat, IconGlobe, IconLinkedIn, IconPin, IconShare, IconSpark, IconX } from "./icons";

export function PersonSheet({
  person,
  identity,
  myName,
  onClose,
  onMessage,
}: {
  person: NearbyPerson | null;
  identity: Identity;
  myName: string;
  onClose: () => void;
  onMessage: (p: NearbyPerson) => void;
}) {
  const [full, setFull] = useState<Profile | null>(null);
  const [lit, setLit] = useState(false);

  useEffect(() => {
    setFull(null);
    if (!person) return;
    let live = true;
    api
      .user(person.id)
      .then((p) => live && setFull(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [person?.id]);

  const p = full ?? person;

  return (
    <Drawer.Root open={!!person} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col border-t-2 border-ink bg-paper outline-none">
          <Drawer.Handle className="mt-3 !h-1.5 !w-12 !rounded-none !bg-ink/25" />
          {p && person && (
            <div className="overflow-y-auto px-5 pb-safe">
              <div className="flex items-start gap-4 pt-5">
                <Avatar name={p.name} photo={p.photo} seed={p.id} size={96} className="pop" />
                <div className="min-w-0 flex-1 pt-1">
                  <Drawer.Title className="font-display text-[28px] leading-[1.05]">{p.name}</Drawer.Title>
                  {(p.title || p.company) && (
                    <p className="mt-1 text-[16px] text-muted">{[p.title, p.company].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag tone="ink">{where(person)}</Tag>
                    {p.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </div>
              </div>

              {/* Where to find them: the note does the real work, distance is a hint. */}
              <div className="mt-5 border-2 border-ink bg-card p-4">
                <div className="flex items-start gap-3">
                  <IconPin className="mt-0.5 shrink-0 text-flame" />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[18px] leading-snug font-semibold ${p.findMe ? "" : "text-muted"}`}>
                      {p.findMe || "No \"find me\" note yet. Message them to ask where they are."}
                    </div>
                    <div className="mt-1 text-[14px] text-muted">
                      {range(person)} · {freshness(person.seenAgo)}
                    </div>
                  </div>
                </div>
                {(person.band === "steps" || person.band === "near") && (
                  <button
                    onClick={() => setLit(true)}
                    className="press pop-sm mt-3 h-11 w-full border-2 border-ink bg-amber text-[15px] font-semibold"
                  >
                    Light up to spot each other
                  </button>
                )}
              </div>

              {person.reasons.length > 0 && (
                <div className="pop mt-5 border-2 border-ink bg-amber p-4">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold tracking-wide uppercase">
                    <IconSpark width={14} height={14} /> Why you should meet
                  </div>
                  <ul className="mt-1.5 grid gap-1 text-[16px] leading-snug">
                    {person.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {full?.bio && <p className="mt-5 text-[17px] leading-relaxed">{full.bio}</p>}

              {full && full.skills.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">Works with</div>
                  <div className="flex flex-wrap gap-1.5">
                    {full.skills.map((t) => (
                      <Tag key={t} tone="ink">
                        {t}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {full && full.lookingFor.length + full.wantsSkills.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">Looking for</div>
                  <div className="flex flex-wrap gap-1.5">
                    {full.lookingFor.map((t) => (
                      <Tag key={t} tone="amber">
                        {t}
                      </Tag>
                    ))}
                    {full.wantsSkills.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 mb-6 grid gap-3">
                <button
                  onClick={() => onMessage(person)}
                  className="press pop flex h-14 items-center justify-center gap-2 border-2 border-ink bg-ink text-[17px] font-semibold text-paper"
                >
                  <IconChat width={20} height={20} /> Message {p.name.split(" ")[0]}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {full?.links.linkedin && <LinkButton href={full.links.linkedin} icon={<IconLinkedIn width={18} height={18} />} label="LinkedIn" />}
                  {full?.links.x && <LinkButton href={full.links.x} icon={<IconX width={18} height={18} />} label="X" />}
                  {full?.links.website && <LinkButton href={full.links.website} icon={<IconGlobe width={18} height={18} />} label="Website" />}
                  <button
                    onClick={() => share(p.id, p.name)}
                    className="press pop-sm flex h-12 items-center justify-center gap-2 border-2 border-ink bg-card text-[15px] font-medium"
                  >
                    <IconShare width={18} height={18} /> Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
      {lit && person && <LightUp identity={identity} myName={myName} other={person} onClose={() => setLit(false)} />}
    </Drawer.Root>
  );
}

function LinkButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="press pop-sm flex h-12 items-center justify-center gap-2 border-2 border-ink bg-card text-[15px] font-medium"
    >
      {icon} {label}
    </a>
  );
}

async function share(id: string, name: string) {
  const url = `${location.origin}/p/${id}`;
  try {
    if (navigator.share) await navigator.share({ title: `${name} at ${EVENT.name}`, url });
    else await navigator.clipboard.writeText(url);
  } catch {
    // user cancelled
  }
}
