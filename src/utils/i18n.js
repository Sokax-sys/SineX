import { useState, useEffect, useCallback } from "react";
import { storage, STORAGE_KEYS } from "./storage";
import en from "../locales/en.json";

const locales = { en };

function getLang() {
  const tmdbLang = storage.get(STORAGE_KEYS.TMDB_LANG) || "en-US";
  return tmdbLang.split("-")[0];
}

function lookup(key, obj) {
  return obj?.[key];
}

let loaded = { en: true };
const loading = {};

export async function ensureLocale(lang) {
  if (loaded[lang] || loading[lang]) return;
  loading[lang] = true;
  try {
    const mod = await import(`../locales/${lang}.json`);
    locales[lang] = mod.default;
    loaded[lang] = true;
  } catch {
    loaded[lang] = true; // mark as loaded so we don't retry
  }
}

export function t(key, params) {
  const lang = getLang();
  const locale = locales[lang];
  let text = lookup(key, locale) || lookup(key, en) || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
    });
  }
  return text;
}

export function useTranslate() {
  const [, setTick] = useState(0);

  const currentLang = getLang();

  useEffect(() => {
    ensureLocale(currentLang).then(() => setTick((n) => n + 1));
  }, [currentLang]);

  useEffect(() => {
    const handler = () => setTick((n) => n + 1);
    window.addEventListener("sinex:tmdb-lang-changed", handler);
    return () => window.removeEventListener("sinex:tmdb-lang-changed", handler);
  }, []);

  return useCallback(
    (key, params) => t(key, params),
    [currentLang],
  );
}
