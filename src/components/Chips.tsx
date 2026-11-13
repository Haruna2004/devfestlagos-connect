import type { ReactNode } from "react";

export function ChipPicker({
  options,
  value,
  onChange,
  max,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
}) {
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((v) => v !== o));
    else if (value.length < max) onChange([...value, o]);
    else onChange([...value.slice(1), o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`border-2 border-ink px-3 py-1.5 text-[15px] font-medium transition-colors ${
              on ? "bg-ink text-paper" : "bg-card text-ink"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Tag({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "amber" | "ink" }) {
  const cls = {
    plain: "border-ink/20 bg-card text-ink",
    amber: "border-ink bg-amber text-ink",
    ink: "border-ink bg-ink text-paper",
  }[tone];
  return <span className={`inline-flex items-center border px-2 py-0.5 text-[13px] font-medium ${cls}`}>{children}</span>;
}
