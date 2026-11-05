/**
 * data/digests/YYYY-MM-DD.json が正しい形か確認する。
 * 問題がなければサンプルデータ（sample.json）を削除する。
 *
 *   npm run validate            # 今日（日本時間）
 *   npm run validate -- 2026-11-06
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CATEGORIES } from "../src/lib/sources";
import { INSIGHT_CATEGORIES } from "../src/lib/types";
import { DIGEST_DIR, jstDate, readRaw } from "./lib/collect";

const Item = z.object({
  title: z.string().min(1).max(80),
  summary: z.array(z.string().min(1).max(120)).length(3),
  source: z.string().min(1),
  url: z.string().url(),
  region: z.enum(["国内", "海外"]),
  publishedAt: z.string().optional(),
  image: z.string().url().optional(),
  insight: z
    .object({ angle: z.enum(["日本への影響", "影響を受ける人"]), text: z.string().min(40).max(300) })
    .optional(),
  terms: z
    .array(z.object({ word: z.string().min(1).max(20), meaning: z.string().min(10).max(120) }))
    .max(5)
    .optional(),
});

const DigestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generatedAt: z.string().datetime(),
  headline: z.array(z.string().min(1).max(120)).length(3),
  markets: z.array(
    z.object({ symbol: z.string(), name: z.string(), price: z.number(), change: z.number(), changePercent: z.number() }),
  ),
  categories: z.array(
    z.object({
      id: z.enum(["economy", "politics", "tech", "ai", "markets", "crime"]),
      name: z.string(),
      items: z.array(Item).max(5),
      comment: z.string().max(200).optional(),
    }),
  ),
  sample: z.literal(true).optional(),
});

function main() {
  const date = process.argv[2] || jstDate();
  const file = path.join(DIGEST_DIR, `${date}.json`);
  const errors: string[] = [];

  if (!fs.existsSync(file)) {
    console.error(`❌ ファイルがありません: ${path.relative(process.cwd(), file)}`);
    process.exit(1);
  }
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`❌ JSON として読めません: ${e}`);
    process.exit(1);
  }

  const parsed = DigestSchema.safeParse(json);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join(".")}: ${issue.message}`);
  } else {
    const d = parsed.data;
    if (d.date !== date) errors.push(`date が ${date} ではありません（${d.date}）`);
    if (d.sample) errors.push("sample: true が付いています");
    const ids = d.categories.map((c) => c.id).join(",");
    const expected = CATEGORIES.map((c) => c.id).join(",");
    if (ids !== expected) errors.push(`categories の並びは ${expected} にしてください（今は ${ids}）`);

    // 政治・経済は考察が必須。海外は「日本への影響」、国内は「影響を受ける人」
    for (const c of d.categories) {
      if (!INSIGHT_CATEGORIES.includes(c.id)) continue;
      c.items.forEach((it, i) => {
        const want = it.region === "海外" ? "日本への影響" : "影響を受ける人";
        if (!it.insight) errors.push(`${c.name}[${i}]: insight（考察）がありません`);
        else if (it.insight.angle !== want) errors.push(`${c.name}[${i}]: ${it.region}の記事なので angle は「${want}」にしてください`);
      });
    }

    // 用語は記事の本文（要約・考察）に出てくる言葉だけ（見出しはリンクなのでタップできない）
    for (const c of d.categories) {
      c.items.forEach((it, i) => {
        const body = [...it.summary, it.insight?.text ?? ""].join("\n");
        for (const t of it.terms ?? []) {
          if (!body.includes(t.word)) errors.push(`${c.name}[${i}]: 用語「${t.word}」が要約・考察の文中にありません`);
        }
      });
    }

    // 記事 URL は収集した候補の中にあるものだけ（作り話の記事を防ぐ）
    const rawPath = path.join(process.cwd(), "data", "raw", `${date}.json`);
    if (fs.existsSync(rawPath)) {
      const raw = readRaw(date);
      for (const c of d.categories) {
        const cands = raw.categories.find((r) => r.id === c.id)?.candidates ?? [];
        if (cands.length > 0 && c.items.length === 0) errors.push(`${c.name}: 候補があるのに記事が0件です`);
        c.items.forEach((it, i) => {
          const cand = cands.find((x) => x.url === it.url);
          if (!cand) errors.push(`${c.name}[${i}]: url が収集データにありません（${it.url}）`);
          else if (it.image && it.image !== cand.image) errors.push(`${c.name}[${i}]: image は候補の値をそのまま使ってください`);
          else if (!it.image && cand.image) errors.push(`${c.name}[${i}]: 候補に image があるのでコピーしてください`);
        });
      }
    } else {
      console.warn(`⚠ 収集データ data/raw/${date}.json がないため、URL の照合を省略しました`);
    }
  }

  if (errors.length) {
    console.error(`❌ ${errors.length} 件の問題があります`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  const sample = path.join(DIGEST_DIR, "sample.json");
  if (fs.existsSync(sample)) fs.unlinkSync(sample);
  console.log(`✅ ${date} のまとめは正しい形です`);
}

main();
