/** Logo sama persis dengan src/app/icon.svg, inline supaya tajam dan tanpa request tambahan. */
export function GuyubLogo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="guyub-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8804a" />
          <stop offset="100%" stopColor="#763816" />
        </linearGradient>
      </defs>
      <rect width="16" height="16" rx="3.5" fill="url(#guyub-logo-bg)" />
      <path d="M8 1.5 1 7.5V14.5H6V10H10V14.5H15V7.5L8 1.5Z" fill="#FFF8EE" />
      <path d="M6.4 10.4H9.6V14.5H6.4Z" fill="#0f766e" />
    </svg>
  );
}
