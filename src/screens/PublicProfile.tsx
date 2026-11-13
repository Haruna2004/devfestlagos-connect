import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EVENT } from "../../shared/event";
import type { Profile } from "../../shared/types";
import { Avatar } from "../components/Avatar";
import { TopBar } from "../components/Brand";
import { Tag } from "../components/Chips";
import { IconGlobe, IconLinkedIn, IconPin, IconX } from "../components/icons";
import { api } from "../lib/api";

// Shared link: /p/<id>
export function PublicProfile({ id, onOpenApp }: { id: string; onOpenApp: () => void }) {
  const [p, setP] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.user(id).then(setP).catch(() => setMissing(true));
  }, [id]);

  return (
    <div className="min-h-full pb-safe">
      <header className="bg-ink pt-safe">
        <TopBar />
      </header>
      <div className="px-5 pt-6 pb-8">
        <div className="pop border-2 border-ink bg-card p-5">
          {missing ? (
            <p className="py-10 text-center text-[17px] text-muted">This card doesn't exist anymore.</p>
          ) : !p ? (
            <div className="h-60" />
          ) : (
            <>
              <div className="flex items-start gap-4">
                <Avatar name={p.name} photo={p.photo} seed={p.id} size={96} />
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-[28px] leading-[1.05]">{p.name}</h1>
                  {(p.title || p.company) && <p className="mt-1 text-[16px] text-muted">{[p.title, p.company].filter(Boolean).join(" · ")}</p>}
                </div>
              </div>
              {(p.tags.length > 0 || p.lookingFor.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <Tag key={t} tone="ink">
                      {t}
                    </Tag>
                  ))}
                  {p.lookingFor.map((t) => (
                    <Tag key={t} tone="amber">
                      {t}
                    </Tag>
                  ))}
                </div>
              )}
              {p.findMe && (
                <p className="mt-4 flex items-center gap-1.5 text-[15px]">
                  <IconPin width={16} height={16} className="text-flame" /> {p.findMe}
                </p>
              )}
              {p.skills.length > 0 && (
                <p className="mt-4 text-[15px]">
                  <span className="text-muted">Works with </span>
                  {p.skills.join(", ")}
                </p>
              )}
              {p.bio && <p className="mt-4 text-[16px] leading-snug">{p.bio}</p>}
              <div className="mt-5 flex gap-2">
                {p.links.linkedin && <Square href={p.links.linkedin} label="LinkedIn"><IconLinkedIn /></Square>}
                {p.links.x && <Square href={p.links.x} label="X"><IconX /></Square>}
                {p.links.website && <Square href={p.links.website} label="Website"><IconGlobe /></Square>}
              </div>
            </>
          )}
        </div>
        <button onClick={onOpenApp} className="press pop mt-6 h-14 w-full border-2 border-ink bg-ink text-[17px] font-semibold text-paper">
          See who's around you at {EVENT.name}
        </button>
      </div>
    </div>
  );
}

function Square({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="press pop-sm grid size-12 place-items-center border-2 border-ink bg-paper">
      {children}
    </a>
  );
}
