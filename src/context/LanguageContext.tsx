import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { safeGetItem, safeSetItem } from "../utils/storage";
import type { ReportLanguage } from "../utils/reportLanguage";

type LanguageContextValue = {
  language: ReportLanguage;
  setLanguage: (language: ReportLanguage) => void;
  persistenceError: boolean;
  t: (sk: string, en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_KEY = "atap_ui_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<ReportLanguage>(() => safeGetItem(LANGUAGE_KEY) === "en" ? "en" : "sk");
  const [persistenceError, setPersistenceError] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: ReportLanguage) => {
    setPersistenceError(!safeSetItem(LANGUAGE_KEY, next));
    updateLanguage(next);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, persistenceError, t: (sk, en) => language === "en" ? en : sk }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
