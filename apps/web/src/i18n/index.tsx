import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { LOCALES, type LocaleKey, type Translations } from './locales';

const RTL_LOCALES = new Set<LocaleKey>(['ar']);

interface LangContextValue {
  locale: LocaleKey;
  t: Translations;
  setLocale: (l: LocaleKey) => void;
  isRTL: boolean;
}

const LangContext = createContext<LangContextValue>({
  locale: 'en',
  t: LOCALES.en,
  setLocale: () => {},
  isRTL: false,
});

const STORAGE_KEY = 'df_ui_lang';

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LocaleKey | null;
    return stored && stored in LOCALES ? stored : 'en';
  });

  const setLocale = (l: LocaleKey) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const isRTL = RTL_LOCALES.has(locale);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', locale);
  }, [locale, isRTL]);

  return (
    <LangContext.Provider value={{ locale, t: LOCALES[locale], setLocale, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export { type LocaleKey };
