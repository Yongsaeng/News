"use client";

import { useState } from "react";
import { insightTexts, type NewsItem } from "@/lib/types";

const PRESETS = ["もっと分かりやすく説明して", "背景を教えて", "今後どうなりそう？"];

/** claude.ai を記事の内容と質問を入れた状態で開く（Proプランの範囲で使える） */
function promptBase(item: NewsItem) {
  return [
    "次のニュースについて質問です。日本語で、分かりやすく答えてください。",
    "",
    `見出し：${item.title}`,
    `要約：${item.summary.join(" ")}`,
    item.insight ? `考察（${item.insight.angle}）：${insightTexts(item.insight).join(" ")}` : "",
    `出典：${item.source} ${item.url}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

function askUrl(item: NewsItem, question: string) {
  return `https://claude.ai/new?q=${encodeURIComponent(`${promptBase(item)}\n\n質問：${question}`)}`;
}

export default function AskAI({ item, compact = false }: { item: NewsItem; compact?: boolean }) {
  const [q, setQ] = useState("");
  const id = `ask-${encodeURIComponent(item.url).slice(-24)}`;
  const go = (question: string) => {
    if (!question.trim()) return;
    window.open(askUrl(item, question.trim()), "_blank", "noopener,noreferrer");
    setQ("");
  };
  return (
    <form
      data-ask={promptBase(item)}
      className={compact ? "mt-3" : "mt-5"}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <label htmlFor={id} className="sr-only">
        この記事についてAIに質問
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 focus-within:border-ink/40">
        <span aria-hidden className="text-xs font-black text-muted">
          AI
        </span>
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="この記事についてAIに質問"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={!q.trim()}
          className="rounded-lg bg-band px-3 py-1.5 text-xs font-bold text-band-ink disabled:opacity-30"
        >
          聞く
        </button>
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-ink/40 hover:text-ink"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
