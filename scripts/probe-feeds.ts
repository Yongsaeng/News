/** 一時的なRSS確認用スクリプト（GitHub Actions で実行）。候補URLが取得できるか確かめる */
import Parser from "rss-parser";
const UA = "Mozilla/5.0 (compatible; news-digest/1.0)";
const parser = new Parser({ timeout: 15000, headers: { "User-Agent": UA } });
const gn = (q: string, en = false) =>
  en
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`;

const C: [string, string][] = [
  ["ロイター日本 RSS", "https://jp.reuters.com/rss/businessNews"],
  ["ロイター日本 RSS2", "https://assets.wor.jp/rss/rdf/reuters/top.rdf"],
  ["ロイター日本 GN経済", gn("site:jp.reuters.com/business when:1d")],
  ["ロイター日本 GN経済2", gn("site:jp.reuters.com/economy when:1d")],
  ["ロイター日本 GNマーケット", gn("site:jp.reuters.com/markets when:1d")],
  ["Reuters RSS", "https://www.reuters.com/rssFeed/businessNews"],
  ["Reuters GN business", gn("site:reuters.com/business when:1d", true)],
  ["Reuters GN world", gn("site:reuters.com/world when:1d", true)],
  ["Bloomberg JP GN", gn("site:bloomberg.co.jp when:1d")],
  ["Bloomberg JP RSS", "https://www.bloomberg.co.jp/feeds/sitemap_news.xml"],
  ["Bloomberg EN business", "https://feeds.bloomberg.com/business/news.rss"],
  ["Bloomberg EN economics", "https://feeds.bloomberg.com/economics/news.rss"],
  ["Bloomberg EN markets", "https://feeds.bloomberg.com/markets/news.rss"],
  ["Bloomberg EN politics", "https://feeds.bloomberg.com/politics/news.rss"],
  ["日経 RSS", "https://www.nikkei.com/rss/news/economy.rdf"],
  ["日経 GN経済", gn("site:nikkei.com/article (経済 OR 景気 OR 物価 OR 日銀 OR 企業) when:1d")],
  ["日経 GN all", gn("site:nikkei.com when:1d")],
  ["時事 RSS1", "https://www.jiji.com/rss/ranking.rdf"],
  ["時事 RSS2", "https://www.jiji.com/jc/rss"],
  ["時事 GN", gn("site:jiji.com when:1d")],
  ["時事 GN経済", gn("site:jiji.com (経済 OR 景気 OR 日銀 OR 企業 OR 決算) when:1d")],
  ["時事 GN政治", gn("site:jiji.com (政府 OR 首相 OR 国会 OR 自民 OR 与党 OR 野党) when:1d")],
  ["時事 GN社会", gn("site:jiji.com (逮捕 OR 容疑 OR 事件 OR 詐欺 OR 警察) when:1d")],
  ["共同 RSS", "https://www.kyodo.co.jp/feed/"],
  ["共同 GN kyodo", gn("site:kyodo.co.jp when:1d")],
  ["共同 GN 47news", gn("site:47news.jp when:1d")],
  ["共同 GN 47政治", gn("site:47news.jp (政府 OR 首相 OR 国会 OR 自民 OR 与党 OR 野党) when:1d")],
  ["共同 GN 47社会", gn("site:47news.jp (逮捕 OR 容疑 OR 事件 OR 詐欺 OR 警察) when:1d")],
  ["共同 GN 共同通信", gn("共同通信 政治 when:1d")],
  ["AP RSS", "https://apnews.com/world-news.rss"],
  ["AP RSS2", "https://feeds.apnews.com/rss/apf-intlnews"],
  ["AP GN world", gn("site:apnews.com/article world when:1d", true)],
  ["AP GN all", gn("site:apnews.com when:1d", true)],
  ["Impress Watch", "https://www.watch.impress.co.jp/data/rss/1.0/ipw/feed.rdf"],
  ["Publickey", "https://www.publickey1.jp/atom.xml"],
  ["GIGAZINE", "https://gigazine.net/news/rss_2.0/"],
  ["Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"],
  ["WIRED", "https://www.wired.com/feed/rss"],
  ["HN RSS", "https://news.ycombinator.com/rss"],
  ["OpenAI", "https://openai.com/news/rss.xml"],
  ["Anthropic RSS", "https://www.anthropic.com/rss.xml"],
  ["Anthropic RSS2", "https://www.anthropic.com/news/rss.xml"],
  ["Anthropic GN", gn("site:anthropic.com", true)],
  ["DeepMind", "https://deepmind.google/blog/rss.xml"],
  ["DeepMind2", "https://deepmind.google/discover/blog/rss.xml"],
  ["Meta AI RSS", "https://ai.meta.com/blog/rss/"],
  ["Meta AI GN", gn("site:ai.meta.com/blog", true)],
  ["The Decoder", "https://the-decoder.com/feed/"],
  ["MIT TR AI", "https://www.technologyreview.com/topic/artificial-intelligence/feed"],
  ["MIT TR all", "https://www.technologyreview.com/feed/"],
  ["VentureBeat AI", "https://venturebeat.com/category/ai/feed/"],
  ["VentureBeat all", "https://venturebeat.com/feed/"],
  ["AINOW", "https://ainow.ai/feed/"],
  ["xTECH index", "https://xtech.nikkei.com/rss/index.rdf"],
  ["xTECH IT", "https://xtech.nikkei.com/rss/xtech-it.rdf"],
  ["xTECH GN AI", gn("site:xtech.nikkei.com (AI OR 生成AI OR 人工知能) when:2d")],
  ["株探 RSS", "https://kabutan.jp/rss/news.xml"],
  ["株探 RSS2", "https://kabutan.jp/news/marketnews/rss"],
  ["株探 GN", gn("site:kabutan.jp when:1d")],
  ["みんかぶ RSS", "https://minkabu.jp/news/rss"],
  ["みんかぶ RSS2", "https://assets.minkabu.jp/news/rss"],
  ["みんかぶ GN", gn("site:minkabu.jp when:1d")],
  ["CNBC 100003114", "https://www.cnbc.com/id/100003114/device/rss/rss.html"],
  ["CNBC 20910258", "https://www.cnbc.com/id/20910258/device/rss/rss.html"],
  ["CNBC 10000664", "https://www.cnbc.com/id/10000664/device/rss/rss.html"],
  ["CNBC 15839069", "https://www.cnbc.com/id/15839069/device/rss/rss.html"],
  ["CNBC 10001147", "https://www.cnbc.com/id/10001147/device/rss/rss.html"],
  ["MW topstories", "https://feeds.content.dowjones.io/public/rss/mw_topstories"],
  ["MW marketpulse", "https://feeds.content.dowjones.io/public/rss/mw_marketpulse"],
  ["MW realtime", "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines"],
  ["MW old", "https://feeds.marketwatch.com/marketwatch/topstories/"],
  ["TDnet GN", gn("site:release.tdnet.info")],
  ["TDnet RSS", "https://www.release.tdnet.info/inbs/rss.xml"],
  ["警察庁 RSS", "https://www.npa.go.jp/rss/index.xml"],
  ["警察庁 RSS2", "https://www.npa.go.jp/news/rss.xml"],
  ["警察庁 GN", gn("site:npa.go.jp 詐欺")],
  ["警視庁 RSS", "https://www.keishicho.metro.tokyo.lg.jp/rss/index.xml"],
  ["警視庁 RSS2", "https://www.keishicho.metro.tokyo.lg.jp/news.rss"],
  ["警視庁 GN", gn("site:keishicho.metro.tokyo.lg.jp 詐欺")],
  ["消費者庁 RSS", "https://www.caa.go.jp/news.rss"],
  ["消費者庁 RSS2", "https://www.caa.go.jp/rss/news.xml"],
  ["消費者庁 GN", gn("site:caa.go.jp 注意")],
  ["国民生活C RSS", "https://www.kokusen.go.jp/rss/news.xml"],
  ["国民生活C RSS2", "https://www.kokusen.go.jp/news/rss.xml"],
  ["国民生活C RSS3", "https://www.kokusen.go.jp/rss/kokusen.xml"],
  ["国民生活C GN", gn("site:kokusen.go.jp")],
];

async function raw(url: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    return `HTTP ${r.status} ${r.headers.get("content-type")} len=${t.length} head=${JSON.stringify(t.slice(0, 120))}`;
  } catch (e) {
    return `fetch error ${String(e).slice(0, 100)}`;
  }
}

async function probe([name, url]: [string, string]) {
  try {
    const f = await parser.parseURL(url);
    const now = Date.now();
    const dates = f.items.map((i) => (i.isoDate ? Date.parse(i.isoDate) : NaN)).filter((d) => !Number.isNaN(d));
    const recent = dates.filter((d) => now - d < 36 * 3600e3).length;
    const newest = dates.length ? new Date(Math.max(...dates)).toISOString() : "-";
    const snip = (f.items[0]?.contentSnippet || "").slice(0, 60).replace(/\s+/g, " ");
    return `OK   | ${name} | items=${f.items.length} 36h=${recent} newest=${newest} | title=${f.title} | first=${f.items[0]?.title?.slice(0, 60)} | snip=${snip}`;
  } catch (e) {
    return `FAIL | ${name} | ${String(e).slice(0, 100)} | ${await raw(url)}`;
  }
}

async function quote(sym: string) {
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`, { headers: { "User-Agent": UA } });
    const j = await r.json();
    return `${sym}: HTTP ${r.status} price=${j.chart?.result?.[0]?.meta?.regularMarketPrice} err=${JSON.stringify(j.chart?.error)}`;
  } catch (e) {
    return `${sym}: error ${String(e).slice(0, 80)}`;
  }
}

async function main() {
  const out = await Promise.all(C.map(probe));
  console.log(out.join("\n"));
  for (const s of ["^TNX", "^VIX", "EURJPY=X", "CL=F", "GC=F", "BTC-USD", "^TOPX", "998405.T", "^TPX", "1306.T"]) console.log(await quote(s));
  console.log("YJ TOPIX:", await raw("https://finance.yahoo.co.jp/quote/998405.T"));
  try {
    const r = await fetch("https://finance.yahoo.co.jp/quote/998405.T", { headers: { "User-Agent": UA } });
    const t = await r.text();
    const m = t.match(/"price":"?([\d,.]+)/) || t.match(/_3rXWJKZF[^>]*>([\d,.]+)</);
    console.log("YJ TOPIX price guess:", m?.[1], t.includes("TOPIX"));
  } catch (e) { console.log("YJ err", e); }
  const ids: number[] = await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")).json();
  console.log("HN API top ids:", ids.length);
}
main();
