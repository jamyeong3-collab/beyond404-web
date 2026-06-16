import type { CSSProperties } from "react";
import { useId } from "react";

export type Service3DIconType =
  | "bell"
  | "check"
  | "clipboard"
  | "clock"
  | "credit"
  | "location"
  | "navigation"
  | "package"
  | "recycle"
  | "search"
  | "shopping"
  | "truck"
  | "warehouse";

export function Service3DIcon({
  type,
  className = "",
  style,
}: {
  type: Service3DIconType;
  className?: string;
  style?: CSSProperties;
}) {
  const rawId = useId().replace(/:/g, "");
  const tileId = `svc-tile-${rawId}`;
  const accentId = `svc-accent-${rawId}`;

  return (
    <span className={`inline-block ${className}`} style={style}>
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={tileId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f6dfe9" />
            <stop offset="1" stopColor="#d9e6fb" />
          </linearGradient>
          <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7fa9" />
            <stop offset="0.58" stopColor="#c90045" />
            <stop offset="1" stopColor="#8f002f" />
          </linearGradient>
        </defs>
        <ellipse cx="24" cy="43.5" rx="13.5" ry="2.6" fill="rgba(35,45,70,0.24)" />
        <rect x="7" y="5" width="34" height="37" rx="13" fill={`url(#${tileId})`} stroke="#f1c7d6" strokeWidth="1" />
        <path d="M12 11c5-4 17-5 24 2" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <IconGlyph type={type} accentId={accentId} />
      </svg>
    </span>
  );
}

function IconGlyph({ type, accentId }: { type: Service3DIconType; accentId: string }) {
  const accent = `url(#${accentId})`;

  switch (type) {
    case "clock":
      return (
        <>
          <circle cx="24" cy="24" r="10.5" fill="#ffffff" stroke={accent} strokeWidth="2.4" />
          <path d="M24 18.5v6.2l4.3 2.7" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case "location":
      return (
        <>
          <path d="M24 36s9-8.2 9-16.1A9 9 0 0 0 15 20c0 7.8 9 16 9 16Z" fill={accent} />
          <circle cx="24" cy="20.5" r="3.3" fill="#ffffff" />
        </>
      );
    case "truck":
      return (
        <>
          <rect x="11" y="19" width="19" height="10" rx="3" fill={accent} />
          <path d="M30 22h4.5l3.5 4v3h-8Z" fill="#b8003d" />
          <circle cx="17" cy="31" r="3" fill="#ffffff" stroke="#7c8da3" strokeWidth="1.4" />
          <circle cx="33" cy="31" r="3" fill="#ffffff" stroke="#7c8da3" strokeWidth="1.4" />
          <path d="M14 22h11" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0.5" />
        </>
      );
    case "check":
      return (
        <>
          <circle cx="24" cy="24" r="11" fill={accent} />
          <path d="M18.5 24.3 22.2 28l7.6-8.2" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case "clipboard":
      return (
        <>
          <rect x="15" y="13" width="18" height="24" rx="4" fill="#ffffff" stroke="#92a0b3" strokeWidth="1.2" />
          <rect x="19" y="10" width="10" height="6" rx="3" fill={accent} />
          <path d="M19 25.5h10M19 30.5h7" stroke="#8b99ab" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "credit":
      return (
        <>
          <rect x="11" y="16" width="26" height="18" rx="5" fill="#ffffff" stroke={accent} strokeWidth="1.6" />
          <rect x="11" y="20" width="26" height="4" fill={accent} opacity="0.9" />
          <path d="M16 29h7M28 29h4" stroke="#8b99ab" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M16 29h16l-1.5-3v-5.2A6.5 6.5 0 0 0 24 14a6.5 6.5 0 0 0-6.5 6.8V26Z" fill={accent} />
          <path d="M21.5 31.5c.8 1.8 4.2 1.8 5 0" stroke="#8b99ab" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M19 19c1.2-2 2.8-3 5-3" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </>
      );
    case "navigation":
      return (
        <>
          <path d="M34.5 12.5 25 36l-3.8-9.2-8.7-3.3Z" fill={accent} />
          <path d="M25 36 23.4 25.8 34.5 12.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        </>
      );
    case "warehouse":
      return (
        <>
          <path d="M11 22.5 24 14l13 8.5v13H11Z" fill="#ffffff" stroke="#8fa0b5" strokeWidth="1.3" />
          <path d="M11 22.5 24 14l13 8.5" stroke={accent} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <rect x="18" y="26" width="12" height="9.5" rx="2" fill={accent} opacity="0.9" />
        </>
      );
    case "package":
      return (
        <>
          <path d="M13 18.5 24 12l11 6.5v14L24 39l-11-6.5Z" fill="#ffffff" stroke="#8fa0b5" strokeWidth="1.2" />
          <path d="M13 18.5 24 25l11-6.5M24 25v14" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
        </>
      );
    case "shopping":
      return (
        <>
          <path d="M15 19h18l-1.5 17h-15Z" fill="#ffffff" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M20 20v-2.3a4 4 0 0 1 8 0V20" stroke={accent} strokeWidth="2.1" strokeLinecap="round" fill="none" />
        </>
      );
    case "recycle":
      return (
        <>
          <path d="M22 13.5a11 11 0 0 1 9 4.8l2-1.1-1.2 6.4-5.7-3 2-1.1a7.4 7.4 0 0 0-6.1-3.1" fill={accent} />
          <path d="M16.8 18.8a11 11 0 0 0-1.3 10l-2.1.7 5.5 3.5 1.4-6.3-2.2.7a7.4 7.4 0 0 1 .9-6.7" fill={accent} opacity="0.9" />
          <path d="M25.5 34.5a11 11 0 0 0 8.1-5.9l1.8 1.4-.3-6.5-6.1 2.1 1.9 1.4a7.4 7.4 0 0 1-5.5 4" fill={accent} opacity="0.82" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="22" cy="22" r="8" fill="#ffffff" stroke={accent} strokeWidth="2.3" />
          <path d="M28 28 35 35" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}
