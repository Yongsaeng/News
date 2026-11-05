import Link from "next/link";
import type { CategoryDigest, Digest, Insight, MarketQuote, NewsItem } from "@/lib/types";
import { formatDateJa } from "@/lib/digests";
import NewsImage from "./NewsImage";
import TermText from "./TermText";
import TermSheet from "./TermSheet";
import AskAI from "./AskAI";

const ACCENT: Record<string, string> = {
  economy: "var(--c-economy)",
  politics: "var(--c-politics)",
  tech: "var(--c-tech)",
  ai: "var(--c-ai)",
  markets: "var(--c-markets)",
  crime: "var(--c-crime)",
};

const SHORT: Record<string, string> = {
  economy: "経済",
  politics: "政治",
  tech: "テック",
  ai: "AI",
  markets: "株価",
  crime: "犯罪",
};

const nf = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function timeJa(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Source({ item, onImage = false }: { item: NewsItem; onImage?: boolean }) {
  const t = timeJa(item.publishedAt);
  return (
    <p className={`text-[11px] tracking-wide ${onImage ? "text-white/55" : "text-faint"}`}>
      {item.source}
      {item.region === "海外" && "（海外）"}
      {t && <span className="ml-2">{t}</span>}
    </p>
  );
}

function InsightBox({ insight, item, open = false }: { insight: Insight; item: NewsItem; open?: boolean }) {
  return (
    <details open={open} className="group mt-4 rounded-xl bg-insight-bg text-insight-ink">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[13px] font-bold">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-signal text-[11px] font-black text-band">考</span>
        考察：{insight.angle}
        <span className="ml-auto text-xs font-medium opacity-70 group-open:hidden">開く</span>
        <span className="ml-auto hidden text-xs font-medium opacity-70 group-open:inline">閉じる</span>
      </summary>
      <p className="px-4 pb-4 text-[14px] leading-7">
        <TermText text={insight.text} terms={item.terms} articleTitle={item.title} url={item.url} />
      </p>
    </details>
  );
}

function Masthead({ digest, categories }: { digest: Digest; categories: CategoryDigest[] }) {
  const updated = new Date(digest.generatedAt).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <>
      <header className="bg-band text-band-ink">
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 pt-5 pb-3 sm:px-6">
          <Link href="/" className="text-xl font-black tracking-tight sm:text-2xl">
            Morning Brief
          </Link>
          <div className="flex items-end gap-4">
            <p className="text-right text-xs text-band-ink/70 sm:text-sm">
              {formatDateJa(digest.date)}
              <span className="ml-2 hidden text-band-ink/50 sm:inline">{updated} 更新</span>
            </p>
            <Link
              href="/words"
              className="rounded-lg bg-band-ink/10 px-3 py-1.5 text-xs font-bold whitespace-nowrap hover:bg-band-ink/20"
            >
              単語帳
            </Link>
          </div>
        </div>
      </header>
      <nav className="sticky top-0 z-20 bg-band/95 text-band-ink backdrop-blur" aria-label="カテゴリ">
        <ul className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-5">
          {categories.map((c) => (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="relative block px-3 py-3 text-sm font-bold whitespace-nowrap text-band-ink/75 transition-colors hover:text-band-ink focus-visible:text-band-ink"
              >
                {c.name}
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full" style={{ background: ACCENT[c.id] }} />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function Hero({ item, cat }: { item: NewsItem; cat: CategoryDigest }) {
  return (
    <a
      href={`#${articleId(cat, item)}`}
      className="group relative mt-6 block overflow-hidden rounded-2xl bg-band"
    >
      <NewsImage
        src={item.image}
        accent={ACCENT[cat.id]}
        label={SHORT[cat.id]}
        className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[21/9]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <span
          className="inline-block rounded-md px-2 py-0.5 text-xs font-bold text-white"
          style={{ background: ACCENT[cat.id] }}
        >
          {cat.name}
        </span>
        <h1 className="mt-3 max-w-3xl text-2xl leading-snug font-black text-balance text-white sm:text-4xl sm:leading-tight">
          {item.title}
        </h1>
        <p className="mt-3 hidden max-w-2xl text-sm leading-7 text-white/80 sm:block">{item.summary[0]}</p>
        <div className="mt-3">
          <Source item={item} onImage />
        </div>
      </div>
    </a>
  );
}

function Brief({ lines, quotes }: { lines: string[]; quotes: MarketQuote[] }) {
  return (
    <section className="mt-6 grid items-start gap-4 md:grid-cols-[1.5fr_1fr]">
      {lines.length > 0 && (
        <div className="rounded-2xl bg-surface p-5 sm:p-6">
          <h2 className="text-base font-black">今日の3行</h2>
          <ul className="mt-3 space-y-3">
            {lines.map((l, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-7">
                <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-signal" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {quotes.length > 0 && (
        <div className="rounded-2xl bg-surface p-5 sm:p-6">
          <h2 className="text-base font-black">マーケット</h2>
          <table className="mt-2 w-full text-sm tabular-nums">
            <tbody>
              {quotes.map((q) => {
                const up = q.change >= 0;
                return (
                  <tr key={q.symbol} className="border-b border-line last:border-0">
                    <th className="py-2 text-left font-medium text-muted">{q.name}</th>
                    <td className="py-2 text-right font-bold">{nf.format(q.price)}</td>
                    <td className={`w-24 py-2 text-right text-xs font-bold ${up ? "text-up" : "text-down"}`}>
                      {up ? "+" : "−"}
                      {nf.format(Math.abs(q.changePercent))}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function articleId(cat: CategoryDigest, item: NewsItem) {
  return `${cat.id}-${cat.items.indexOf(item) + 1}`;
}

function LeadStory({ item, cat }: { item: NewsItem; cat: CategoryDigest }) {
  return (
    <article id={articleId(cat, item)} className="scroll-mt-16 overflow-hidden rounded-2xl bg-surface">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
        <NewsImage
          src={item.image}
          accent={ACCENT[cat.id]}
          label={SHORT[cat.id]}
          className="aspect-[16/9] w-full transition-opacity group-hover:opacity-90"
        />
        <div className="px-5 pt-5 sm:px-6">
          <h3 className="text-xl leading-snug font-black text-balance group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4 sm:text-2xl">
            {item.title}
          </h3>
          <div className="mt-2">
            <Source item={item} />
          </div>
        </div>
      </a>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <ul className="mt-3 space-y-1.5 text-[15px] leading-7 text-ink/85">
          {item.summary.map((s, i) => (
            <li key={i}>
              <TermText text={s} terms={item.terms} articleTitle={item.title} url={item.url} />
            </li>
          ))}
        </ul>
        {item.insight && <InsightBox insight={item.insight} item={item} open />}
        <AskAI item={item} />
      </div>
    </article>
  );
}

function StoryRow({ item, cat }: { item: NewsItem; cat: CategoryDigest }) {
  return (
    <article id={articleId(cat, item)} className="scroll-mt-16 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-snug font-bold group-hover:underline group-hover:underline-offset-4 sm:text-base">
            {item.title}
          </h3>
          <div className="mt-1.5">
            <Source item={item} />
          </div>
        </div>
        <NewsImage
          src={item.image}
          accent={ACCENT[cat.id]}
          label={SHORT[cat.id]}
          className="size-20 shrink-0 rounded-lg sm:size-24"
        />
      </a>
      <ul className="mt-2 space-y-1 text-[13px] leading-6 text-muted">
        {item.summary.map((s, i) => (
          <li key={i}>
            <TermText text={s} terms={item.terms} articleTitle={item.title} url={item.url} />
          </li>
        ))}
      </ul>
      {item.insight && <InsightBox insight={item.insight} item={item} />}
      <AskAI item={item} compact />
    </article>
  );
}

function Category({ cat }: { cat: CategoryDigest }) {
  const accent = ACCENT[cat.id];
  const [lead, ...rest] = cat.items;
  return (
    <section id={cat.id} className="pt-12">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full" style={{ background: accent }} />
        <h2 className="text-2xl font-black sm:text-3xl">{cat.name}</h2>
        {cat.items.length > 0 && <span className="text-sm text-faint">{cat.items.length}本</span>}
      </div>
      {cat.comment && <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">{cat.comment}</p>}
      {!lead ? (
        <p className="mt-6 text-sm text-muted">今日は該当するニュースがありませんでした。</p>
      ) : (
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
          <LeadStory item={lead} cat={cat} />
          {rest.length > 0 && (
            <div className="rounded-2xl bg-surface p-5 sm:p-6">
              {rest.map((item, i) => (
                <StoryRow key={i} item={item} cat={cat} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Archive({ all, current }: { all: Digest[]; current: string }) {
  if (all.length <= 1) return null;
  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="text-base font-black">過去のまとめ</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {all.slice(0, 30).map((d) => (
          <li key={d.date}>
            <Link
              href={d.date === all[0].date ? "/" : `/archive/${d.date}`}
              className={`block rounded-full px-3 py-1 text-sm tabular-nums ${
                d.date === current ? "bg-band text-band-ink" : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {d.date.slice(5).replace("-", "/")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** ヒーローにする記事：画像のある最初の記事（経済→政治→…の順） */
function pickHero(digest: Digest): { item: NewsItem; cat: CategoryDigest } | undefined {
  for (const cat of digest.categories) {
    const item = cat.items.find((i) => i.image);
    if (item) return { item, cat };
  }
  const cat = digest.categories.find((c) => c.items.length);
  return cat ? { item: cat.items[0], cat } : undefined;
}

export default function DigestView({ digest, all }: { digest: Digest; all: Digest[] }) {
  const hero = pickHero(digest);
  return (
    <>
      <Masthead digest={digest} categories={digest.categories} />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {digest.sample && (
          <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-2 text-center text-xs text-muted">
            表示中のデータはサンプルです。毎朝7時ごろに今日のまとめに置き換わります。
          </p>
        )}
        {hero && <Hero item={hero.item} cat={hero.cat} />}
        <Brief lines={digest.headline} quotes={digest.markets} />
        {digest.categories.map((c) => (
          <Category key={c.id} cat={c} />
        ))}
        <Archive all={all} current={digest.date} />
      </main>
      <TermSheet />
    </>
  );
}
