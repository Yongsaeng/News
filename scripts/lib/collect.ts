import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import { CATEGORIES, MARKET_SYMBOLS, TDNET_MAJOR, type CategoryConfig, type Feed } from "../../src/lib/sources";
import type { CategoryId, MarketQuote } from "../../src/lib/types";

const MAX_CANDIDATES = 40; // 1カテゴリあたりの候補記事の上限
const PER_FEED = 15; // 1フィードから使う記事の上限（Feed.limit で変更可）
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
  /** 有料・会員制のソース。見出し・URL・配信日時・ソース名だけを持つ */
  paywalled?: true;
}

export interface RawCategory {
  id: CategoryId;
  name: string;
  candidates: Candidate[];
  /** 取得件数（重複を除く前と後） */
  stats?: CategoryStats;
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

/** 小さいサムネイルを大きいサイズのURLに置き換える（BBC など） */
function upscale(url: string): string {
  return url.replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, "$1976/");
}

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
  if (/\.pdf(\?|$)/i.test(url)) return undefined; // TDnet の開示資料（PDF）
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

/**
 * Google ニュースの転送URL（news.google.com/rss/articles/…）から元記事のURLを求める。
 * 転送ページに埋め込まれた署名と時刻を使い、Google ニュース自身の変換APIに問い合わせる。
 */
