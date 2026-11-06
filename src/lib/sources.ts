import type { CategoryId } from "./types";

export interface Feed {
  name: string;
  url: string;
  region: "国内" | "海外";
  /** 取得方法。rss＝公式RSS（既定）、google＝Googleニュースの「site:ドメイン」検索、hn＝Hacker News 公式API */
  via?: "rss" | "google" | "hn" | "tdnet";
  /** 有料・会員制。見出し・URL・配信日時・ソース名だけを取り、本文や画像は取らない（画面に🔒有料） */
  paywalled?: true;
  /** 見出しがこの条件に合う記事だけ使う（総合フィードから AI 関連だけ取るときなど） */
  match?: RegExp;
  /** Googleニュースの検索結果のうち、配信元がこの条件に合う記事だけ使う（site: 検索で取れないソース用） */
  publisher?: RegExp;
  /** このフィードから使う記事の上限（既定 15） */
  limit?: number;
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  feeds: Feed[];
}

const gnewsJa = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`;
const gnewsEn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
const gnewsTopicJa = (topic: string) =>
  `https://news.google.com/rss/headlines/section/topic/${topic}?hl=ja&gl=JP&ceid=JP:ja`;
const gnewsTopicEn = (topic: string) =>
  `https://news.google.com/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`;

/** Google ニュースの「site:ドメイン」検索（公式RSSがないソース用） */
const site = (domain: string, words = "", lang: "ja" | "en" = "ja") =>
  (lang === "ja" ? gnewsJa : gnewsEn)(`site:${domain}${words ? ` ${words}` : ""} when:1d`);

// 時事・共同（47NEWS）は総合のRSSしかないため、見出しの語でカテゴリを絞る
const KW_ECONOMY = "(経済 OR 景気 OR 物価 OR 日銀 OR 企業 OR 決算 OR 賃上げ OR 円相場)";
const KW_POLITICS = "(政府 OR 首相 OR 国会 OR 自民 OR 与党 OR 野党 OR 選挙 OR 外相 OR 閣議)";
const KW_CRIME = "(逮捕 OR 容疑 OR 事件 OR 詐欺 OR 警察 OR 送検 OR 起訴 OR 判決)";

/** 総合フィードから AI の記事だけを取り出す条件 */
const AI_TITLE = /AI|ＡＩ|人工知能|生成|LLM|ChatGPT|Gemini|Claude|Copilot|エージェント|機械学習/;

/**
 * カテゴリごとのニュースソース。
 * 取得できないフィードは自動でスキップされるので、自由に足し引きしてください。
 *
 * - via 省略：公式RSS／via: "google"：Googleニュースの site: 検索（公式RSSがないソース）／via: "hn"：Hacker News 公式API／via: "tdnet"：TDnet 公式の開示一覧ページ
 * - paywalled：有料・会員制。見出し・URL・配信日時・ソース名だけを取る（画面に🔒有料）
 */
