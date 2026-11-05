export type CategoryId = "economy" | "politics" | "tech" | "markets" | "crime";

export interface NewsItem {
  title: string;
  summary: string[];
  source: string;
  url: string;
  region: "国内" | "海外";
  publishedAt?: string;
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
