# 毎朝の要約手順（Claude の定期実行用）

毎朝 6:50 ごろ（日本時間）に Claude がこの手順に従って、その日のまとめを作ります。
人が手で実行するときも同じ手順です。

## 1. 今日の収集データを用意する

- 今日の日付（日本時間）を `TZ=Asia/Tokyo date +%F` で確認する
- `git pull origin main` で最新にし、`data/raw/<今日>.json` があるか確認する
- まだなければ GitHub Actions の収集が遅れているので、3分おきに `git pull` して最大30分待つ。それでもなければ「収集データが届いていない」と報告して終了する（推測で記事を作らない）
- `data/digests/<今日>.json` がすでにあれば、作り直さずに終了する

## 2. 要約を書く

`data/raw/<今日>.json` を読み、`data/digests/<今日>.json` を次の形で書く。型は `src/lib/types.ts` の `Digest`。

```json
{
  "date": "YYYY-MM-DD",
  "generatedAt": "ISO 8601 の現在時刻（UTC）",
  "headline": ["今日の全体まとめ 1行目", "2行目", "3行目"],
  "markets": "収集データの markets をそのままコピー",
  "categories": [
    {
      "id": "economy",
      "name": "経済",
      "items": [
        {
          "title": "日本語の見出し（30字程度）",
          "summary": ["要約1行目（40字程度）", "2行目", "3行目"],
          "source": "候補の source をそのまま",
          "url": "候補の url をそのまま",
          "region": "候補の region をそのまま",
          "publishedAt": "候補の publishedAt をそのまま（あれば）"
        }
      ],
      "comment": "株価カテゴリ（markets）だけ：今日の市況のひとこと（80字以内）"
    }
  ]
}
```

ルール

- カテゴリは収集データと同じ順番（economy, politics, tech, markets, crime）で、すべて含める
- 各カテゴリで重要度（社会や市場への影響、話題性）の高い順に最大5件を選ぶ。候補が少なければ少なくてよい
- 同じ出来事を扱う候補は1件にまとめる。国内と海外がなるべく両方入るようにする
- 書いてよいのは候補の title と snippet にある事実だけ。リンク先を開いたり、知識で事実を足したりしない
- 英語の記事も自然な日本語で要約する。要約はちょうど3行
- `url`・`source`・`region`・`publishedAt` は候補の値をそのままコピーする（書き換えない）
- `headline` は全カテゴリを見渡した今日の要点をちょうど3行（各50字以内）
- `markets` カテゴリの `comment` は、収集データの `markets`（指数の前日比）と市況ニュースから書く

## 3. 確認して保存する

```bash
npm ci            # node_modules がなければ
npm run validate
```

- エラーが出たら内容を直して、通るまで繰り返す
- 通ったら `data/digests/` をコミットして push する

```bash
git add -A data/digests
git commit -m "digest: <今日>"
git pull --rebase origin main
git push origin main
```
