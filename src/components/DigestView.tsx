import Link from "next/link";
import type { CategoryDigest, Digest, Insight, MarketQuote, NewsItem } from "@/lib/types";
import { formatDateJa } from "@/lib/digests";
import NewsImage from "./NewsImage";
import TermText from "./TermText";
import TermSheet from "./TermSheet";
import AskAI from "./AskAI";
import BottomNav from "./BottomNav";
import Logo from "./Logo";

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
      {t && <span className="ml-2">{t}</span>}
    </p>
  );
}

const LEVEL_BARS: Record<string, number> = { 大: 3, 中: 2, 小: 1 };

function ImpactMeter({ level }: { level: string }) {
  const n = LEVEL_BARS[level] ?? 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold" aria-label={`影響 ${level}`}>
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[4px] rounded-[1px] ${i <= n ? "bg-signal" : "bg-insight-ink/20"}`}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      <span aria-hidden>影響 {level}</span>
    </span>
  );
}

function InsightBox({ insight, item, open = false }: { insight: Insight; item: NewsItem; open?: boolean }) {
  const t = (text: string) => <TermText text={text} terms={item.terms} articleTitle={item.title} url={item.url} />;
  return (
    <details open={open} className="group mt-4 rounded-2xl bg-insight-bg text-insight-ink">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2.5 text-[13px] font-bold select-none">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-signal text-[11px] font-black text-band">考</span>
        考察
        <span className="font-medium opacity-70">{insight.angle}</span>
        <span className="ml-auto text-xs font-medium opacity-70 group-open:hidden">開く</span>
        <span className="ml-auto hidden text-xs font-medium opacity-70 group-open:inline">閉じる</span>
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <div>
          <h4 className="text-[12px] font-black opacity-75">何が起きた</h4>
          <p className="mt-1 text-[14px] leading-7">{t(insight.what)}</p>
        </div>
        <div>
          <h4 className="text-[12px] font-black opacity-75">なぜ起きた</h4>
          <p className="mt-1 text-[14px] leading-7">{t(insight.why)}</p>
        </div>
        <div>
          <h4 className="text-[12px] font-black opacity-75">
            {insight.angle === "日本への影響" ? "日本への影響" : "誰にどう影響する？"}
          </h4>
          <ul className="mt-2 space-y-2">
            {insight.points.map((p, i) => (
              <li key={i} className="rounded-xl bg-surface/70 px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[14px] font-black">{p.label}</p>
                  <div className="ml-auto flex items-center gap-2.5">
                    <ImpactMeter level={p.level} />
                    <span className="rounded-full border border-insight-ink/25 px-2 py-px text-[11px] font-bold">{p.when}</span>
                  </div>
                </div>
                <p className="mt-1 text-[13px] leading-6">{t(p.text)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3 border-t border-insight-ink/15 pt-3">
          <span aria-hidden className="mt-1 h-4 w-1 shrink-0 rounded-full bg-signal" />
          <p className="text-[13px] leading-6">
            <span className="font-black">今後の注目点　</span>
            {t(insight.watch)}
          </p>
        </div>
      </div>
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3 pb-1 sm:px-6 sm:pt-5 sm:pb-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight sm:text-2xl">
            <Logo />
            Morning Brief
          </Link>
          <div className="flex items-center gap-4">
            <p className="text-right text-xs text-band-ink/70 sm:text-sm">
              {formatDateJa(digest.date)}
              <span className="ml-2 hidden text-band-ink/50 sm:inline">{updated} 更新</span>
            </p>
            <nav className="hidden items-center gap-1 lg:flex" aria-label="ページ">
              <Link href="/archive" className="rounded-lg px-3 py-1.5 text-xs font-bold text-band-ink/80 hover:bg-band-ink/10">
                過去のまとめ
              </Link>
              <Link href="/words" className="rounded-lg bg-band-ink/10 px-3 py-1.5 text-xs font-bold hover:bg-band-ink/20">
                単語帳
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <nav className="sticky top-0 z-20 bg-band/95 text-band-ink backdrop-blur" aria-label="カテゴリ">
        <ul className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                className="flex items-center gap-1.5 rounded-full bg-band-ink/10 px-3.5 py-1.5 text-[13px] font-bold whitespace-nowrap text-band-ink/85 transition-colors hover:bg-band-ink/20 active:bg-band-ink/25"
              >
                <span className="size-1.5 rounded-full" style={{ background: ACCENT[c.id] }} />
                {SHORT[c.id]}
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
      className="group relative mt-4 block overflow-hidden rounded-3xl bg-band active:scale-[0.99] sm:mt-6 sm:rounded-2xl"
    >
      <NewsImage
        src={item.image}
        accent={ACCENT[cat.id]}
        label={SHORT[cat.id]}
        className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[21/9]"
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
    <section className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-4">
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
        <div className="md:rounded-2xl md:bg-surface md:p-6">
          <h2 className="text-base font-black">マーケット</h2>
          <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 md:mx-0 md:mt-2 md:block md:px-0">
            {quotes.map((q) => {
              const up = q.change >= 0;
              return (
                <li
                  key={q.symbol}
                  className="w-36 shrink-0 snap-start rounded-2xl bg-surface p-3.5 tabular-nums md:flex md:w-auto md:items-baseline md:gap-3 md:rounded-none md:border-b md:border-line md:bg-transparent md:px-0 md:py-2 md:last:border-0"
                >
                  <p className="text-xs font-medium text-muted md:flex-1 md:text-sm">{q.name}</p>
                  <p className="mt-1 text-lg font-black md:mt-0 md:text-sm md:font-bold">{nf.format(q.price)}</p>
                  <p className={`text-xs font-bold md:w-20 md:text-right ${up ? "text-up" : "text-down"}`}>
                    {up ? "+" : "−"}
                    {nf.format(Math.abs(q.changePercent))}%
                  </p>
                </li>
              );
            })}
          </ul>
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
    <article id={articleId(cat, item)} className="scroll-mt-16 overflow-hidden rounded-3xl bg-surface sm:rounded-2xl">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block active:opacity-80">
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
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex gap-4 active:opacity-70">
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

function RegionBlock({ cat, region, items }: { cat: CategoryDigest; region: "国内" | "海外"; items: NewsItem[] }) {
  const [lead, ...rest] = items;
  return (
    <div className={`min-w-0 ${region === "国内" ? "region-domestic" : "region-overseas"}`}>
      <div className="mb-3 hidden items-center gap-2 lg:flex">
        <h3 className="rounded-md bg-band px-2.5 py-1 text-xs font-black text-band-ink">{region}</h3>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-faint">{items.length}本</span>
      </div>
      {!lead ? (
        <p className="rounded-2xl bg-surface p-5 text-sm text-muted">今日は{region}の該当ニュースがありませんでした。</p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <LeadStory item={lead} cat={cat} />
          {rest.length > 0 && (
            <div className="rounded-3xl bg-surface p-5 sm:rounded-2xl sm:p-6">
              {rest.map((item, i) => (
                <StoryRow key={i} item={item} cat={cat} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** スマホでは国内／海外をタブで切り替え（JSなしで動くようラジオボタン＋CSS）。PCでは左右に並べる */
function RegionTabs({ cat, counts }: { cat: CategoryDigest; counts: [number, number] }) {
  return (
    <div className="region-tabs mt-4 grid grid-cols-2 rounded-xl bg-line/70 p-1 lg:hidden" role="radiogroup" aria-label={`${cat.name}の地域`}>
      {(["国内", "海外"] as const).map((r, i) => (
        <label
          key={r}
          className="flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-bold text-muted transition-colors has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
        >
          <input type="radio" name={`region-${cat.id}`} value={r} defaultChecked={i === 0} className="sr-only" />
          {r}
          <span className="text-xs font-medium text-faint">{counts[i]}</span>
        </label>
      ))}
    </div>
  );
}

function Category({ cat }: { cat: CategoryDigest }) {
  const accent = ACCENT[cat.id];
  const domestic = cat.items.filter((i) => i.region === "国内");
  const overseas = cat.items.filter((i) => i.region === "海外");
  return (
    <section id={cat.id} className="region-switch pt-10 sm:pt-12">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full" style={{ background: accent }} />
        <h2 className="text-2xl font-black sm:text-3xl">{cat.name}</h2>
        {cat.items.length > 0 && <span className="text-sm text-faint">{cat.items.length}本</span>}
      </div>
      {cat.comment && <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted">{cat.comment}</p>}
      {cat.items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">今日は該当するニュースがありませんでした。</p>
      ) : (
        <>
          <RegionTabs cat={cat} counts={[domestic.length, overseas.length]} />
          <div className="mt-4 grid items-start gap-8 lg:mt-5 lg:grid-cols-2 lg:gap-6">
            <RegionBlock cat={cat} region="国内" items={domestic} />
            <RegionBlock cat={cat} region="海外" items={overseas} />
          </div>
        </>
      )}
    </section>
  );
}

function Archive({ all, current }: { all: Digest[]; current: string }) {
  if (all.length <= 1) return null;
  return (
    <section className="mt-16 hidden border-t border-line pt-8 lg:block">
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
  const isToday = digest.date === all[0]?.date;
  return (
    <>
      <Masthead digest={digest} categories={digest.categories} />
      <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:pb-24">
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
      <BottomNav active={isToday ? "today" : "archive"} />
      <TermSheet />
    </>
  );
}
