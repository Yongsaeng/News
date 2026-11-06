/** 一時的なRSS確認用スクリプト その2 */
import Parser from "rss-parser";
const UA = "Mozilla/5.0 (compatible; news-digest/1.0)";
const parser = new Parser({ timeout: 15000, headers: { "User-Agent": UA } });
const gn = (q: string, en = false) =>
  en
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`;
const C: [string, string][] = [
  ["ロイター日本 GN all", gn("site:jp.reuters.com when:1d")],
  ["ロイター日本 GN all7", gn("site:jp.reuters.com when:7d")],
  ["ロイター日本 GN kw", gn("ロイター 経済 when:1d")],
  ["ロイター日本 GN kw2", gn("\"ロイター\" 株 OR 円 OR 日銀 when:1d")],
  ["Bloomberg JP GN news", gn("site:bloomberg.co.jp/news when:1d")],
  ["Bloomberg JP GN 2d", gn("site:bloomberg.co.jp when:2d")],
  ["Bloomberg JP GN kw", gn("ブルームバーグ when:1d")],
  ["Meta AI GN 30d", gn("site:ai.meta.com when:30d", true)],
  ["Meta AI GN about", gn("site:about.fb.com AI when:7d", true)],
  ["VentureBeat AI", "https://venturebeat.com/category/ai/feed/"],
  ["VentureBeat GN", gn("site:venturebeat.com AI when:2d", true)],
  ["CNBC 20409666", "https://www.cnbc.com/id/20409666/device/rss/rss.html"],
  ["CNBC 15839135", "https://www.cnbc.com/id/15839135/device/rss/rss.html"],
  ["CNBC 100646281", "https://www.cnbc.com/id/100646281/device/rss/rss.html"],
  ["CNBC 10000527", "https://www.cnbc.com/id/10000527/device/rss/rss.html"],
  ["CNBC 19854910", "https://www.cnbc.com/id/19854910/device/rss/rss.html"],
  ["国民生活C news.rdf", "https://www.kokusen.go.jp/news/news.rdf"],
  ["国民生活C rss.rdf", "https://www.kokusen.go.jp/rss/news.rdf"],
  ["国民生活C index.rdf", "https://www.kokusen.go.jp/index.rdf"],
  ["国民生活C GN kw", gn("国民生活センター 注意 when:7d")],
  ["警察庁 GN kw", gn("警察庁 詐欺 注意 when:3d")],
  ["警視庁 GN kw", gn("警視庁 詐欺 注意喚起 when:3d")],
  ["TDnet GN kw", gn("適時開示 when:1d")],
];
const SITES = [
  "https://www.kokusen.go.jp/", "https://www.npa.go.jp/", "https://www.keishicho.metro.tokyo.lg.jp/",
  "https://www.keishicho.metro.tokyo.lg.jp/kurashi/tokushu/furikome/index.html", "https://www.npa.go.jp/bureau/criminal/souni/tokusyusagi/index.html",
  "https://kabutan.jp/", "https://minkabu.jp/", "https://www.jiji.com/", "https://jp.reuters.com/", "https://www.bloomberg.co.jp/",
  "https://ai.meta.com/blog/", "https://www.cnbc.com/markets/", "https://www.anthropic.com/news", "https://www.release.tdnet.info/inbs/I_main_00.html",
  "https://www.47news.jp/", "https://www.caa.go.jp/",
];
const race = <T,>(p: Promise<T>, ms: number, label: string) =>
  Promise.race([p, new Promise<string>((r) => setTimeout(() => r(`TIMEOUT | ${label}`), ms))]);
async function probe([name, url]: [string, string]) {
  try {
    const f = await parser.parseURL(url);
    const now = Date.now();
    const dates = f.items.map((i) => (i.isoDate ? Date.parse(i.isoDate) : NaN)).filter((d) => !Number.isNaN(d));
    const recent = dates.filter((d) => now - d < 36 * 3600e3).length;
    const newest = dates.length ? new Date(Math.max(...dates)).toISOString() : "-";
    const firsts = f.items.slice(0, 4).map((i) => i.title?.slice(0, 50)).join(" / ");
    return `OK   | ${name} | items=${f.items.length} 36h=${recent} newest=${newest} | title=${f.title} | ${firsts}`;
  } catch (e) {
    return `FAIL | ${name} | ${String(e).slice(0, 100)}`;
  }
}
async function discover(url: string) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    const links = [...t.matchAll(/<link[^>]+(?:rss|atom)\+xml[^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)/)?.[1]);
    const a = [...t.matchAll(/href=["']([^"']*(?:rss|\.rdf|atom|feed)[^"']*)["']/gi)].map((m) => m[1]).slice(0, 8);
    return `DISC | ${url} | HTTP ${r.status} | alt=${JSON.stringify(links)} | a=${JSON.stringify([...new Set(a)])}`;
  } catch (e) {
    return `DISC | ${url} | error ${String(e).slice(0, 80)}`;
  }
}
async function topix() {
  for (const u of ["https://stooq.com/q/l/?s=^tpx&f=sd2t2ohlcv&h&e=csv", "https://stooq.com/q/d/l/?s=^tpx&i=d"]) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      console.log(`STOOQ ${u} HTTP ${r.status} ${JSON.stringify(t.slice(0, 200))} ... ${JSON.stringify(t.slice(-120))}`);
    } catch (e) { console.log("STOOQ err", String(e).slice(0, 80)); }
  }
  try {
    const r = await fetch("https://finance.yahoo.co.jp/quote/998405.T", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    for (const k of ["\"price\"", "previousPrice", "changePrice", "PRELOADED"]) {
      const i = t.indexOf(k);
      console.log(`YJ ${k} @${i}: ${JSON.stringify(t.slice(Math.max(0, i - 60), i + 160))}`);
    }
  } catch (e) { console.log("YJ err", e); }
}
async function main() {
  setTimeout(() => { console.log("全体タイムアウト"); process.exit(0); }, 150000);
  await Promise.all([
    ...C.map((c) => race(probe(c), 40000, c[0]).then((l) => console.log(l))),
    ...SITES.map((s) => race(discover(s), 30000, s).then((l) => console.log(l))),
  ]);
  await topix();
  process.exit(0);
}
main();
