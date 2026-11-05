import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morning Brief",
  description: "経済・政治・テクノロジー・AI・株価・犯罪のトレンドニュースを毎朝まとめてお届けします。",
  robots: { index: false, follow: false },
  applicationName: "Morning Brief",
  appleWebApp: { capable: true, title: "Morning Brief", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f1e3a" },
    { media: "(prefers-color-scheme: dark)", color: "#070d19" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