export const CATEGORIES: CategoryConfig[] = [
  {
    id: "economy",
    name: "経済",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat5.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/business.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsTopicJa("BUSINESS"), region: "国内" },
      // jp.reuters.com は site: 検索に出ないため、キーワード検索の結果を配信元「Reuters」で絞る
      { name: "ロイター", url: gnewsJa(`ロイター ${KW_ECONOMY} when:1d`), region: "国内", via: "google", publisher: /Reuters|ロイター/ },
      { name: "時事通信", url: site("jiji.com", KW_ECONOMY), region: "国内", via: "google" },
      { name: "日本経済新聞", url: site("nikkei.com/article", KW_ECONOMY), region: "国内", via: "google", paywalled: true },
      // bloomberg.co.jp も site: 検索ではほぼ出ないため、同じく配信元で絞る
      { name: "Bloomberg", url: gnewsJa("ブルームバーグ when:1d"), region: "国内", via: "google", publisher: /Bloomberg/, paywalled: true },
      { name: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml", region: "海外" },
      { name: "Google News", url: gnewsTopicEn("BUSINESS"), region: "海外" },
      { name: "Reuters", url: site("reuters.com/business", "", "en"), region: "海外", via: "google" },
      { name: "Bloomberg", url: "https://feeds.bloomberg.com/economics/news.rss", region: "海外", paywalled: true },
    ],
  },
  {
    id: "politics",
    name: "政治",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat4.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/domestic.xml", region: "国内" },
      { name: "共同通信", url: site("47news.jp", KW_POLITICS), region: "国内", via: "google" },
      { name: "時事通信", url: site("jiji.com", KW_POLITICS), region: "国内", via: "google" },
      { name: "Yahoo!ニュース 国際", url: "https://news.yahoo.co.jp/rss/topics/world.xml", region: "海外" },
      { name: "NHK 国際", url: "https://www3.nhk.or.jp/rss/news/cat6.xml", region: "海外" },
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "海外" },
      { name: "Reuters", url: site("reuters.com/world", "", "en"), region: "海外", via: "google" },
      { name: "AP News", url: site("apnews.com/article", "world", "en"), region: "海外", via: "google" },
    ],
  },
  {
    id: "tech",
    name: "テクノロジー",
    feeds: [
      { name: "ITmedia", url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/it.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsTopicJa("TECHNOLOGY"), region: "国内" },
      { name: "Impress Watch", url: "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf", region: "国内" },
      { name: "Publickey", url: "https://www.publickey1.jp/atom.xml", region: "国内" },
      { name: "GIGAZINE", url: "https://gigazine.net/news/rss_2.0/", region: "国内" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", region: "海外" },
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", region: "海外" },
      { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", region: "海外" },
      { name: "WIRED", url: "https://www.wired.com/feed/rss", region: "海外" },
      { name: "Hacker News", url: "https://hacker-news.firebaseio.com/v0/topstories.json", region: "海外", via: "hn", limit: 10 },
    ],
  },
  {
    id: "ai",
    name: "AI",
    feeds: [
      { name: "ITmedia AI+", url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsJa("生成AI OR 人工知能 when:1d"), region: "国内" },
      { name: "AINOW", url: "https://ainow.ai/feed/", region: "国内" },
      { name: "日経クロステック", url: "https://xtech.nikkei.com/rss/index.rdf", region: "国内", match: AI_TITLE, paywalled: true },
      { name: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/", region: "海外" },
      { name: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", region: "海外" },
      { name: "OpenAI", url: "https://openai.com/news/rss.xml", region: "海外" },
      { name: "Anthropic", url: gnewsEn("site:anthropic.com when:2d"), region: "海外", via: "google" },
      { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", region: "海外" },
      { name: "The Decoder", url: "https://the-decoder.com/feed/", region: "海外" },
      // 公式RSSは GitHub Actions から 429（アクセス制限）になるため Google ニュース経由
      { name: "VentureBeat", url: gnewsEn("site:venturebeat.com AI when:2d"), region: "海外", via: "google" },
      { name: "Meta AI", url: gnewsEn("site:ai.meta.com when:2d"), region: "海外", via: "google" },
      { name: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", region: "海外", paywalled: true },
    ],
  },
  {
    id: "markets",
    name: "株価・マーケット",
    feeds: [
      { name: "Google ニュース", url: gnewsJa("株価 OR 日経平均 OR 為替 when:1d"), region: "国内" },
      { name: "株探", url: site("kabutan.jp"), region: "国内", via: "google" },
      { name: "みんかぶ", url: site("minkabu.jp"), region: "国内", via: "google" },
      { name: "ロイター", url: gnewsJa("ロイター (株 OR 日経平均 OR 円 OR 為替 OR 債券 OR 日銀) when:1d"), region: "国内", via: "google", publisher: /Reuters|ロイター/ },
      // 適時開示は TDnet 公式の一覧ページから、主要企業（TDNET_MAJOR）の開示タイトルとURLだけを取る
      { name: "TDnet", url: "https://www.release.tdnet.info/inbs/", region: "国内", via: "tdnet", limit: 15 },
      { name: "Google News", url: gnewsEn("stock market when:1d"), region: "海外" },
      { name: "Bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss", region: "海外", paywalled: true },
      { name: "CNBC", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", region: "海外" },
      { name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", region: "海外" },
    ],
  },
  {
    id: "crime",
    name: "犯罪・事件",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat1.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsJa("事件 OR 逮捕 OR 詐欺 when:1d"), region: "国内" },
      { name: "共同通信", url: site("47news.jp", KW_CRIME), region: "国内", via: "google" },
      { name: "時事通信", url: site("jiji.com", KW_CRIME), region: "国内", via: "google" },
      // 警察庁・警視庁の公式RSS（新着情報）から、詐欺・犯罪被害の注意喚起だけを取り出す
      { name: "警察庁", url: "https://www.npa.go.jp/newlyarrived/rss20.xml", region: "国内", match: /詐欺|注意|被害|不正|サイバー|犯罪|検挙/ },
      { name: "警視庁", url: "https://www.keishicho.metro.tokyo.lg.jp/rss_news.xml", region: "国内", match: /詐欺|注意|被害|犯罪|防犯|サイバー/ },
      // 国民生活センターは公式RSSがなく site: 検索も固定ページしか出ないため、注意喚起を伝える報道をキーワードで拾う
      {
        name: "Google ニュース（国民生活センター）",
        url: gnewsJa("国民生活センター (注意 OR 注意喚起 OR 相談 OR トラブル) when:2d"),
        region: "国内",
        via: "google",
      },
      {
        name: "消費者庁",
        url: "https://www.caa.go.jp/news.rss",
        region: "国内",
        match: /注意|喚起|詐欺|被害|事故|リコール|悪質|処分|命令|勧告|相談/,
      },
    ],
  },
];

/** 株価・為替・金利など（Yahoo Finance のチャートAPIで取得。TOPIX だけは collect.ts の fetchTopix で日本版から取得） */
export const MARKET_SYMBOLS = [
  { symbol: "^N225", name: "日経平均" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^DJI", name: "NYダウ" },
  { symbol: "JPY=X", name: "ドル円" },
  { symbol: "EURJPY=X", name: "ユーロ円" },
  { symbol: "^TNX", name: "米10年債利回り" },
  { symbol: "^VIX", name: "VIX" },
  { symbol: "CL=F", name: "WTI原油" },
  { symbol: "GC=F", name: "金" },
  { symbol: "BTC-USD", name: "ビットコイン" },
];

/** TDnet で開示を拾う主要企業（証券コード4桁）。足し引き自由 */
export const TDNET_MAJOR: Record<string, string> = {
  "7203": "トヨタ自動車", "7267": "ホンダ", "7201": "日産自動車", "7269": "スズキ", "7270": "SUBARU", "6902": "デンソー",
  "6201": "豊田自動織機", "5108": "ブリヂストン", "6758": "ソニーグループ", "6501": "日立製作所", "6503": "三菱電機",
  "6752": "パナソニックHD", "6702": "富士通", "6861": "キーエンス", "6981": "村田製作所", "6954": "ファナック",
  "6594": "ニデック", "6367": "ダイキン工業", "6273": "SMC", "6301": "コマツ", "6326": "クボタ", "7011": "三菱重工業",
  "7751": "キヤノン", "7741": "HOYA", "7733": "オリンパス", "4901": "富士フイルムHD", "7974": "任天堂",
  "8035": "東京エレクトロン", "6857": "アドバンテスト", "6146": "ディスコ", "6920": "レーザーテック", "6723": "ルネサス",
  "4063": "信越化学工業", "5401": "日本製鉄", "1605": "INPEX", "9984": "ソフトバンクグループ", "9432": "NTT",
  "9433": "KDDI", "9434": "ソフトバンク", "4689": "LINEヤフー", "4755": "楽天グループ", "6098": "リクルートHD",
  "8306": "三菱UFJ FG", "8316": "三井住友FG", "8411": "みずほFG", "8604": "野村HD", "8591": "オリックス",
  "8766": "東京海上HD", "8725": "MS&AD", "6178": "日本郵政", "8058": "三菱商事", "8031": "三井物産", "8001": "伊藤忠商事",
  "8053": "住友商事", "8002": "丸紅", "8801": "三井不動産", "8802": "三菱地所", "9020": "JR東日本", "9022": "JR東海",
  "9101": "日本郵船", "9104": "商船三井", "9201": "日本航空", "9202": "ANAHD", "9501": "東京電力HD", "9983": "ファーストリテイリング",
  "3382": "セブン&アイHD", "2914": "JT", "2802": "味の素", "4452": "花王", "4502": "武田薬品工業", "4519": "中外製薬",
  "4568": "第一三共", "4543": "テルモ", "4661": "オリエンタルランド",
};