let gnewsBlocked = false;
async function decodeGoogleNews(url: string): Promise<string | undefined> {
  const id = url.match(/news\.google\.com\/(?:rss\/)?articles\/([^?/]+)/)?.[1];
  if (!id || gnewsBlocked) return undefined;
  try {
    const page = await fetch(`https://news.google.com/rss/articles/${id}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (page.status === 429) gnewsBlocked = true;
    if (!page.ok) return undefined;
    const html = await page.text();
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sg || !ts) return undefined;
    const inner = JSON.stringify([
      "garturlreq",
      [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      id,
      Number(ts),
      sg,
    ]);
    const res = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "f.req=" + encodeURIComponent(JSON.stringify([[["Fbv4je", inner, null, "generic"]]])),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429) gnewsBlocked = true;
    if (!res.ok) return undefined;
    const text = await res.text();
    const part = text.split("\n\n")[1];
    const decoded = JSON.parse(JSON.parse(part)[0][2])[1];
    return typeof decoded === "string" && /^https?:\/\//.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export const IMAGE_STATS = { googleLinks: 0, decoded: 0, images: 0 };

/** 画像のない候補に og:image を補う（同時 6 件まで）。Google ニュース経由は元記事URLに直してから読む */
async function fillImages(cands: Candidate[]): Promise<void> {
  const todo = cands.filter((c) => !c.image && !c.paywalled); // 有料記事のページは開かない
  let i = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (i < todo.length) {
        const c = todo[i++];
        if (/news\.google\.com/.test(c.url)) {
          IMAGE_STATS.googleLinks++;
          const real = await decodeGoogleNews(c.url);
          if (!real) continue;
          IMAGE_STATS.decoded++;
          c.url = real; // 元記事へ直接リンクする
        }
        c.image = await ogImage(c.url);
        if (c.image) IMAGE_STATS.images++;
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
function splitPublisher(title: string, feed: Feed): { title: string; source: string; publisher?: string } {
  if (!/news\.google\.com/.test(feed.url)) return { title, source: feed.name };
  const m = title.match(/^(.*) - ([^-]{1,40})$/);
  if (!m) return { title, source: feed.name };
  const publisher = m[2].trim();
  // 「見出し：時事ドットコム」「見出し - 媒体名」のように媒体名が重なっている飾りを外す
  const head = m[1].replace(/\s*[：:]\s*時事ドットコム$/, "").replace(/^画像・写真[：:]/, "").trim();
  const dupSuffix = ` - ${publisher}`;
  const headClean = head.endsWith(dupSuffix) ? head.slice(0, -dupSuffix.length).trim() : head;
  // 見出しが媒体名だけのもの（「- Anthropic」など、記事ではないページ）は使わない
  if (headClean.length < 4 || headClean.replace(/^-\s*/, "") === publisher) return { title: "", source: feed.name };
  // 「Google ニュース」のようなまとめフィードは媒体名を、ソースを決めたフィードはソース名を使う
  return { title: headClean, source: /google/i.test(feed.name) ? publisher : feed.name, publisher };
}

// ---------------------------------------------------------------------------
// 重複を除く
// ---------------------------------------------------------------------------

/** 元の配信社（通信社・大手紙）。重複したときはこれを優先して残す */
const ORIGINAL_SOURCES =
  /共同|47NEWS|時事|ロイター|Reuters|\bAP\b|Associated Press|Bloomberg|ブルームバーグ|日本経済新聞|日経|NHK/i;
/** 他社記事のまとめ（同じ記事が何度も出やすい） */
const AGGREGATORS = /Yahoo|Google/i;

interface Entry extends Candidate {
  feed: string;
  rank: number;
  /** URL が同じときだけ重複とみなす（TDnet の開示は会社が違っても見出しが似るため） */
  urlOnly?: boolean;
}

function rankOf(c: Candidate, feed: Feed): number {
  let r = 0;
  if (ORIGINAL_SOURCES.test(c.source)) r += 4;
  else if (!AGGREGATORS.test(c.source) && !AGGREGATORS.test(feed.name)) r += 2;
  if (!c.paywalled) r += 1; // 同じ配信社どうしなら無料で読めるほう
  if (c.snippet) r += 0.5;
  return r;
}

/** URL を比べやすい形にする（追跡用のパラメータ・末尾の / などを除く） */
export function normUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|fbclid$|gclid$|ncid$|taid$|cmpid$|mod$|smid$|rss)/i.test(k)) url.searchParams.delete(k);
    }
    return (url.host.replace(/^www\./, "") + url.pathname.replace(/\/+$/, "") + url.search).toLowerCase();
  } catch {
    return u;
  }
}

/** 見出しを比べやすい形にする（記号・空白・【速報】などの飾りを除く） */
export function normTitle(t: string): string {
  return t
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^◎/, "")
    .replace(/【(速報|独自|詳報|更新|動画|写真|解説|続報|号外|news|ニュース)】|\[(速報|独自|動画)\]/gi, "")
    .replace(/\s*[|｜]\s*[^|｜]{1,30}$/, "")
    .replace(/[（(][^）)]{1,10}[）)]$/, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** 見出しの似ている度合い（0〜1、文字の2文字組の一致率） */
export function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // 数字（価格・件数など）が違う見出しは、別の時点・別の出来事のことが多いので、ほぼ同じ文面のときだけ重複とみなす
  const nums = (t: string) => (t.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");
  const numPenalty = nums(a) !== nums(b) ? 0.2 : 0;
  const short = a.length < b.length ? a : b;
  const long = a.length < b.length ? b : a;
  if (short.length >= 12 && long.includes(short)) return 0.95 - numPenalty;
  const A = bigrams(a);
  const B = bigrams(b);
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return (2 * n) / (A.size + B.size || 1) - numPenalty;
}

const SIMILAR = 0.7;

/** 重複としてまとめた例（試し実行の確認用） */
export const MERGED: { category: string; kept: string; dropped: string }[] = [];

function dedupe(entries: Entry[], category: string): Entry[] {
  const sorted = [...entries].sort((a, b) => b.rank - a.rank);
  const kept: (Entry & { nu: string; nt: string; day: string })[] = [];
  for (const e of sorted) {
    const nu = normUrl(e.url);
    const nt = normTitle(e.title);
    const day = e.publishedAt ? jstDate(new Date(e.publishedAt)) : "";
    const dup = kept.find(
      (k) =>
        k.nu === nu ||
        (!k.urlOnly && !e.urlOnly && (!k.day || !day || k.day === day) && titleSimilarity(k.nt, nt) >= SIMILAR),
    );
    if (dup) {
      MERGED.push({ category, kept: `${dup.title}（${dup.source}）`, dropped: `${e.title}（${e.source}）` });
      continue;
    }
    kept.push({ ...e, nu, nt, day });
  }
  return kept.map(({ nu: _nu, nt: _nt, day: _day, ...e }) => e);
}

// ---------------------------------------------------------------------------
// フィードの取得
// ---------------------------------------------------------------------------

const HN_MIN_POINTS = 100; // Hacker News はこのポイント以上の記事だけ使う

/** Hacker News 公式API：トップ記事のうちポイント上位 */
async function fetchHackerNews(feed: Feed): Promise<Candidate[]> {
  const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ids = ((await res.json()) as number[]).slice(0, 40);
  const items = await Promise.all(
    ids.map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(10000) })
        .then((r) => r.json())
        .catch(() => null),
    ),
  );
  return items
    .filter((it) => it && it.type === "story" && it.title && (it.score ?? 0) >= HN_MIN_POINTS)
    .sort((a, b) => b.score - a.score)
    .map((it) => ({
      title: clean(it.title),
      snippet: `Hacker News で ${it.score} ポイント・コメント ${it.descendants ?? 0} 件`,
      source: feed.name,
      url: it.url || `https://news.ycombinator.com/item?id=${it.id}`,
      region: feed.region,
      publishedAt: new Date(it.time * 1000).toISOString(),
    }));
}

const FEED_TIMEOUT_MS = 30_000;

