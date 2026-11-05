export type CategoryId = "economy" | "politics" | "tech" | "ai" | "markets" | "crime";

/** 考察の切り口。海外ニュースは日本への影響、国内ニュースは影響を受ける人 */
export type InsightAngle = "日本への影響" | "影響を受ける人";

export interface Insight {
  angle: InsightAngle;
  text: string;
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
