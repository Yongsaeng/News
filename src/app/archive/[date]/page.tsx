import { notFound } from "next/navigation";
import DigestView from "@/components/DigestView";
import { getDigest, listDigests } from "@/lib/digests";

export function generateStaticParams() {
  return listDigests().map((d) => ({ date: d.date }));
}

export default async function ArchivePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const digest = getDigest(date);
  if (!digest) notFound();
  return <DigestView digest={digest} all={listDigests()} />;
}
