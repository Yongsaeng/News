import Link from "next/link";

type Tab = "today" | "archive" | "words";

const TABS: { id: Tab; href: string; label: string; icon: React.ReactNode }[] = [
  {
    id: "today",
    href: "/",
    label: "今日",
    icon: (
      <>
        <path d="M5 16a7 7 0 0 1 14 0" />
        <path d="M3 19.5h18" />
        <path d="M12 4.5v2.5M5.6 7.6l1.7 1.7M18.4 7.6l-1.7 1.7" />
      </>
    ),
  },
  {
    id: "archive",
    href: "/archive",
    label: "過去",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
  },
  {
    id: "words",
    href: "/words",
    label: "単語帳",
    icon: (
      <>
        <path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16Z" />
        <path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19M9 8h6" />
      </>
    ),
  },
];

/** スマホ用の下部タブ（アプリのような移動） */
export default function BottomNav({ active }: { active: Tab }) {
  return (
    <nav
      aria-label="メニュー"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors active:opacity-60 ${
                  on ? "text-ink" : "text-faint"
                }`}
              >
                <span className="relative">
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {t.icon}
                  </svg>
                  {on && <span className="absolute -top-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-signal" />}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
