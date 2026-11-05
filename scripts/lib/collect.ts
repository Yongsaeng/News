import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import { CATEGORIES, MARKET_SYMBOLS, type CategoryConfig } from "../../src/lib/sources";
import type { CategoryId, MarketQuote } from "../../src/lib/types";

const MAX_CANDIDATES = 30; // 1カテゴリあたりの候補記事の上限
const MAX_AGE_HOURS = 36;
const UA = "Mozilla/5.0 (compatible; news-digest/1.0)";

export interface Candidate {
  title: string;
  snippet: string;
  source: string;
  url: string;
  region: "国内" | "海外";
  publishedAt?: string;
  image?: string;
}

export interface RawCategory {
  id: CategoryId;
  name: string;
  candidates: Candidate[];
}

/** data/raw/YYYY-MM-DD.json の形 */
export interface RawData {
  date: string;
  collectedAt: string;
  markets: MarketQuote[];
  categories: RawCategory[];
}

export const RAW_DIR = path.join(process.cwd(), "data", "raw");
export const DIGEST_DIR = path.join(process.cwd(), "data", "digests");

type FeedItem = Parser.Item & {
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } }[];
  mediaThumbnail?: { $?: { url?: string } }[];
  "content:encoded"?: string;
};

const parser: Parser<object, FeedItem> = new Parser({
  timeout: 15000,
  headers: { "User-Agent": UA },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

/** RSS の項目から画像URLを探す（enclosure → media:content → media:thumbnail → 本文中の img） */
function imageFromItem(item: FeedItem): string | undefined {
  const isImg = (u?: string, type?: string) =>
    !!u && /^https?:\/\//.test(u) && (type?.startsWith("image") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u));
  if (item.enclosure && isImg(item.enclosure.url, item.enclosure.type)) return item.enclosure.url;
  for (const m of item.mediaContent ?? []) {
    if (m.$?.url && (m.$.medium === "image" || isImg(m.$.url, m.$.type))) return m.$.url;
  }
  const thumb = item.mediaThumbnail?.[0]?.$?.url;
  if (thumb) return thumb;
  const html = item["content:encoded"] || item.content || "";
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m && /^https?:\/\//.test(m[1]) ? m[1] : undefined;
}

/** 元記事のページから og:image を読む（先頭 300KB だけ） */
async function ogImage(url: string): Promise<string | undefined> {
  if (/news\.google\.com/.test(url)) return undefined; // Google ニュースの転送ページには記事画像がない
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok || !res.body) return undefined;
    const reader = res.body.getReader();
    let html = "";
    const dec = new TextDecoder();
    while (html.length < 300_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    const m =
      html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!m) return undefined;
    const img = new URL(m[1].replace(/&amp;/g, "&"), res.url).toString();
    return /^https:\/\//.test(img) ? img : undefined;
  } catch {
    return undefined;
  }
}

/** 画像のない候補に og:image を補う（同時 8 件まで） */
async function fillImages(cands: Candidate[]): Promise<void> {
  const todo = cands.filter((c) => !c.image);
  let i = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (i < todo.length) {
        const c = todo[i++];
        c.image = await ogImage(c.url);
      }
    }),
  );
}

export function jstDate(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function clean(text = ""): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Google ニュースのタイトル末尾「 - 媒体名」を分離する */
function splitPublisher(title: string, fallback: string): { title: string; source: string } {
  const m = title.match(/^(.*) - ([^-]{1,40})$/);
  if (m && fallback.toLowerCase().includes("google")) return { title: m[1].trim(), source: m[2].trim() };
  return { title, source: fallback };
}

async function collectCategory(cat: CategoryConfig): Promise<Candidate[]> {
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
  const results = await Promise.allSettled(cat.feeds.map((f) => parser.parseURL(f.url).then((feed) => ({ f, feed }))));
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const r of results) {
    if (r.status === "rejected") {
      console.warn(`  [skip] ${cat.name}: ${String(r.reason).slice(0, 120)}`);
      continue;
    }
    const { f, feed } = r.value;
    for (const item of feed.items.slice(0, 20)) {
      if (!item.title || !item.link) continue;
      const ts = item.isoDate ? Date.parse(item.isoDate) : NaN;
      if (!Number.isNaN(ts) && ts < cutoff) continue;
      const { title, source } = splitPublisher(clean(item.title), f.name);
      const key = title.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title,
        snippet: clean(item.contentSnippet || item.content || "").slice(0, 300),
        source,
        url: item.link,
        region: f.region,
        publishedAt: item.isoDate,
        image: imageFromItem(item),
      });
    }
  }
  // 新しい順に並べ、国内と海外が偏らないよう交互に詰める
  out.sort((a, b) => Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0"));
  const dom = out.filter((c) => c.region === "国内");
  const intl = out.filter((c) => c.region === "海外");
  const mixed: Candidate[] = [];
  while (mixed.length < MAX_CANDIDATES && (dom.length || intl.length)) {
    if (dom.length) mixed.push(dom.shift()!);
    if (intl.length && mixed.length < MAX_CANDIDATES) mixed.push(intl.shift()!);
  }
  return mixed;
}

async function fetchQuote(symbol: string, name: string): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const result = json.chart?.result?.[0];
    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter((v: number | null) => v != null);
    const price: number = result?.meta?.regularMarketPrice ?? closes.at(-1);
    const prev: number = closes.length >= 2 ? closes.at(-2)! : result?.meta?.chartPreviousClose;
    if (price == null || prev == null) throw new Error("no data");
    const change = price - prev;
    return { symbol, name, price, change, changePercent: (change / prev) * 100 };
  } catch (e) {
    console.warn(`  [skip] ${name}: ${String(e).slice(0, 120)}`);
    return null;
  }
}

export async function collectAll(): Promise<RawData> {
  const date = jstDate();
  const markets = (await Promise.all(MARKET_SYMBOLS.map((s) => fetchQuote(s.symbol, s.name)))).filter(
    (q): q is MarketQuote => q !== null,
  );
  console.log(`  株価: ${markets.length}/${MARKET_SYMBOLS.length} 件`);
  const categories: RawCategory[] = [];
  for (const cat of CATEGORIES) {
    const candidates = await collectCategory(cat);
    await fillImages(candidates);
    const withImg = candidates.filter((c) => c.image).length;
    console.log(`  ${cat.name}: 候補 ${candidates.length} 件（画像あり ${withImg} 件）`);
    categories.push({ id: cat.id, name: cat.name, candidates });
  }
  return { date, collectedAt: new Date().toISOString(), markets, categories };
}

export function readRaw(date: string): RawData {
  return JSON.parse(fs.readFileSync(path.join(RAW_DIR, `${date}.json`), "utf8")) as RawData;
}
