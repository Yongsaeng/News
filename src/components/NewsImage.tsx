"use client";

import { useState } from "react";

/**
 * 記事の画像。読み込めない・画像がないときはカテゴリ色の代替画像を出す。
 * 元サイトの直リンクなので referrer は送らない。
 */
export default function NewsImage({
  src,
  accent,
  label,
  className = "",
}: {
  src?: string;
  accent: string;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`relative overflow-hidden ${className}`}
        style={{
          background: `radial-gradient(120% 90% at 85% 10%, color-mix(in oklab, ${accent} 75%, white) 0%, transparent 55%), linear-gradient(135deg, color-mix(in oklab, ${accent} 85%, black) 0%, color-mix(in oklab, ${accent} 45%, #0f1e3a) 100%)`,
        }}
      >
        <span className="absolute -right-2 -bottom-4 text-[min(28vw,7rem)] leading-none font-black text-white/15 select-none">
          {label}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
