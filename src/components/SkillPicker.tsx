import { useState } from "react";
import { normalizeSkill, searchSkills, suggestFor } from "../../shared/skills";
import { IconClose } from "./icons";

// Search-first skill picker. Picked skills show as tokens on top,
// one-tap suggestions (based on your "I am" tags) underneath,
// and anything not in the catalog can be added as typed.
export function SkillPicker({
  value,
  onChange,
  max,
  tags,
  placeholder = "Search skills, e.g. Flutter, Go, Figma",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  tags: string[];
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const full = value.length >= max;
  const results = searchSkills(q, value);
  const custom = normalizeSkill(q);
  const showCustom = custom && !results.some((r) => r.toLowerCase() === custom.toLowerCase()) && !value.some((v) => v.toLowerCase() === custom.toLowerCase());
  const suggestions = suggestFor(tags, value);

  const add = (s: string) => {
    if (full || value.some((v) => v.toLowerCase() === s.toLowerCase())) return;
    onChange([...value, s]);
    setQ("");
  };
  const remove = (s: string) => onChange(value.filter((v) => v !== s));

  return (
    <div className="grid gap-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => remove(s)}
              className="flex items-center gap-1.5 border-2 border-ink bg-ink py-1 pr-2 pl-3 text-[15px] text-paper"
              aria-label={`Remove ${s}`}
            >
              {s} <IconClose width={14} height={14} />
            </button>
          ))}
        </div>
      )}

      {full ? (
        <p className="text-[14px] text-muted">That's {max}. Tap one to swap it out.</p>
      ) : (
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const pick = results[0] ?? custom;
                if (pick) add(pick);
              }
            }}
            placeholder={placeholder}
            autoCapitalize="off"
            autoCorrect="off"
            className="h-12 w-full border-2 border-ink bg-card px-3.5 outline-none placeholder:text-ink/35 focus:bg-white"
          />
          {q && (results.length > 0 || showCustom) && (
            <div className="pop absolute inset-x-0 top-full z-10 mt-1 border-2 border-ink bg-white">
              {results.map((r) => (
                <button key={r} type="button" onClick={() => add(r)} className="block w-full border-b border-ink/10 px-3.5 py-2.5 text-left text-[16px] last:border-0">
                  {r}
                </button>
              ))}
              {showCustom && (
                <button type="button" onClick={() => add(custom!)} className="block w-full px-3.5 py-2.5 text-left text-[16px] text-muted">
                  Add "<span className="text-ink">{custom}</span>"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!full && !q && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="border-2 border-dashed border-ink/40 bg-card px-3 py-1 text-[15px]">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
