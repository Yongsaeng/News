/** 一時的なRSS確認用スクリプト その2 */
import Parser from "rss-parser";
const UA = "Mozilla/5.0 (compatible; news-digest/1.0)";
const parser = new Parser({ timeout: 15000, headers: { "User-Agent": UA } });
const gn = (q: string, en = false) =>
  en
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`;
const C: [string, string][] = [
  ["警察庁 新着", "https://www.npa.go.jp/newlyarrived/rss20.xml"],
  ["警視庁 新着", "https://www.keishicho.metro.tokyo.lg.jp/rss_news.xml"],
  ["TDnet GN kw", gn("適時開示 when:1d")],
  ["ロイター kw", gn("ロイター when:1d")],
];
const SITES = ["https://www.jiji.com/jc/info?p=rss", "https://www.cnbc.com/rss-feeds/", "https://www.caa.go.jp/rss/", "https://www.kokusen.go.jp/sitemap.html", "https://www.kokusen.go.jp/news/news.html"];
const race = <T,>(p: Promise<T>, ms: number, label: string) =>
  Promise.race([p, new Promise<string>((r) => setTimeout(() => r(`TIMEOUT | ${label}`), ms))]);
async function probe([name, url]: [string, string]) {
  try {
    const f = await parser.parseURL(url);
    const now = Date.now();
    const dates = f.items.map((i) => (i.isoDate ? Date.parse(i.isoDate) : NaN)).filter((d) => !Number.isNaN(d));
    const recent = dates.filter((d) => now - d < 36 * 3600e3).length;
    const newest = dates.length ? new Date(Math.max(...dates)).toISOString() : "-";
    const firsts = f.items.slice(0, 12).map((i) => `${i.title?.slice(0, 45)} <${(i.link || "").slice(0, 70)}> [${i.isoDate}] {${((i as any).source?.url ?? (i as any).source ?? "")}}`).join("\n      ");
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
    const a = [...t.matchAll(/href=["']([^"']*(?:rss|\.rdf|\.xml|atom|feed)[^"']*)["']/gi)].map((m) => m[1]).slice(0, 60);
    return `DISC | ${url} | HTTP ${r.status} | alt=${JSON.stringify(links)} | a=${JSON.stringify([...new Set(a)])}`;
  } catch (e) {
    return `DISC | ${url} | error ${String(e).slice(0, 80)}`;
  }
}
async function topix() {
  for (const u of [] as string[]) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      console.log(`STOOQ ${u} HTTP ${r.status} ${JSON.stringify(t.slice(0, 200))} ... ${JSON.stringify(t.slice(-120))}`);
    } catch (e) { console.log("STOOQ err", String(e).slice(0, 80)); }
  }
  try {
    const r = await fetch("https://finance.yahoo.co.jp/quote/998405.T", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log("YJ title:", t.match(/<title>[^<]*/)?.[0], "desc:", t.match(/<meta name="description" content="[^"]*/)?.[0]);
    for (const k of ["現在値", "前日比", "wordKey\\\\\\\":\\\\\\\"price", "_StyledNumber__value"]) {
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
