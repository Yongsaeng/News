# Morning Brief

経済・政治・テクノロジー・株価・犯罪のトレンドニュースを毎朝自動で集め、Claude で日本語に要約して表示する自分専用のWebアプリです。

## しくみ

API キーは使わず、Proプランの範囲内で動きます。

1. 毎朝 6:15（日本時間）に GitHub Actions が RSS と株価を集め、`data/raw/YYYY-MM-DD.json` に保存する（`npm run collect`）
2. 6:50 ごろに Claude の定期実行が [SUMMARIZE.md](SUMMARIZE.md) の手順で、カテゴリごとのトップ5と3行要約を `data/digests/YYYY-MM-DD.json` に書く
3. `npm run validate` で形と URL をチェックしてから push する
4. Next.js の画面がその JSON を読んで表示する

ニュースソースは `src/lib/sources.ts` で自由に追加・削除できます。

## ローカルで見る

Node.js 22 以上が必要です。

```bash
git pull
npm install
npm run dev     # http://localhost:3000 を開く
```

## Vercel で公開する（スマホから読みたいとき）

1. https://vercel.com に GitHub でサインインし、このリポジトリをインポートする
2. Environment Variables に `SITE_PASSWORD` を設定すると、サイト全体にパスワードがかかる（ユーザー名は何でもよい）

毎朝のコミットのたびに Vercel が自動で再デプロイします。

## 費用

追加の費用はかかりません。GitHub Actions と Vercel は無料枠、要約は Claude Pro の利用枠で動きます。

API で要約したい場合は `ANTHROPIC_API_KEY` を `.env.local` に入れて `npm run summarize:api` を実行します（API 利用料が別にかかります）。
