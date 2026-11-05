/** 地平線から昇る朝日のマーク */
export default function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--signal)" />
      <path d="M5.5 15.5a6.5 6.5 0 0 1 13 0Z" fill="#0f1e3a" />
      <rect x="4" y="17.5" width="16" height="1.8" rx=".9" fill="#0f1e3a" />
    </svg>
  );
}
