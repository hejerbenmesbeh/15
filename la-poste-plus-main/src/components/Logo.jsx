export function Logo({ variant = "dark", className = "" }) {
  const textColor = variant === "dark" ? "text-primary" : "text-white";
  const swooshColor = variant === "dark" ? "var(--primary)" : "#ffffff";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M4 26 C 10 8, 28 8, 36 22"
          stroke={swooshColor}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="22" y="24" width="6" height="6" fill="#F5A800" />
        <rect x="30" y="24" width="6" height="6" fill="#F5A800" />
      </svg>
      <div className={`leading-tight ${textColor}`}>
        <div className="text-sm font-extrabold tracking-tight">La Poste</div>
        <div className="text-[10px] font-medium opacity-80 -mt-0.5">Tunisienne</div>
      </div>
    </div>
  );
}