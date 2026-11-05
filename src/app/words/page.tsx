import type { Metadata } from "next";
import Link from "next/link";
import WordList from "@/components/WordList";

export const metadata: Metadata = { title: "単語帳 | Morning Brief" };

export default function WordsPage() {
  return (
    <>
      <header className="bg-band text-band-ink">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pt-5 pb-4 sm:px-6">
          <Link href="/" className="text-xl font-black tracking-tight sm:text-2xl">
            Morning Brief
          </Link>
          <Link href="/" className="rounded-lg bg-band-ink/10 px-3 py-1.5 text-xs font-bold hover:bg-band-ink/20">
            今日のニュースへ
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
        <h1 className="text-3xl font-black">単語帳</h1>
        <p className="mt-2 text-sm text-muted">記事で覚えた言葉の一覧です。新しく覚えた順に並んでいます。</p>
        <WordList />
      </main>
    </>
  );
}
