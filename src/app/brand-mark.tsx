type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return <div className={`brand-lockup${compact ? " compact" : ""}`} aria-label="FORBAIR — Build More Good Days">
    <svg className="brand-mark" viewBox="0 0 72 72" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="forbair-growth" x1="12" y1="60" x2="62" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#176b46" />
          <stop offset="1" stopColor="#a6ef67" />
        </linearGradient>
      </defs>
      <path d="M19 61V16c0-3 2-5 5-5h26" fill="none" stroke="url(#forbair-growth)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 35h21" fill="none" stroke="url(#forbair-growth)" strokeWidth="9" strokeLinecap="round" />
      <path d="M48 11c7-6 12-4 14-10-8 0-14 3-14 10Z" fill="#a6ef67" />
      <path d="M40 12c-2-7-7-9-11-10 1 7 5 11 11 10Z" fill="#64c96f" />
    </svg>
    <div className="brand-copy"><strong>FORBAIR</strong>{!compact && <span>Build More Good Days.</span>}</div>
  </div>;
}
