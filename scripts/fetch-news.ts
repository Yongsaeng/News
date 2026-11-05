/**
 * 【任意】Claude API で要約する方法。通常は毎朝の定期実行（Claude）が要約するので不要です。
 * API キーを持っていて、手元ですぐに要約を作りたいときに使えます（API 利用料がかかります）。
 *
 *   ANTHROPIC_API_KEY=... npm run summarize:api
 *
 * data/raw/今日.json があればそれを使い、なければその場で収集します。
 */
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { collectAll, DIGEST_DIR, jstDate, RAW_DIR, readRaw, type RawCategory } from "./lib/collect";
import { INSIGHT_CATEGORIES, PER_REGION, REGIONS, type CategoryDigest, type Digest, type MarketQuote, type NewsItem } from "../src/lib/types";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const CategorySchema = z.object({
  picks: z.array(
    z.object({
      index: z.number().int().describe("候補リストの番号"),
      region: z.enum(["国内", "海外"]).describe("記事の内容で判断：日本で起きた出来事・日本が主役なら国内、海外で起きた出来事・外国が主役なら海外（配信元の国ではない）"),
      title: z.string().describe("日本語の見出し（30字程度）"),
      summary: z.array(z.string()).describe("日本語の要約をちょうど3行。各行40字程度"),
      insight: z
        .object({
          what: z.string().describe("何が起きたか（30〜150字）"),
          why: z.string().describe("なぜ起きたか。背景をかみ砕いて（60〜220字）"),
          points: z
            .array(
              z.object({
                label: z.string().describe("国内記事は影響を受ける人、海外記事は日本への影響の経路（16字以内）"),
                text: z.string().describe("どう影響しそうか（20〜100字）"),
                level: z.enum(["大", "中", "小"]),
                when: z.enum(["すぐ", "数カ月後", "数年後"]),
              }),
            )
            .describe("2〜4個"),
          watch: z.string().describe("今後の注目点を1文（10〜60字）"),
        })
        .nullable()
        .describe("経済・政治のみ。他カテゴリは null"),
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

async function summarizeCategory(client: Anthropic, cat: RawCategory, quotes: MarketQuote[]): Promise<CategoryDigest> {
  const cands = cat.candidates;
  const withInsight = INSIGHT_CATEGORIES.includes(cat.id);
  if (cands.length === 0) return { id: cat.id, name: cat.name, items: [] };
  const list = cands
    .map((c, i) => `[${i}] (配信元：${c.region} / ${c.source}) ${c.title}${c.snippet ? `\n    ${c.snippet}` : ""}`)
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
        content: `カテゴリ「${cat.name}」の候補記事です。内容が国内の記事を${PER_REGION}件、内容が海外の記事を${PER_REGION}件選び（候補の国内/海外は配信元の目安）、日本語の見出しと3行要約を作ってください。${withInsight ? "各記事に考察も付けてください。国内記事は、背景から分かりやすく解説し、どんな人にどう影響するかを具体的に。海外記事は、背景を分かりやすく解説し、為替・物価・企業・安全保障など日本にどの経路でどう影響しそうかを具体的に。断定は避けてください。" : ""}${marketInfo}\n\n${list}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error(`${cat.name}: 要約が拒否されました`);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`${cat.name}: 要約の解析に失敗しました`);

  const picks = parsed.picks.filter((p) => cands[p.index]);
  const items: NewsItem[] = REGIONS.flatMap((r) => picks.filter((p) => p.region === r).slice(0, PER_REGION))
    .map((p) => {
      const c = cands[p.index];
      const item: NewsItem = { title: p.title, summary: p.summary.slice(0, 3), source: c.source, url: c.url, region: p.region, publishedAt: c.publishedAt, image: c.image };
      if (withInsight && p.insight) item.insight = { angle: p.region === "海外" ? "日本への影響" : "影響を受ける人", ...p.insight, points: p.insight.points.slice(0, 4) };
      return item;
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
  const raw = fs.existsSync(path.join(RAW_DIR, `${date}.json`)) ? readRaw(date) : await collectAll();
  console.log(`📰 ${date} のニュースを要約します（モデル: ${MODEL}）`);

  const categories: CategoryDigest[] = [];
  for (const cat of raw.categories) categories.push(await summarizeCategory(client, cat, raw.markets));
  const headline = await makeHeadline(client, categories);

  const digest: Digest = { date, generatedAt: new Date().toISOString(), headline, markets: raw.markets, categories };
  fs.mkdirSync(DIGEST_DIR, { recursive: true });
  const file = path.join(DIGEST_DIR, `${date}.json`);
  fs.writeFileSync(file, JSON.stringify(digest, null, 2) + "\n");
  const sample = path.join(DIGEST_DIR, "sample.json");
  if (fs.existsSync(sample)) fs.unlinkSync(sample);
  console.log(`✅ 保存しました: ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
