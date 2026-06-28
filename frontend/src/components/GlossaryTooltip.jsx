import React from 'react';
import './GlossaryTooltip.css';

export default function GlossaryTooltip({ termData, position, visible }) {
  if (!visible || !termData) return null;

  // Render tooltip absolute positioned
  return (
    <div 
      className="glossary-tooltip glass"
      style={{ 
        top: `${position.y}px`, 
        left: `${position.x}px`,
        position: 'fixed' // Fixed positioning works best with viewport bounds
      }}
    >
      {termData.loading ? (
        <div className="tooltip-loading">
          <div className="spinner"></div>
          <span>Đang tra cứu từ điển AI...</span>
        </div>
      ) : (
        <>
          <div className="tooltip-header">
            <span className="term-en">{termData.term}</span>
            <span className="term-category">{termData.category}</span>
          </div>
          <div className="tooltip-body">
            <div className="term-vi-wrapper">
              <span className="translation-tag">VI</span>
              <p className="term-vi">{termData.translation}</p>
            </div>
            <p className="term-desc">{termData.definition}</p>
          </div>
          <div className="tooltip-arrow"></div>
        </>
      )}
    </div>
  );
}
