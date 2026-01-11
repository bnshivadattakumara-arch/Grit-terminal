import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'DEFAULT' | 'BLOOMBERG' | 'OCEAN' | 'SUN' | 'WHITE' | 'GREY' | 'GLASS' | 'APPLE_GLASS';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('grit_terminal_theme');
    return (saved as Theme) || 'DEFAULT';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('grit_terminal_theme', newTheme);
  };

  useEffect(() => {
    const themeClassMap: Record<Theme, string> = {
      DEFAULT: '',
      BLOOMBERG: 'theme-bloomberg',
      OCEAN: 'theme-ocean',
      SUN: 'theme-sun',
      WHITE: 'theme-white',
      GREY: 'theme-grey',
      GLASS: 'theme-glass',
      APPLE_GLASS: 'theme-apple-glass',
    };

    const body = document.body;
    // Remove all possible theme classes
    Object.values(themeClassMap).forEach(cls => {
      if (cls) body.classList.remove(cls);
    });
    
    // Add active theme class
    const activeClass = themeClassMap[theme];
    if (activeClass) body.classList.add(activeClass);
    
    // Set base colors for transitions
    body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};