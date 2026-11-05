import DigestView from "@/components/DigestView";
import { listDigests } from "@/lib/digests";

export default function Home() {
  const all = listDigests();
  const digest = all[0];
  if (!digest) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-bold">まだまとめがありません</h1>
        <p className="mt-4 text-muted">
          <code>npm run fetch</code> を実行すると、今日のニュースが表示されます。
        </p>
      </main>
    );
  }
  return <DigestView digest={digest} all={all} />;
}
