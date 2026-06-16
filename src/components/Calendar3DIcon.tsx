import type { CSSProperties } from "react";

export function Calendar3DIcon({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={`inline-block ${className}`} style={style}>
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="calendar-page" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.52" stopColor="#f4f7fb" />
            <stop offset="1" stopColor="#d9e3f1" />
          </linearGradient>
          <linearGradient id="calendar-head" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d20b52" />
            <stop offset="1" stopColor="#a50034" />
          </linearGradient>
          <radialGradient id="calendar-date" cx="0.32" cy="0.25" r="0.8">
            <stop offset="0" stopColor="#ff8ab2" />
            <stop offset="0.55" stopColor="#c90045" />
            <stop offset="1" stopColor="#8e002f" />
          </radialGradient>
        </defs>
        <ellipse cx="24" cy="44.5" rx="13.5" ry="2.8" fill="rgba(35,45,70,0.34)" />
        <rect x="8" y="7" width="32" height="36" rx="9" fill="url(#calendar-page)" stroke="#b75479" strokeWidth="1.25" />
        <path
          d="M17 7h14c5 0 9 4 9 9v5H8v-5c0-5 4-9 9-9Z"
          fill="url(#calendar-head)"
        />
        <path d="M10 19h28" stroke="#a50034" strokeWidth="1.2" opacity="0.32" />
        <rect x="15" y="4.5" width="4" height="8" rx="2" fill="#f3f6fb" stroke="#8ca0b8" strokeWidth="1" />
        <rect x="29" y="4.5" width="4" height="8" rx="2" fill="#f3f6fb" stroke="#8ca0b8" strokeWidth="1" />
        <rect x="11" y="8.5" width="28" height="8" rx="6" fill="#ffffff" opacity="0.16" />
        <circle cx="17" cy="27" r="1.45" fill="#9aa8ba" />
        <circle cx="24" cy="27" r="1.45" fill="#9aa8ba" />
        <circle cx="31" cy="27" r="1.45" fill="#9aa8ba" />
        <circle cx="17" cy="34" r="1.45" fill="#9aa8ba" />
        <circle cx="24" cy="34" r="5.5" fill="url(#calendar-date)" />
        <path d="M21.5 34l1.8 1.8 3.6-4" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="31" cy="34" r="1.45" fill="#9aa8ba" />
      </svg>
    </span>
  );
}
