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
import { INSIGHT_CATEGORIES, PER_REGION, REGIONS, SCORE_RUBRIC, insightTexts } from "../src/lib/types";
import { DIGEST_DIR, jstDate, readRaw } from "./lib/collect";

const Item = z.object({
  title: z.string().min(1).max(80),
  summary: z.array(z.string().min(1).max(120)).length(3),
  source: z.string().min(1),
  url: z.string().url(),
  region: z.enum(["国内", "海外"]),
  publishedAt: z.string().optional(),
  paywalled: z.literal(true).optional(),
  image: z.string().url().optional(),
  insight: z
    .object({
      angle: z.enum(["日本への影響", "影響を受ける人"]),
      what: z.string().min(30).max(150),
      why: z.string().min(60).max(220),
      points: z
        .array(
          z.object({
            label: z.string().min(1).max(16),
            text: z.string().min(20).max(100),
            level: z.enum(["大", "中", "小"]),
            when: z.enum(["すぐ", "数カ月後", "数年後"]),
          }),
        )
        .min(2)
        .max(4),
      watch: z.string().min(10).max(60),
    })
    .optional(),
  score: z.object({
    total: z.number().int(),
    parts: z.record(z.string(), z.number().int().min(0)),
    penalty: z.union([z.literal(0), z.literal(-30)]),
  }),
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
      items: z.array(Item).max(PER_REGION * 2),
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

    // 国内・海外それぞれ PER_REGION 件（region は記事の内容で決める）。国内→海外の順に並べる
    for (const c of d.categories) {
      for (const r of REGIONS) {
        const n = c.items.filter((it) => it.region === r).length;
        if (n > PER_REGION) errors.push(`${c.name}: ${r}の記事は${PER_REGION}件までです（今は${n}件）`);
        else if (n < PER_REGION) console.warn(`⚠ ${c.name}: ${r}の記事が${n}件です（${PER_REGION}件が目標。候補が本当に足りないときだけにしてください）`);
      }
      const order = c.items.map((it) => it.region).join(",");
      const sorted = [...c.items].sort((a, b) => REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region)).map((it) => it.region).join(",");
      if (order !== sorted) errors.push(`${c.name}: 国内の記事を先、海外の記事を後に並べてください`);
    }

    // 重要度の採点：項目と上限が採点表どおりか、合計が合っているか、地域内で点数の高い順か
    for (const c of d.categories) {
      c.items.forEach((it, i) => {
        const rubric: Record<string, number> = SCORE_RUBRIC[it.region];
        const keys = Object.keys(rubric).sort().join(",");
        if (Object.keys(it.score.parts).sort().join(",") !== keys) {
          errors.push(`${c.name}[${i}]: ${it.region}の記事の score.parts は ${keys} の5項目にしてください`);
          return;
        }
        for (const [k, max] of Object.entries(rubric)) {
          if (it.score.parts[k] > max) errors.push(`${c.name}[${i}]: score.parts.${k} は${max}点までです`);
        }
        const sum = Object.values(it.score.parts).reduce((a, b) => a + b, 0) + it.score.penalty;
        if (sum !== it.score.total) errors.push(`${c.name}[${i}]: score.total は項目の合計＋減点（${sum}）にしてください`);
      });
      for (const r of REGIONS) {
        const totals = c.items.filter((it) => it.region === r).map((it) => it.score.total);
        if (totals.some((t, j) => j > 0 && t > totals[j - 1])) errors.push(`${c.name}: ${r}の記事は score.total の高い順に並べてください`);
      }
    }

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
        const body = [...it.summary, ...insightTexts(it.insight)].join("\n");
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
          if (cand && !!it.paywalled !== !!cand.paywalled)
            errors.push(`${c.name}[${i}]: paywalled は候補の値をそのまま使ってください（有料記事には true、無料記事には付けない）`);
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
