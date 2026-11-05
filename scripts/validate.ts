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
import { DIGEST_DIR, jstDate, readRaw } from "./lib/collect";

const Item = z.object({
  title: z.string().min(1).max(80),
  summary: z.array(z.string().min(1).max(120)).length(3),
  source: z.string().min(1),
  url: z.string().url(),
  region: z.enum(["国内", "海外"]),
  publishedAt: z.string().optional(),
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
      id: z.enum(["economy", "politics", "tech", "markets", "crime"]),
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

    // 記事 URL は収集した候補の中にあるものだけ（作り話の記事を防ぐ）
    const rawPath = path.join(process.cwd(), "data", "raw", `${date}.json`);
    if (fs.existsSync(rawPath)) {
      const raw = readRaw(date);
      for (const c of d.categories) {
        const cands = raw.categories.find((r) => r.id === c.id)?.candidates ?? [];
        const urls = new Set(cands.map((x) => x.url));
        if (cands.length > 0 && c.items.length === 0) errors.push(`${c.name}: 候補があるのに記事が0件です`);
        c.items.forEach((it, i) => {
          if (!urls.has(it.url)) errors.push(`${c.name}[${i}]: url が収集データにありません（${it.url}）`);
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
