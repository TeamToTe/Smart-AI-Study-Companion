import React, { useState } from 'react';
import { ArrowRight, BookOpen, MessageSquare, BrainCircuit, CheckSquare, Sparkles, Trash2, Play } from 'lucide-react';
import './LandingPage.css';

// Inline YouTube SVG icon to avoid missing brand icons in newer Lucide versions
const Youtube = ({ size = 24, className }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

export default function LandingPage({ onSubmit, history, onDeleteHistory, onClearHistory, examples, t }) {
  const [url, setUrl] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const handleExampleClick = (exampleUrl) => {
    setUrl(exampleUrl);
    onSubmit(exampleUrl);
  };

  return (
    <div className="landing-container animate-fade-in">
      <div className="hero-section">
        <div className="badge">
          <Sparkles size={14} className="badge-icon" />
          <span>{t('betaVersion')}</span>
        </div>
        <h1 className="hero-title">
          {t('heroTitlePart1')} <span className="text-gradient">StudyMind</span>
        </h1>
        <p className="hero-subtitle">
          {t('heroSubtitle')}
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="input-form">
        <div className="input-wrapper">
          <Youtube className="yt-icon" size={24} />
          <input
            type="text"
            placeholder={t('inputPlaceholder')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="url-input"
            required
          />
          <button type="submit" className="submit-btn btn-primary">
            <span>{t('startStudying')}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </form>

      <div className="examples-section">
        <p className="examples-title">{t('tryTheseExamples')}</p>
        <div className="examples-grid">
          {examples.map((ex, index) => (
            <button 
              key={index} 
              className="example-card"
              onClick={() => handleExampleClick(ex.url)}
              type="button"
            >
              <Youtube size={16} className="example-yt-icon" />
              <span>{ex.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Study History Panel */}
      {history && history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h2>{t('studyHistory')}</h2>
            <button className="clear-history-btn" onClick={onClearHistory}>
              {t('clearHistory')}
            </button>
          </div>
          <div className="history-grid">
            {history.map((item, idx) => {
              // Extract YouTube video ID
              const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
              const match = item.url.match(regExp);
              const videoId = match ? match[2] : null;
              const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

              return (
                <div key={idx} className="history-card glass" onClick={() => onSubmit(item.url)}>
                  <div className="history-thumbnail-wrapper">
                    {thumbnail ? (
                      <img src={thumbnail} alt={item.title} className="history-thumbnail" />
                    ) : (
                      <div className="history-thumbnail-placeholder">
                        <Youtube size={24} />
                      </div>
                    )}
                    <div className="history-card-overlay">
                      <Play size={20} fill="white" className="history-play-icon" />
                    </div>
                  </div>
                  <div className="history-info">
                    <h3 className="history-item-title" title={item.title}>
                      {item.title}
                    </h3>
                    <div className="history-item-meta">
                      <span className="history-item-date">{t('studiedOn')}: {item.date}</span>
                      <button 
                        className="history-delete-btn" 
                        onClick={(e) => onDeleteHistory(item.url, e)}
                        title="Remove from history"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrapper blue">
            <BookOpen size={24} />
          </div>
          <h3>{t('feature1Title')}</h3>
          <p>{t('feature1Desc')}</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper emerald">
            <Sparkles size={24} />
          </div>
          <h3>{t('feature2Title')}</h3>
          <p>{t('feature2Desc')}</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper purple">
            <MessageSquare size={24} />
          </div>
          <h3>{t('feature3Title')}</h3>
          <p>{t('feature3Desc')}</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper amber">
            <BrainCircuit size={24} />
          </div>
          <h3>{t('feature4Title')}</h3>
          <p>{t('feature4Desc')}</p>
        </div>
      </div>
    </div>
  );
}
