import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext({
  settings: {
    largeText: false,
    highContrast: false,
    reduceMotion: false,
    screenReader: false
  },
  toggleSetting: () => {}
});

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('tg_accessibility');
      return saved ? JSON.parse(saved) : {
        largeText: false,
        highContrast: false,
        reduceMotion: false,
        screenReader: false
      };
    } catch (e) {
      return {
        largeText: false,
        highContrast: false,
        reduceMotion: false,
        screenReader: false
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('tg_accessibility', JSON.stringify(settings));
    
    const root = document.documentElement;
    
    if (settings.largeText) root.setAttribute('data-a11y-large-text', 'true');
    else root.removeAttribute('data-a11y-large-text');
    
    if (settings.highContrast) root.setAttribute('data-a11y-high-contrast', 'true');
    else root.removeAttribute('data-a11y-high-contrast');
    
    if (settings.reduceMotion) root.setAttribute('data-a11y-reduce-motion', 'true');
    else root.removeAttribute('data-a11y-reduce-motion');
    
  }, [settings]);

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AccessibilityContext.Provider value={{ settings, toggleSetting }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessibility() {
  return useContext(AccessibilityContext);
}
