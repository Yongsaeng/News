import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Brief",
  description: "経済・政治・テクノロジー・株価・犯罪のトレンドニュースを毎朝まとめてお届けします。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
