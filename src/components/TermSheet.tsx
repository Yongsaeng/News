"use client";

import Link from "next/link";
import { useEffect } from "react";
import { learn, openTerm, useActiveTerm } from "@/lib/vocab";

/** タップした言葉の意味を画面下に出すシート */
export default function TermSheet() {
  const term = useActiveTerm();

  useEffect(() => {
    if (!term) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openTerm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [term]);

  if (!term) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="term-word">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-black/40" onClick={() => openTerm(null)} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl">
        <p className="text-xs font-bold text-muted">言葉の意味</p>
        <h2 id="term-word" className="mt-1 text-2xl font-black">
          {term.word}
        </h2>
        <p className="mt-3 text-[15px] leading-7">{term.meaning}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => {
              learn(term);
              openTerm(null);
            }}
            className="flex-1 rounded-xl bg-band px-4 py-3 text-sm font-bold text-band-ink hover:opacity-90"
          >
            覚えた（単語帳に追加）
          </button>
          <button
            type="button"
            onClick={() => openTerm(null)}
            className="rounded-xl border border-line px-4 py-3 text-sm font-bold text-muted hover:text-ink"
          >
            閉じる
          </button>
        </div>
        <p className="mt-4 text-xs text-faint">
          覚えた言葉は記事の中でタップできなくなります。
          <Link href="/words" className="ml-1 underline underline-offset-2" onClick={() => openTerm(null)}>
            単語帳を見る
          </Link>
        </p>
      </div>
    </div>
  );
}
