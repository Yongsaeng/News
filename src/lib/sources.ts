import type { CategoryId } from "./types";

export interface Feed {
  name: string;
  url: string;
  region: "国内" | "海外";
}

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  feeds: Feed[];
}

const gnewsJa = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`;
const gnewsTopicJa = (topic: string) =>
  `https://news.google.com/rss/headlines/section/topic/${topic}?hl=ja&gl=JP&ceid=JP:ja`;
const gnewsTopicEn = (topic: string) =>
  `https://news.google.com/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`;

/**
 * カテゴリごとのニュースソース。
 * 取得できないフィードは自動でスキップされるので、自由に足し引きしてください。
 */
export const CATEGORIES: CategoryConfig[] = [
  {
    id: "economy",
    name: "経済",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat5.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/business.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsTopicJa("BUSINESS"), region: "国内" },
      { name: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml", region: "海外" },
      { name: "Google News", url: gnewsTopicEn("BUSINESS"), region: "海外" },
    ],
  },
  {
    id: "politics",
    name: "政治",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat4.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/domestic.xml", region: "国内" },
      { name: "Yahoo!ニュース 国際", url: "https://news.yahoo.co.jp/rss/topics/world.xml", region: "海外" },
      { name: "NHK 国際", url: "https://www3.nhk.or.jp/rss/news/cat6.xml", region: "海外" },
      { name: "BBC", url: "https://feeds.bbci.co.uk/news/politics/rss.xml", region: "海外" },
      { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "海外" },
    ],
  },
  {
    id: "tech",
    name: "テクノロジー",
    feeds: [
      { name: "ITmedia", url: "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml", region: "国内" },
      { name: "Yahoo!ニュース", url: "https://news.yahoo.co.jp/rss/topics/it.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsTopicJa("TECHNOLOGY"), region: "国内" },
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", region: "海外" },
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", region: "海外" },
    ],
  },
  {
    id: "ai",
    name: "AI",
    feeds: [
      { name: "ITmedia AI+", url: "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsJa("生成AI OR 人工知能 when:1d"), region: "国内" },
      { name: "TechCrunch", url: "https://techcrunch.com/category/artificial-intelligence/feed/", region: "海外" },
      { name: "The Verge", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", region: "海外" },
    ],
  },
  {
    id: "markets",
    name: "株価・マーケット",
    feeds: [
      { name: "Google ニュース", url: gnewsJa("株価 OR 日経平均 OR 為替 when:1d"), region: "国内" },
      { name: "Google News", url: `https://news.google.com/rss/search?q=${encodeURIComponent("stock market when:1d")}&hl=en-US&gl=US&ceid=US:en`, region: "海外" },
    ],
  },
  {
    id: "crime",
    name: "犯罪・事件",
    feeds: [
      { name: "NHK", url: "https://www3.nhk.or.jp/rss/news/cat1.xml", region: "国内" },
      { name: "Google ニュース", url: gnewsJa("事件 OR 逮捕 OR 詐欺 when:1d"), region: "国内" },
      { name: "Google News", url: `https://news.google.com/rss/search?q=${encodeURIComponent("crime arrested when:1d")}&hl=en-US&gl=US&ceid=US:en`, region: "海外" },
    ],
  },
];

/** 株価・為替（Yahoo Finance のチャートAPIで取得） */
export const MARKET_SYMBOLS = [
  { symbol: "^N225", name: "日経平均" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^DJI", name: "NYダウ" },
  { symbol: "JPY=X", name: "ドル円" },
];
