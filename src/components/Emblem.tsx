export default function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="none" stroke="#D4AF52" strokeOpacity="0.35" strokeWidth="1.5" />
      <g fill="none" stroke="#D4AF52" strokeWidth="2" strokeLinejoin="round">
        <path d="M60 14 L70 46 L104 60 L70 74 L60 106 L50 74 L16 60 L50 46 Z" />
      </g>
      <g fill="none" stroke="#2FB8AF" strokeWidth="1.4" strokeLinejoin="round" opacity="0.85">
        <path d="M60 34 L66 52 L86 60 L66 68 L60 86 L54 68 L34 60 L54 52 Z" />
      </g>
      <circle cx="60" cy="60" r="7" fill="#F0D68C" />
    </svg>
  );
}
