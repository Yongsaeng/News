"use client";

import { useSyncExternalStore } from "react";
import type { Term } from "./types";

/** 単語帳に入った言葉。覚えた言葉は記事中でタップできなくなる */
export interface VocabEntry extends Term {
  learnedAt: string;
  articleTitle: string;
  url: string;
}

/** 意味を表示中の言葉 */
export interface ActiveTerm extends Term {
  articleTitle: string;
  url: string;
}

const KEY = "morning-brief:vocab";
const EVENT = "morning-brief:vocab-change";

let cache: VocabEntry[] | null = null;
const EMPTY: VocabEntry[] = [];

function read(): VocabEntry[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || "[]") as VocabEntry[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: VocabEntry[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 保存できない環境（プライベートブラウズなど）では、このページを開いている間だけ覚えておく
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useVocab(): VocabEntry[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function learn(term: ActiveTerm) {
  const list = read();
  if (list.some((v) => v.word === term.word)) return;
  write([{ ...term, learnedAt: new Date().toISOString() }, ...list]);
}

export function forget(word: string) {
  write(read().filter((v) => v.word !== word));
}

/* 意味を表示中の言葉（ページ全体で1つ） */
let active: ActiveTerm | null = null;
const ACTIVE_EVENT = "morning-brief:active-term";

export function openTerm(t: ActiveTerm | null) {
  active = t;
  window.dispatchEvent(new Event(ACTIVE_EVENT));
}

export function useActiveTerm(): ActiveTerm | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(ACTIVE_EVENT, cb);
      return () => window.removeEventListener(ACTIVE_EVENT, cb);
    },
    () => active,
    () => null,
  );
}
