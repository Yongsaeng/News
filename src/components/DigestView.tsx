import Link from "next/link";
import type { CategoryDigest, Digest, MarketQuote, NewsItem } from "@/lib/types";
import { formatDateJa } from "@/lib/digests";

const ACCENT: Record<string, string> = {
  economy: "var(--c-economy)",
  politics: "var(--c-politics)",
  tech: "var(--c-tech)",
  markets: "var(--c-markets)",
  crime: "var(--c-crime)",
};

const nf = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

function Header({ digest }: { digest: Digest }) {
  const updated = new Date(digest.generatedAt).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <header className="pt-10 pb-8 sm:pt-16 sm:pb-10">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-muted uppercase">Morning Brief</p>
      <h1 className="mt-3 font-serif text-3xl leading-tight font-bold sm:text-5xl">{formatDateJa(digest.date)}</h1>
      <p className="mt-2 text-sm text-muted">{updated} 更新</p>
    </header>
  );
}

function Headline({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <section className="border-y border-line py-6 sm:py-8">
      <h2 className="text-xs font-semibold tracking-widest text-muted">今日のまとめ</h2>
      <ol className="mt-4 space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-4 font-serif text-lg leading-relaxed sm:text-xl">
            <span className="text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>{l}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Markets({ quotes }: { quotes: MarketQuote[] }) {
  if (!quotes.length) return null;
  return (
    <section className="-mx-4 mt-6 sm:mx-0" aria-label="マーケット">
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 sm:grid sm:grid-cols-5 sm:px-0">
        {quotes.map((q) => {
          const up = q.change >= 0;
          return (
            <div key={q.symbol} className="min-w-[9.5rem] rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs text-muted">{q.name}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{nf.format(q.price)}</p>
              <p className={`text-xs font-medium tabular-nums ${up ? "text-up" : "text-down"}`}>
                {up ? "▲" : "▼"} {nf.format(Math.abs(q.change))}
                <span className="ml-1.5 opacity-80">
                  {up ? "+" : "−"}
                  {nf.format(Math.abs(q.changePercent))}%
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoryNav({ categories }: { categories: CategoryDigest[] }) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 mt-8 border-b border-line bg-bg/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto py-3">
        {categories.map((c) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              className="block rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors hover:bg-surface"
            >
              <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: ACCENT[c.id] }} />
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Meta({ item }: { item: NewsItem }) {
  return (
    <p className="flex items-center gap-2 text-[11px] text-muted">
      <span className="rounded border border-line px-1.5 py-0.5">{item.region}</span>
      <span>{item.source}</span>
    </p>
  );
}

function Summary({ lines }: { lines: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-ink/85">
      {lines.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-muted" />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function ReadMore({ url, accent }: { url: string; accent: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
      style={{ color: accent }}
    >
      元記事を読む →
    </a>
  );
}

function Category({ cat, index }: { cat: CategoryDigest; index: number }) {
  const accent = ACCENT[cat.id];
  const [lead, ...rest] = cat.items;
  return (
    <section id={cat.id} className="pt-12">
      <div className="flex items-baseline gap-3 border-b-2 pb-3" style={{ borderColor: accent }}>
        <span className="font-serif text-sm tabular-nums" style={{ color: accent }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{cat.name}</h2>
      </div>
      {cat.comment && (
        <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm leading-relaxed">
          <span className="mr-2 font-semibold" style={{ color: accent }}>
            市況
          </span>
          {cat.comment}
        </p>
      )}
      {!lead ? (
        <p className="mt-6 text-sm text-muted">今日は該当するニュースがありませんでした。</p>
      ) : (
        <>
          <article className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <Meta item={lead} />
            <h3 className="mt-3 font-serif text-xl leading-snug font-bold sm:text-2xl">{lead.title}</h3>
            <Summary lines={lead.summary} />
            <ReadMore url={lead.url} accent={accent} />
          </article>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {rest.map((item, i) => (
              <article key={i} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <Meta item={item} />
                <h3 className="mt-2.5 font-serif text-lg leading-snug font-bold">{item.title}</h3>
                <Summary lines={item.summary} />
                <div className="mt-auto">
                  <ReadMore url={item.url} accent={accent} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Archive({ all, current }: { all: Digest[]; current: string }) {
  if (all.length <= 1) return null;
  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="text-xs font-semibold tracking-widest text-muted">過去のまとめ</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {all.slice(0, 30).map((d) => (
          <li key={d.date}>
            <Link
              href={d.date === all[0].date ? "/" : `/archive/${d.date}`}
              className={`block rounded-full border px-3 py-1 text-sm tabular-nums ${
                d.date === current ? "border-ink" : "border-line text-muted hover:text-ink"
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

export default function DigestView({ digest, all }: { digest: Digest; all: Digest[] }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-8">
      {digest.sample && (
        <p className="mt-4 rounded-lg border border-dashed border-line px-4 py-2 text-center text-xs text-muted">
          表示中のデータはサンプルです。毎朝7時ごろに今日のまとめに置き換わります。
        </p>
      )}
      <Header digest={digest} />
      <Headline lines={digest.headline} />
      <Markets quotes={digest.markets} />
      <CategoryNav categories={digest.categories} />
      {digest.categories.map((c, i) => (
        <Category key={c.id} cat={c} index={i} />
      ))}
      <Archive all={all} current={digest.date} />
    </main>
  );
}
