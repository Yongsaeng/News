# Morning Brief

経済・政治・テクノロジー・株価・犯罪のトレンドニュースを毎朝自動で集め、Claude で日本語に要約して表示する自分専用のWebアプリです。

## しくみ

1. `npm run fetch` が RSS と株価を集め、Claude でカテゴリごとのトップ5と3行要約を作る
2. 結果を `data/digests/YYYY-MM-DD.json` に保存する
3. Next.js の画面がその JSON を読んで表示する

ニュースソースは `src/lib/sources.ts` で自由に追加・削除できます。

## ローカルで動かす

Node.js 22 以上が必要です。

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を入れる
npm run fetch                # 今日のニュースを取得して要約（1〜3分）
npm run dev                  # http://localhost:3000 を開く
```

API キーは https://console.anthropic.com で発行できます。

### ローカルで毎朝7時に自動実行する（Mac / Linux）

`crontab -e` に次の1行を追加します（パスは自分の環境に合わせてください）。PC が起動している必要があります。

```
0 7 * * * cd /path/to/news && /usr/local/bin/npm run fetch >> fetch.log 2>&1
```

## GitHub Actions と Vercel で自動化する

1. GitHub のリポジトリで Settings → Secrets and variables → Actions を開き、`ANTHROPIC_API_KEY` を登録する
2. 毎日 7:00（日本時間）に `.github/workflows/daily-digest.yml` が動き、要約をコミットする。Actions タブの「Run workflow」で手動実行もできる
3. https://vercel.com に GitHub でサインインし、このリポジトリをインポートする
4. Vercel の Environment Variables に `SITE_PASSWORD` を設定すると、サイト全体にパスワードがかかる（ユーザー名は何でもよい）

コミットのたびに Vercel が自動で再デプロイするので、毎朝のまとめがスマホからも読めます。

## 費用の目安

API 利用料だけです。モデルは環境変数 `CLAUDE_MODEL` で変えられます（GitHub Actions では Variables に設定）。

| モデル | 1日あたりの目安 | 1か月の目安 |
| --- | --- | --- |
| `claude-opus-5-5`（既定） | 約0.4ドル | 約1,600円 |
| `claude-haiku-5-5` | 約0.01ドル | 約50円 |

※ 1日あたり入力 約4万トークン・出力 約1万トークンでの概算です。
