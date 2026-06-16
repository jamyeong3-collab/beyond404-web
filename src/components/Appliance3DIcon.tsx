// 외부 에셋 없이 인라인 SVG로 만든 컬러 3D 스타일 가전 아이콘.
// 그라데이션(상단 광택 → 하단 음영) + 바닥 그림자로 입체감을 줘요.

type ApplianceIconId =
  | "washing_machine"
  | "refrigerator"
  | "air_conditioner"
  | "microwave"
  | "tv"
  | "air_purifier";

const SHADOW = (
  <ellipse cx="24" cy="44.5" rx="13" ry="2.4" fill="rgba(60,20,0,0.22)" />
);

function WashingMachine3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfdff" />
          <stop offset="1" stopColor="#bcd2f2" />
        </linearGradient>
        <radialGradient id="wm-glass" cx="0.38" cy="0.34" r="0.75">
          <stop offset="0" stopColor="#eaf2ff" />
          <stop offset="0.55" stopColor="#9dc0ef" />
          <stop offset="1" stopColor="#5f8fd6" />
        </radialGradient>
      </defs>
      {SHADOW}
      <rect x="8" y="5" width="32" height="38" rx="9" fill="url(#wm-body)" stroke="#9ab6e0" strokeWidth="0.8" />
      <rect x="8" y="5" width="32" height="11" rx="9" fill="#ffffff" opacity="0.35" />
      <circle cx="14" cy="11" r="1.6" fill="#7f9fce" />
      <rect x="19" y="9.5" width="15" height="3" rx="1.5" fill="#dbe6f7" />
      <circle cx="24" cy="28" r="11" fill="#cdddf4" />
      <circle cx="24" cy="28" r="8.6" fill="url(#wm-glass)" stroke="#7ea3da" strokeWidth="0.7" />
      <path d="M19 24 a8 8 0 0 1 6-2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

function Refrigerator3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fr-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fdfefe" />
          <stop offset="0.5" stopColor="#dfeaec" />
          <stop offset="1" stopColor="#b8ccce" />
        </linearGradient>
      </defs>
      {SHADOW}
      <rect x="12" y="3" width="24" height="41" rx="6" fill="url(#fr-body)" stroke="#9ab3b5" strokeWidth="0.8" />
      <rect x="13.5" y="4.5" width="5" height="38" rx="3" fill="#ffffff" opacity="0.5" />
      <line x1="12" y1="21" x2="36" y2="21" stroke="#a7bdbf" strokeWidth="1.3" />
      <rect x="30" y="9" width="2.4" height="8" rx="1.2" fill="#8aa6a8" />
      <rect x="30" y="25" width="2.4" height="11" rx="1.2" fill="#8aa6a8" />
    </svg>
  );
}

function AirConditioner3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ac-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cdeefb" />
        </linearGradient>
      </defs>
      {SHADOW}
      <rect x="5" y="13" width="38" height="18" rx="6" fill="url(#ac-body)" stroke="#9fd2ea" strokeWidth="0.8" />
      <rect x="6.5" y="14.5" width="35" height="6" rx="4" fill="#ffffff" opacity="0.5" />
      <line x1="10" y1="25" x2="38" y2="25" stroke="#bfe3f3" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10" y1="28" x2="38" y2="28" stroke="#bfe3f3" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="37" cy="18" r="1.4" fill="#5cc0e6" />
      <path d="M20 35 q3 4 6 0" stroke="#7fd2ef" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M28 35 q3 4 6 0" stroke="#7fd2ef" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Microwave3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="mw-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f8fb" />
          <stop offset="1" stopColor="#c9cedb" />
        </linearGradient>
        <linearGradient id="mw-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d4350" />
          <stop offset="1" stopColor="#191c24" />
        </linearGradient>
      </defs>
      {SHADOW}
      <rect x="4" y="12" width="40" height="24" rx="5" fill="url(#mw-body)" stroke="#aab0c0" strokeWidth="0.8" />
      <rect x="4" y="12" width="40" height="7" rx="5" fill="#ffffff" opacity="0.35" />
      <rect x="8" y="16" width="22" height="16" rx="3" fill="url(#mw-glass)" stroke="#8c93a6" strokeWidth="0.7" />
      <path d="M10 18 l6 6" stroke="#ffffff" strokeWidth="1.2" opacity="0.18" />
      <rect x="33" y="17" width="7" height="2.4" rx="1.2" fill="#9aa0b2" />
      <circle cx="34.5" cy="23" r="1.3" fill="#a8aebf" />
      <circle cx="38.5" cy="23" r="1.3" fill="#a8aebf" />
      <rect x="33" y="28" width="7" height="3" rx="1.5" fill="#e05a2b" />
    </svg>
  );
}

function Tv3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="tv-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c323d" />
          <stop offset="1" stopColor="#11141b" />
        </linearGradient>
      </defs>
      {SHADOW}
      <rect x="5" y="8" width="38" height="26" rx="4" fill="#2a2f39" />
      <rect x="7" y="10" width="34" height="22" rx="2.5" fill="url(#tv-screen)" />
      <path d="M10 30 L26 11 L31 11 L13 30 Z" fill="#ffffff" opacity="0.08" />
      <rect x="20" y="34" width="8" height="5" fill="#3a4150" />
      <rect x="14" y="39" width="20" height="2.6" rx="1.3" fill="#4a5263" />
    </svg>
  );
}

function AirPurifier3D() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ap-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbfdff" />
          <stop offset="0.5" stopColor="#e6edf3" />
          <stop offset="1" stopColor="#c6d3de" />
        </linearGradient>
      </defs>
      {SHADOW}
      <rect x="15" y="4" width="18" height="39" rx="9" fill="url(#ap-body)" stroke="#aebccb" strokeWidth="0.8" />
      <rect x="16.5" y="6" width="4" height="35" rx="2" fill="#ffffff" opacity="0.55" />
      <rect x="20" y="7.5" width="8" height="2.2" rx="1.1" fill="#c4d0db" />
      <circle cx="24" cy="25" r="7.5" fill="#eef3f8" stroke="#b3c2d0" strokeWidth="0.8" />
      <circle cx="24" cy="25" r="5.2" fill="none" stroke="#c2d0dd" strokeWidth="1" />
      <circle cx="24" cy="25" r="2.8" fill="none" stroke="#c2d0dd" strokeWidth="1" />
      <circle cx="24" cy="25" r="1.2" fill="#8aa0b3" />
      <circle cx="24" cy="37.5" r="1.6" fill="#37c98b" />
    </svg>
  );
}

const ICONS: Record<ApplianceIconId, () => React.ReactElement> = {
  washing_machine: WashingMachine3D,
  refrigerator: Refrigerator3D,
  air_conditioner: AirConditioner3D,
  microwave: Microwave3D,
  tv: Tv3D,
  air_purifier: AirPurifier3D,
};

export function Appliance3DIcon({ id, className = "" }: { id: ApplianceIconId; className?: string }) {
  const Icon = ICONS[id];
  return (
    <span className={`inline-block ${className}`}>
      <Icon />
    </span>
  );
}
