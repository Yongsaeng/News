export type CategoryId = "economy" | "politics" | "tech" | "ai" | "markets" | "crime";

/** 考察の切り口。海外ニュースは日本への影響、国内ニュースは影響を受ける人 */
export type InsightAngle = "日本への影響" | "影響を受ける人";

export type ImpactLevel = "大" | "中" | "小";
export type ImpactWhen = "すぐ" | "数カ月後" | "数年後";

/** 考察の要点。国内は「誰に」、海外は「どの経路で」日本に影響するか */
export interface InsightPoint {
  label: string;
  text: string;
  /** 影響の大きさ */
  level: ImpactLevel;
  /** 影響が出る時期 */
  when: ImpactWhen;
}

/** 考察：何が起きた → なぜ → 自分（日本）への影響 → 今後の注目点 */
export interface Insight {
  angle: InsightAngle;
  what: string;
  why: string;
  points: InsightPoint[];
  watch: string;
}

/** 考察の文章をまとめて返す（用語の照合やAIへの質問に使う） */
export function insightTexts(i?: Insight): string[] {
  if (!i) return [];
  return [i.what, i.why, ...i.points.map((p) => p.text), i.watch];
}

/** 1カテゴリあたり、国内・海外それぞれの最大件数 */
export const PER_REGION = 3;
export const REGIONS = ["国内", "海外"] as const;

/** 記事中の難しい言葉とその意味（タップで表示） */
export interface Term {
  word: string;
  meaning: string;
}

export interface NewsItem {
  title: string;
  summary: string[];
  source: string;
  url: string;
  region: "国内" | "海外";
  publishedAt?: string;
  /** 記事のサムネイル画像URL（取得できたときだけ） */
  image?: string;
  /** 政治・経済のみ：このニュースの考察 */
  insight?: Insight;
  /** 記事中の難しい言葉（2〜4語） */
  terms?: Term[];
}

export interface CategoryDigest {
  id: CategoryId;
  name: string;
  items: NewsItem[];
  /** 株価カテゴリのみ：市況のひとことコメント */
  comment?: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface Digest {
  /** 日本時間の日付 YYYY-MM-DD */
  date: string;
  generatedAt: string;
  /** 今日の全体まとめ（3行） */
  headline: string[];
  markets: MarketQuote[];
  categories: CategoryDigest[];
  /** サンプルデータのときだけ true */
  sample?: boolean;
}

/** 考察が必須のカテゴリ */
export const INSIGHT_CATEGORIES: CategoryId[] = ["economy", "politics"];
