import fs from "node:fs";
import path from "node:path";
import type { Digest } from "./types";

const DIR = path.join(process.cwd(), "data", "digests");

export function listDigests(): Digest[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Digest)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getDigest(date?: string): Digest | undefined {
  const all = listDigests();
  return date ? all.find((d) => d.date === date) : all[0];
}

export function formatDateJa(date: string): string {
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(`${date}T12:00:00Z`).getUTCDay()];
  const [y, m, day] = date.split("-").map(Number);
  return `${y}年${m}月${day}日（${w}）`;
}