/** 応答が返ってこないフィードで収集全体が止まらないよう、時間を区切る */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms / 1000}s`)), ms).unref())]);
}

/** 配信日時のない項目（警察庁など）は URL 中の日付（…/20261106001.html など）を使う */
function dateFromUrl(url: string): string | undefined {
  const m = url.match(/(20\d{2})[-/]?(0[1-9]|1[0-2])[-/]?(0[1-9]|[12]\d|3[01])(?:\d{0,4})(?:[./]|$)/);
  if (!m) return undefined;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T09:00:00+09:00`).toISOString();
}

/**
 * TDnet 公式の開示一覧（I_list_001_YYYYMMDD.html から 100 件ずつ）を、今日と前日の分だけ読む。
 * 主要企業（TDNET_MAJOR）の開示だけを、タイトル・PDFのURL・時刻・会社名で返す（本文は取らない）
 */
async function fetchTdnet(feed: Feed): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const days = [jstDate(), jstDate(new Date(Date.now() - 864e5))];
  const strip = (h: string) => clean(h.replace(/&amp;/g, "&").replace(/&nbsp;/g, " "));
  let pages = 0;
  for (const day of days) {
    const ymd = day.replace(/-/g, "");
    for (let page = 1; page <= 20; page++) {
      const url = `${feed.url}I_list_${String(page).padStart(3, "0")}_${ymd}.html`;
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) break;
      pages++;
      const html = await res.text();
      const rows = html.split(/<tr[\s>]/i).slice(1);
      let found = 0;
      for (const row of rows) {
        const cell = (k: string) => row.match(new RegExp(`class="[^"]*${k}[^"]*"[^>]*>([\\s\\S]*?)</td>`, "i"))?.[1] ?? "";
        const time = strip(cell("kjTime"));
        const code = strip(cell("kjCode")).slice(0, 4);
        if (!/^\d{1,2}:\d{2}$/.test(time) || !code) continue;
        found++;
        const company = TDNET_MAJOR[code];
        if (!company) continue;
        const titleCell = cell("kjTitle");
        const href = titleCell.match(/href="([^"]+)"/i)?.[1];
        const title = strip(titleCell);
        if (!href || !title) continue;
        out.push({
          title: `${company}：${title}`,
          snippet: "",
          source: feed.name,
          url: new URL(href, url).toString(),
          region: feed.region,
          publishedAt: new Date(`${day}T${time.padStart(5, "0")}:00+09:00`).toISOString(),
        });
      }
      if (found < 100) break; // 最後のページ
    }
  }
  if (pages === 0) throw new Error("開示一覧ページを取得できませんでした");
  return out;
}

async function fetchFeed(feed: Feed): Promise<Candidate[]> {
  if (feed.via === "hn") return fetchHackerNews(feed);
  if (feed.via === "tdnet") return fetchTdnet(feed);
  const parsed = await parser.parseURL(feed.url);
  const out: Candidate[] = [];
  for (const item of parsed.items) {
    if (!item.title || !item.link) continue;
    const { title, source, publisher } = splitPublisher(clean(item.title), feed);
    if (!title || /^[-–—]\s/.test(title)) continue; // 見出しが空・媒体名だけのページ
    if (feed.match && !feed.match.test(title)) continue;
    if (feed.publisher && !(publisher && feed.publisher.test(publisher))) continue;
    const publishedAt = item.isoDate ?? dateFromUrl(item.link);
    if (feed.paywalled) {
      // 有料・会員制：見出し・URL・配信日時・ソース名だけ（本文や画像は取らない）
      out.push({ title, snippet: "", source, url: item.link, region: feed.region, publishedAt, paywalled: true });
      continue;
    }
    const img = imageFromItem(item);
    out.push({
      title,
      snippet: clean(item.contentSnippet || item.content || "").slice(0, 300),
      source,
      url: item.link,
      region: feed.region,
      publishedAt,
      image: img ? upscale(img) : undefined,
    });
  }
  return out;
}

export interface CategoryStats {
  /** 取得した件数（重複を除く前） */
  fetched: number;
  /** 重複を除いた後の件数 */
  unique: number;
  /** フィードごとの取得件数（取得失敗は -1） */
  feeds: Record<string, number>;
}

