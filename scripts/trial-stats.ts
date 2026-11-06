/** 一時的な試し収集（GitHub Actions で実行、保存しない）。カテゴリごとの件数と重複の例を表示する */
import { collectAll, MERGED } from "./lib/collect";

async function main() {
  const t0 = Date.now();
  setTimeout(() => { console.log("6分たっても終わらないため打ち切り"); process.exit(1); }, 360_000).unref();
  const raw = await collectAll();
  console.log(`\n収集にかかった時間: ${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
  console.log("\n===== 指数 =====");
  for (const q of raw.markets) console.log(`${q.name} (${q.symbol}): ${q.price} (${q.changePercent.toFixed(2)}%)`);
  console.log("\n===== カテゴリごとの件数 =====");
  for (const c of raw.categories) {
    const s = c.stats!;
    const paid = c.candidates.filter((x) => x.paywalled).length;
    const dom = c.candidates.filter((x) => x.region === "国内").length;
    console.log(`${c.name}: 重複前 ${s.fetched} / 重複後 ${s.unique} / 候補 ${c.candidates.length}（国内${dom}・海外${c.candidates.length - dom}・有料${paid}）`);
    console.log("   " + Object.entries(s.feeds).map(([k, v]) => `${k}=${v}`).join(", "));
  }
  console.log("\n===== 重複としてまとめた例 =====");
  for (const m of MERGED.slice(0, 60)) console.log(`[${m.category}] 残す: ${m.kept}\n          除く: ${m.dropped}`);
  console.log(`(全 ${MERGED.length} 件)`);
  console.log("\n===== 候補の例（各カテゴリ先頭8件） =====");
  for (const c of raw.categories) {
    console.log(`--- ${c.name}`);
    for (const x of c.candidates.slice(0, 8)) console.log(`  ${x.paywalled ? "🔒" : "  "}[${x.region}] ${x.title.slice(0, 50)}（${x.source}） snip=${x.snippet.length}`);
  }
}
main().then(() => process.exit(0));
