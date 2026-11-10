/**
 * ニュースと株価を集めて data/raw/YYYY-MM-DD.json に保存する（API キー不要）。
 * 毎朝 6:30（日本時間）に GitHub Actions が実行する。
 *
 *   npm run collect
 */
import fs from "node:fs";
import path from "node:path";
import { collectAll, RAW_DIR } from "./lib/collect";

const KEEP_DAYS = 14; // 生データはこの日数だけ残す

async function main() {
  console.log("📥 ニュースを収集します");
  const raw = await collectAll();
  const total = raw.categories.reduce((n, c) => n + c.candidates.length, 0);
  if (total === 0) {
    console.error("記事を1件も取得できませんでした。ネットワークを確認してください。");
    process.exit(1);
  }
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const file = path.join(RAW_DIR, `${raw.date}.json`);
  fs.writeFileSync(file, JSON.stringify(raw, null, 2) + "\n");

  // 古い生データを削除
  const cutoff = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);
  for (const f of fs.readdirSync(RAW_DIR)) {
    if (f.endsWith(".json") && f.slice(0, 10) < cutoff) fs.unlinkSync(path.join(RAW_DIR, f));
  }
  console.log(`✅ ${total} 件を保存しました: ${path.relative(process.cwd(), file)}`);
  process.exit(0); // 応答待ちの通信が残っていても終わらせる
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