async function collectCategory(cat: CategoryConfig): Promise<{ candidates: Candidate[]; stats: CategoryStats }> {
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
  const results = await Promise.allSettled(cat.feeds.map((f) => withTimeout(fetchFeed(f), FEED_TIMEOUT_MS)));
  const all: Entry[] = [];
  const feeds: Record<string, number> = {};
  results.forEach((r, i) => {
    const f = cat.feeds[i];
    if (r.status === "rejected") {
      console.warn(`  [skip] ${cat.name} / ${f.name}: ${String(r.reason).slice(0, 120)}`);
      feeds[f.name] = -1;
      return;
    }
    const fresh = r.value
      .filter((c) => {
        const ts = c.publishedAt ? Date.parse(c.publishedAt) : NaN;
        return Number.isNaN(ts) || ts >= cutoff;
      })
      // Hacker News はポイント順のまま、ほかは新しい順にしてから上限まで使う
      .sort((a, b) => (f.via === "hn" ? 0 : Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0")))
      .slice(0, f.limit ?? PER_FEED);
    feeds[f.name] = fresh.length;
    for (const c of fresh) all.push({ ...c, feed: f.name, rank: rankOf(c, f), urlOnly: f.via === "tdnet" || undefined });
  });
  const unique = dedupe(all, cat.name);

  // 国内・海外それぞれ、フィードごとに新しい順に並べてから1件ずつ順番に取り出す（特定のソースに偏らないように）
  const byRegion = (region: Candidate["region"]) => {
    const groups = new Map<string, Entry[]>();
    for (const e of unique.filter((c) => c.region === region)) {
      if (!groups.has(e.feed)) groups.set(e.feed, []);
      groups.get(e.feed)!.push(e);
    }
    const lists = [...groups.values()].map((g) =>
      g.sort((a, b) => Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0")),
    );
    const out: Entry[] = [];
    while (lists.some((l) => l.length)) for (const l of lists) if (l.length) out.push(l.shift()!);
    return out;
  };
  const dom = byRegion("国内");
  const intl = byRegion("海外");
  const mixed: Candidate[] = [];
  while (mixed.length < MAX_CANDIDATES && (dom.length || intl.length)) {
    for (const list of [dom, intl]) {
      const e = list.shift();
      if (!e || mixed.length >= MAX_CANDIDATES) continue;
      const { feed: _f, rank: _r, urlOnly: _u, ...c } = e;
      mixed.push(c);
    }
  }
  return { candidates: mixed, stats: { fetched: all.length, unique: unique.length, feeds } };
}

async function fetchQuote(symbol: string, name: string): Promise<MarketQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
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

/**
 * TOPIX は Yahoo Finance（米国版）に指数がないため、Yahoo!ファイナンス（日本版）の指数ページから
 * 現在値と前日終値を読む。ページの作りが変わったら取れなくなるので、そのときはスキップする
 */
async function fetchTopix(): Promise<MarketQuote | null> {
  const name = "TOPIX";
  try {
    const res = await fetch("https://finance.yahoo.co.jp/quote/998405.T", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const num = (v?: string) => (v ? Number(v.replace(/,/g, "")) : NaN);
    const price = num(html.match(/_StyledNumber__value[\w-]*">([\d,]+\.\d+)</)?.[1]);
    const prev = num(html.match(/前日終値\\*"\s*,\s*\\*"value\\*"\s*:\s*\\*"([\d,]+\.\d+)/)?.[1]);
    if (!(price > 0) || !(prev > 0) || Math.abs(price / prev - 1) > 0.2) throw new Error(`読み取り失敗 price=${price} prev=${prev}`);
    const change = price - prev;
    return { symbol: "998405.T", name, price, change, changePercent: (change / prev) * 100 };
  } catch (e) {
    console.warn(`  [skip] ${name}: ${String(e).slice(0, 120)}`);
    return null;
  }
}

export async function collectAll(): Promise<RawData> {
  const date = jstDate();
  const quotes = await Promise.all(MARKET_SYMBOLS.map((s) => fetchQuote(s.symbol, s.name)));
  quotes.splice(1, 0, await fetchTopix()); // 日経平均の次に TOPIX
  const markets = quotes.filter((q): q is MarketQuote => q !== null);
  console.log(`  株価: ${markets.length}/${quotes.length} 件`);
  const categories: RawCategory[] = [];
  for (const cat of CATEGORIES) {
    const { candidates, stats } = await collectCategory(cat);
    await fillImages(candidates);
    const withImg = candidates.filter((c) => c.image).length;
    console.log(
      `  ${cat.name}: 取得 ${stats.fetched} 件 → 重複を除いて ${stats.unique} 件 → 候補 ${candidates.length} 件（画像あり ${withImg} 件）`,
    );
    categories.push({ id: cat.id, name: cat.name, candidates, stats });
  }
  console.log(
    `  画像: Googleニュース経由 ${IMAGE_STATS.googleLinks} 件 → 元記事URLに変換 ${IMAGE_STATS.decoded} 件、og:image 取得 ${IMAGE_STATS.images} 件`,
  );
  return { date, collectedAt: new Date().toISOString(), markets, categories };
}

export function readRaw(date: string): RawData {
  return JSON.parse(fs.readFileSync(path.join(RAW_DIR, `${date}.json`), "utf8")) as RawData;
}
