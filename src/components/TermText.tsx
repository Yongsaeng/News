"use client";

import { Fragment } from "react";
import type { Term } from "@/lib/types";
import { openTerm, useVocab } from "@/lib/vocab";

/**
 * 文中の難しい言葉に点線を引き、タップで意味を出す。
 * 単語帳で「覚えた」言葉は普通の文字に戻る。
 */
export default function TermText({
  text,
  terms = [],
  articleTitle,
  url,
}: {
  text: string;
  terms?: Term[];
  articleTitle: string;
  url: string;
}) {
  const learned = useVocab();
  const live = terms
    .filter((t) => t.word && !learned.some((v) => v.word === t.word))
    .sort((a, b) => b.word.length - a.word.length);
  if (live.length === 0) return <>{text}</>;

  const parts: (string | Term)[] = [];
  let rest = text;
  while (rest) {
    let best: { i: number; t: Term } | null = null;
    for (const t of live) {
      const i = rest.indexOf(t.word);
      if (i >= 0 && (!best || i < best.i)) best = { i, t };
    }
    if (!best) {
      parts.push(rest);
      break;
    }
    if (best.i > 0) parts.push(rest.slice(0, best.i));
    parts.push(best.t);
    rest = rest.slice(best.i + best.t.word.length);
  }

  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => openTerm({ ...p, articleTitle, url })}
            data-term={p.word}
            data-meaning={p.meaning}
            data-title={articleTitle}
            data-url={url}
            className="cursor-pointer rounded-sm underline decoration-dotted decoration-2 underline-offset-[5px] [text-decoration-color:var(--signal)] hover:bg-signal/20 focus-visible:bg-signal/20 focus-visible:outline-none"
          >
            {p.word}
          </button>
        ),
      )}
    </>
  );
}
