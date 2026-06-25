import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2, ShieldCheck, HelpCircle } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';
import GlossaryTooltip from './GlossaryTooltip';
import './SubtitleViewer.css';

// Escape regex special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function SubtitleViewer({ segments, currentTime, onSeek, t, lang }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  
  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // 1. Identify active segment index
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    // Find segment matching current time
    let idx = segments.findIndex(seg => currentTime >= seg.start && currentTime <= seg.end);
    
    // If not found, find the closest active segment
    if (idx === -1) {
      idx = segments.findIndex((seg, i) => 
        currentTime >= seg.start && (i === segments.length - 1 || currentTime < segments[i + 1].start)
      );
    }

    if (idx !== -1 && idx !== activeIdx) {
      setActiveIdx(idx);
    }
  }, [currentTime, segments, activeIdx]);

  // 2. Smoothly scroll active line into view
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIdx, autoScroll]);

  // 3. Helper to format seconds to [MM:SS]
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 4. Parse text and inject glossary highlights
  const renderHighlightedText = (text) => {
    const sortedTerms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
    const regex = new RegExp(`\\b(${sortedTerms.map(escapeRegExp).join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const lowerPart = part.toLowerCase();
      if (GLOSSARY[lowerPart]) {
        return (
          <span 
            key={index} 
            className="glossary-highlight"
            onMouseEnter={(e) => handleMouseEnter(e, lowerPart)}
            onMouseLeave={handleMouseLeave}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // 5. Glossary hover handlers
  const handleMouseEnter = (e, termKey) => {
    const rect = e.target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 150;
    
    // Position tooltip above the highlighted word, centered
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 12;

    // Viewport boundaries check
    x = Math.max(10, Math.min(x, window.innerWidth - tooltipWidth - 10));
    y = Math.max(10, y);

    setHoveredTerm(GLOSSARY[termKey]);
    setTooltipPos({ x, y });
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };

  return (
    <div className="subtitles-section">
      <div className="subtitles-toolbar">
        <div className="toolbar-title">
          <ShieldCheck size={18} className="shield-icon" />
          <span>{t('academicEntityProtection')}</span>
        </div>
        <div className="toolbar-controls">
          <button 
            className={`sync-btn btn-secondary ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-Scroll Lock"
          >
            {t('autoScroll')} {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="subtitles-container" ref={containerRef}>
        {(!segments || segments.length === 0) ? (
          <div className="subtitles-empty">{t('noSubtitles')}</div>
        ) : (
          segments.map((seg, idx) => {
            const isActive = idx === activeIdx;
            return (
              <div 
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`subtitle-row ${isActive ? 'active' : ''}`}
                onClick={() => onSeek(seg.start)}
              >
                <button className="timestamp-btn" title="Seek to Timestamp">
                  <Play size={10} className="play-icon" />
                  <span>{formatTime(seg.start)}</span>
                </button>
                <div className="subtitle-content">
                  {/* Original English Text (Entity-Protected) */}
                  <p className="sub-text-en">
                    {renderHighlightedText(seg.text)}
                  </p>
                  {/* Vietnamese Context-aware Translation */}
                  {lang === 'vi' && (
                    <p className="sub-text-vi">
                      {/* Subtitle translation logic - we will mock context-aware translations */}
                      {getMockTranslation(seg.text)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <GlossaryTooltip 
        termData={hoveredTerm} 
        position={tooltipPos} 
        visible={tooltipVisible} 
      />
    </div>
  );
}

// Simple rule-based translation mock ensuring terminology is kept in English (Academic Entity Protection)
function getMockTranslation(engText) {
  let text = engText;
  
  // Rule-based dictionary translations maintaining entities in brackets/original
  const ruleBook = [
    { eng: /linked list/i, vi: "cấu trúc dữ liệu Linked List" },
    { eng: /gradient descent/i, vi: "thuật toán Gradient Descent" },
    { eng: /fastapi/i, vi: "web framework FastAPI" },
    { eng: /rest api/i, vi: "kiến trúc REST API" },
    { eng: /whisper/i, vi: "mô hình STT Whisper" },
    { eng: /gemini/i, vi: "AI đa phương thức Gemini" },
    { eng: /rag/i, vi: "hệ thống RAG (Retrieval-Augmented Generation)" },
    { eng: /vector database/i, vi: "Vector Database (Cơ sở dữ liệu Vector)" },
    { eng: /chromadb/i, vi: "CSDL vector ChromaDB" },
    { eng: /qdrant/i, vi: "công cụ vector search Qdrant" },
    { eng: /loss function/i, vi: "hàm mất mát (Loss Function)" },
    { eng: /few-shot prompting/i, vi: "kỹ thuật Few-Shot Prompting" },
    { eng: /asynchronous/i, vi: "bất đồng bộ (Asynchronous)" },
    { eng: /embedding/i, vi: "phương pháp Embedding" },
    { eng: /semantic search/i, vi: "tìm kiếm ngữ nghĩa (Semantic Search)" },
    { eng: /data structure/i, vi: "cấu trúc dữ liệu (Data Structure)" },
    { eng: /neural network/i, vi: "mạng thần kinh Neural Network" },
    { eng: /machine learning/i, vi: "học máy (Machine Learning)" },
    { eng: /deep learning/i, vi: "học sâu (Deep Learning)" },
    { eng: /algorithm/i, vi: "thuật toán (Algorithm)" }
  ];

  // Try parsing segments for Vietnamese display
  // We can translate typical sentences, or keep it translated with technical terms protected
  // For a general subtitle, we mock a translation where academic entities are explicitly highlighted
  let viText = text;
  
  // Standard educational sentence translations mapping
  if (text.includes("welcome") || text.includes("Welcome")) {
    viText = "Chào mừng các bạn đến với khóa học.";
  } else if (text.includes("data structure") || text.includes("Data structure")) {
    viText = "Hôm nay chúng ta sẽ bắt đầu tìm hiểu về cấu trúc dữ liệu (Data Structure) cơ bản.";
  } else if (text.includes("linked list") || text.includes("Linked list")) {
    viText = "Hãy phân tích cấu trúc hoạt động của một Linked List (danh sách liên kết).";
  } else if (text.includes("pointer") || text.includes("node")) {
    viText = "Mỗi phần tử (node) sẽ liên kết tới nút kế tiếp bằng một biến con trỏ.";
  } else if (text.includes("fastapi") || text.includes("FastAPI")) {
    viText = "Chúng ta sẽ dựng một ứng dụng web service nhanh chóng bằng framework FastAPI.";
  } else if (text.includes("endpoint") || text.includes("API")) {
    viText = "Các endpoint của REST API sẽ tiếp nhận dữ liệu định dạng JSON.";
  } else if (text.includes("gradient") || text.includes("descent")) {
    viText = "Chúng ta sử dụng Gradient Descent để cực tiểu hóa hàm mất mát (Loss Function).";
  } else if (text.includes("neural") || text.includes("network")) {
    viText = "Mạng thần kinh Neural Network học các trọng số bằng lan truyền ngược.";
  } else {
    // General text mockup: translate basic terms, keep glossary terms
    ruleBook.forEach(rule => {
      viText = viText.replace(rule.eng, rule.vi);
    });
    // Fallback translation approximation for demo
    if (viText === text) {
      viText = "[Bản dịch Việt ngữ tự động bảo vệ thuật ngữ]: " + text;
    }
  }

  return viText;
}
