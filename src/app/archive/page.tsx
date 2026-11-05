import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";
import { formatDateJa, listDigests } from "@/lib/digests";

export const metadata: Metadata = { title: "過去のまとめ | Morning Brief" };

export default function ArchiveIndex() {
  const all = listDigests();
  return (
    <>
      <header className="bg-band text-band-ink">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-3 pb-3 sm:px-6 sm:pt-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight sm:text-2xl">
            <Logo />
            Morning Brief
          </Link>
          <Link href="/" className="hidden rounded-lg bg-band-ink/10 px-3 py-1.5 text-xs font-bold hover:bg-band-ink/20 lg:block">
            今日のニュースへ
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-28 sm:px-6 lg:pb-24">
        <h1 className="text-2xl font-black sm:text-3xl">過去のまとめ</h1>
        {all.length === 0 ? (
          <p className="mt-6 text-sm text-muted">まだまとめがありません。毎朝7時ごろに届きます。</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {all.map((d, i) => {
              const count = d.categories.reduce((n, c) => n + c.items.length, 0);
              return (
                <li key={d.date}>
                  <Link
                    href={i === 0 ? "/" : `/archive/${d.date}`}
                    className="block rounded-3xl bg-surface p-5 active:opacity-70 sm:rounded-2xl"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-black">{formatDateJa(d.date)}</p>
                      <p className="shrink-0 text-xs text-faint">
                        {i === 0 ? "今日・" : ""}
                        {count}本
                      </p>
                    </div>
                    {d.headline[0] && <p className="mt-2 text-[14px] leading-6 text-muted">{d.headline[0]}</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <BottomNav active="archive" />
    </>
  );
}
