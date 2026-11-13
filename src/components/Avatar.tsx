const SHADES = ["#4285F4", "#EA4335", "#F9AB00", "#34A853", "#F04E23", "#171717"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function shade(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return SHADES[Math.abs(h) % SHADES.length];
}

// Square photo with an ink border. Falls back to initials on a Google colour.
export function Avatar({
  name,
  photo,
  seed,
  size = 56,
  className = "",
}: {
  name: string;
  photo: string | null;
  seed: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  const base = `shrink-0 border-2 border-ink ${className}`;
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        loading="lazy"
        draggable={false}
        style={style}
        className={`${base} bg-paper-deep object-cover`}
      />
    );
  }
  return (
    <div style={{ ...style, background: shade(seed) }} className={`${base} grid place-items-center font-display text-white`}>
      {initials(name) || "?"}
    </div>
  );
}
