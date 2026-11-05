import type { MetadataRoute } from "next";

/** ホーム画面に追加したとき、アプリのように全画面で開く */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Morning Brief",
    short_name: "Brief",
    description: "毎朝のトレンドニュースまとめ",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1e3a",
    theme_color: "#0f1e3a",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
