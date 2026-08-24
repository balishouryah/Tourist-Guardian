import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, SUPPORTED_LANGUAGES } from './translations';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('tg_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('tg_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    if (!key) return '';
    
    // Get translations for current language
    const currentTranslations = translations[language] || {};
    
    // Return translation if exists
    if (currentTranslations[key]) {
      return currentTranslations[key];
    }
    
    // Fallback to English if translation is missing
    const fallbackTranslations = translations['en'] || {};
    if (fallbackTranslations[key]) {
      return fallbackTranslations[key];
    }
    
    // Return the key itself if not found anywhere
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
