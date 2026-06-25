import React from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle({ theme, toggleTheme, t }) {
  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
      aria-label="Toggle Theme"
    >
      <div className={`icon-container ${theme}`}>
        {theme === 'dark' ? (
          <Moon className="theme-icon moon-icon" size={18} />
        ) : (
          <Sun className="theme-icon sun-icon" size={18} />
        )}
      </div>
    </button>
  );
}
