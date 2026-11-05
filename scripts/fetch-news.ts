/**
 * ニュースを集めて Claude で要約し、data/digests/YYYY-MM-DD.json に保存する。
 *
 *   ANTHROPIC_API_KEY=... npm run fetch
 *
 * 環境変数
 *   ANTHROPIC_API_KEY  必須
 *   CLAUDE_MODEL       使うモデル（省略時 claude-opus-5-5）
 */
import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CATEGORIES, MARKET_SYMBOLS, type CategoryConfig } from "../src/lib/sources";
import type { CategoryDigest, Digest, MarketQuote, NewsItem } from "../src/lib/types";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const MAX_CANDIDATES = 30; // 1カテゴリあたり Claude に渡す候補記事の上限
const MAX_AGE_HOURS = 36;
const UA = "Mozilla/5.0 (compatible; news-digest/1.0)";

interface Candidate {
  title: string;
  snippet: string;
  source: string;
  url: string;
  region: "国内" | "海外";
  publishedAt?: string;
}

const parser = new Parser({ timeout: 15000, headers: { "User-Agent": UA } });

function jstDate(d = new Date()): string {
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

async function collect(cat: CategoryConfig): Promise<Candidate[]> {
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

const CategorySchema = z.object({
  picks: z.array(
    z.object({
      index: z.number().int().describe("候補リストの番号"),
      title: z.string().describe("日本語の見出し（30字程度）"),
      summary: z.array(z.string()).describe("日本語の要約をちょうど3行。各行40字程度"),
    }),
  ),
  comment: z.string().describe("株価カテゴリのときだけ、今日の市況のひとこと（80字以内）。他カテゴリは空文字"),
});

const HeadlineSchema = z.object({
  headline: z.array(z.string()).describe("今日の全体まとめ。ちょうど3行、各行50字以内"),
});

const SYSTEM = `あなたは日本語ニュースキュレーターです。読者は毎朝数分で国内外の重要ニュースを把握したい日本の社会人です。
- 与えられた候補記事だけを使い、書かれていない事実を足さないでください。
- 同じ出来事を扱う記事は1つにまとめてください。
- 重要度（社会や市場への影響、話題性）の高い順に選んでください。
- 英語の記事も自然な日本語で要約してください。`;

async function summarizeCategory(client: Anthropic, cat: CategoryConfig, cands: Candidate[], quotes: MarketQuote[]): Promise<CategoryDigest> {
  if (cands.length === 0) return { id: cat.id, name: cat.name, items: [] };
  const list = cands
    .map((c, i) => `[${i}] (${c.region} / ${c.source}) ${c.title}${c.snippet ? `\n    ${c.snippet}` : ""}`)
    .join("\n");
  const marketInfo =
    cat.id === "markets" && quotes.length
      ? `\n\n参考：直近の指数（前日比）\n${quotes.map((q) => `${q.name}: ${q.price.toFixed(2)} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`).join("\n")}`
      : "";

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(CategorySchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `カテゴリ「${cat.name}」の候補記事です。今日のトップ5を選び、日本語の見出しと3行要約を作ってください。${marketInfo}\n\n${list}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error(`${cat.name}: 要約が拒否されました`);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`${cat.name}: 要約の解析に失敗しました`);

  const items: NewsItem[] = parsed.picks
    .filter((p) => cands[p.index])
    .slice(0, 5)
    .map((p) => {
      const c = cands[p.index];
      return { title: p.title, summary: p.summary.slice(0, 3), source: c.source, url: c.url, region: c.region, publishedAt: c.publishedAt };
    });
  return { id: cat.id, name: cat.name, items, comment: parsed.comment || undefined };
}

async function makeHeadline(client: Anthropic, categories: CategoryDigest[]): Promise<string[]> {
  const text = categories.map((c) => `■${c.name}\n${c.items.map((i) => `- ${i.title}`).join("\n")}`).join("\n\n");
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(HeadlineSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: `今日の各カテゴリのトップニュースです。全体を3行でまとめてください。\n\n${text}` }],
  });
  return response.parsed_output?.headline.slice(0, 3) ?? [];
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("ANTHROPIC_API_KEY が設定されていません。.env.local を確認してください。");
    process.exit(1);
  }
  const client = new Anthropic();
  const date = jstDate();
  console.log(`📰 ${date} のニュースを収集します（モデル: ${MODEL}）`);

  const quotes = (await Promise.all(MARKET_SYMBOLS.map((s) => fetchQuote(s.symbol, s.name)))).filter((q): q is MarketQuote => q !== null);
  console.log(`  株価: ${quotes.length}/${MARKET_SYMBOLS.length} 件`);

  const categories: CategoryDigest[] = [];
  for (const cat of CATEGORIES) {
    const cands = await collect(cat);
    console.log(`  ${cat.name}: 候補 ${cands.length} 件`);
    categories.push(await summarizeCategory(client, cat, cands, quotes));
  }
  if (categories.every((c) => c.items.length === 0)) {
    console.error("記事を1件も取得できませんでした。ネットワークを確認してください。");
    process.exit(1);
  }
  const headline = await makeHeadline(client, categories);

  const digest: Digest = { date, generatedAt: new Date().toISOString(), headline, markets: quotes, categories };
  const dir = path.join(process.cwd(), "data", "digests");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${date}.json`);
  fs.writeFileSync(file, JSON.stringify(digest, null, 2) + "\n");
  // 実データができたらサンプルは削除する
  const sample = path.join(dir, "sample.json");
  if (fs.existsSync(sample)) fs.unlinkSync(sample);
  console.log(`✅ 保存しました: ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
