import React from 'react';
import './LanguageToggle.css';

export default function LanguageToggle({ lang, setLang }) {
  return (
    <div className="lang-toggle-container">
      <button 
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button 
        className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
        onClick={() => setLang('vi')}
      >
        VI
      </button>
      <div className={`lang-slider active-${lang}`} />
    </div>
  );
}
