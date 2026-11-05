import type { Metadata } from "next";
import Link from "next/link";
import WordList from "@/components/WordList";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "単語帳 | Morning Brief" };

export default function WordsPage() {
  return (
    <>
      <header className="bg-band text-band-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3 pb-3 sm:px-6 sm:pt-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight sm:text-2xl">
            <Logo />
            Morning Brief
          </Link>
          <Link href="/" className="hidden rounded-lg bg-band-ink/10 px-3 py-1.5 text-xs font-bold hover:bg-band-ink/20 lg:block">
            今日のニュースへ
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:pb-24">
        <h1 className="text-2xl font-black sm:text-3xl">単語帳</h1>
        <p className="mt-2 text-sm text-muted">記事で覚えた言葉の一覧です。新しく覚えた順に並んでいます。</p>
        <WordList />
      </main>
      <BottomNav active="words" />
    </>
  );
}
