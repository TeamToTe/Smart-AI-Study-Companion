import React, { useState, useEffect } from 'react';
import { Loader2, Terminal, CheckCircle2, ChevronRight } from 'lucide-react';
import './SkeletonLoader.css';

export default function SkeletonLoader({ t }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    t('loaderStep1'),
    t('loaderStep2'),
    t('loaderStep3'),
    t('loaderStep4'),
    t('loaderStep5'),
    t('loaderStep6')
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3500); // Progress to next step every 3.5 seconds

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="loader-container animate-fade-in">
      <div className="loader-card glass">
        <div className="loader-header">
          <div className="loader-status">
            <Loader2 className="spinner" size={24} />
            <h2>{t('analyzingVideo')}</h2>
          </div>
          <span className="loader-percentage">{Math.min(Math.round(((activeStep + 1) / steps.length) * 100), 100)}%</span>
        </div>

        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="terminal-panel">
          <div className="terminal-header">
            <Terminal size={14} className="terminal-icon" />
            <span>study-companion-pipeline.log</span>
            <div className="terminal-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
          </div>
          <div className="terminal-body">
            {steps.map((step, idx) => {
              if (idx > activeStep) return null;
              const isCompleted = idx < activeStep;
              return (
                <div key={idx} className={`terminal-line ${isCompleted ? 'completed' : 'active'}`}>
                  {isCompleted ? (
                    <CheckCircle2 size={14} className="line-icon success" />
                  ) : (
                    <ChevronRight size={14} className="line-icon active-caret" />
                  )}
                  <span className="line-text">{step}</span>
                  {!isCompleted && <span className="caret">|</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shimmering Skeleton Elements */}
        <div className="skeleton-grid">
          <div className="skeleton-left">
            <div className="skeleton-video pulse"></div>
            <div className="skeleton-line pulse"></div>
            <div className="skeleton-line short pulse"></div>
          </div>
          <div className="skeleton-right">
            <div className="skeleton-line pulse"></div>
            <div className="skeleton-line pulse"></div>
            <div className="skeleton-line pulse"></div>
            <div className="skeleton-line short pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
