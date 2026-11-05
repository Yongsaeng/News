"use client";

import { useMemo, useState } from "react";
import { forget, useVocab } from "@/lib/vocab";

export default function WordList() {
  const vocab = useVocab();
  const [q, setQ] = useState("");
  const shown = useMemo(
    () => vocab.filter((v) => !q || v.word.includes(q) || v.meaning.includes(q)),
    [vocab, q],
  );

  if (vocab.length === 0) {
    return (
      <div className="mt-10 rounded-2xl bg-surface p-8 text-center">
        <p className="text-lg font-black">まだ単語がありません</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          記事の中で点線が引かれた言葉をタップし、「覚えた」を押すとここに追加されます。
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-3">
        <label htmlFor="word-search" className="sr-only">
          単語帳を検索
        </label>
        <input
          id="word-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="言葉や意味で検索"
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
        />
        <p className="shrink-0 text-sm text-muted tabular-nums">{vocab.length}語</p>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {shown.map((v) => (
          <li key={v.word} className="flex flex-col rounded-2xl bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-black">{v.word}</h2>
              <time className="shrink-0 text-[11px] text-faint tabular-nums" dateTime={v.learnedAt}>
                {new Date(v.learnedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" })}
              </time>
            </div>
            <p className="mt-2 text-[15px] leading-7">{v.meaning}</p>
            <div className="mt-auto flex items-end justify-between gap-3 pt-4">
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-xs text-faint hover:text-muted hover:underline"
              >
                {v.articleTitle}
              </a>
              <button
                type="button"
                onClick={() => forget(v.word)}
                className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-ink"
              >
                単語帳から外す
              </button>
            </div>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-sm text-muted">「{q}」に一致する言葉はありません。</p>}
      <p className="mt-8 text-xs leading-6 text-faint">
        単語帳はこの端末のブラウザに保存されます。外した言葉は、記事の中で再びタップできるようになります。
      </p>
    </>
  );
}
