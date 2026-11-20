/** ResQLink mark: a plus (aid) with a signal dot (link). Matches favicon.svg. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1E4FD6" />
      <path d="M16 8v16M8 16h16" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="24.5" cy="7.5" r="3" fill="#D92D20" stroke="#0E1828" strokeWidth="1.5" />
    </svg>
  )
}
