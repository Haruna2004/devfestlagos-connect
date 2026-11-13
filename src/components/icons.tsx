import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconRadar = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" opacity=".4" />
    <circle cx="12" cy="12" r="5" opacity=".7" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconEyeOff = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const IconLinkedIn = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3zM9.5 9.75h3.8v1.6h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.66 4.79 6.12V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6V21h-4z" />
  </svg>
);
export const IconX = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77zm-1.08 16.2h1.7L7.4 4.73H5.58z" />
  </svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
  </svg>
);
export const IconShare = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const IconLink = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </svg>
);
export const IconEdit = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
  </svg>
);
export const IconPlusSquare = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
export const IconChat = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16v11H9l-5 4z" />
  </svg>
);
export const IconSend = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12 20 4l-6 16-3-7z" />
  </svg>
);
export const IconBack = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const IconBlock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </svg>
);
export const IconSpark = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
  </svg>
);
