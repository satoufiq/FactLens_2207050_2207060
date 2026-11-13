import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'bn' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (bn: string, en: string) => string;
}

const defaultLanguageContext: LanguageContextType = {
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (_bn: string, en: string) => en,
};

const LanguageContext = createContext<LanguageContextType>(defaultLanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('factlens_lang');
    return (saved === 'en' || saved === 'bn') ? saved : 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('factlens_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'bn' ? 'en' : 'bn');
  };

  const t = (bn: string, en: string) => {
    return lang === 'bn' ? bn : en;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  return context || defaultLanguageContext;
};
