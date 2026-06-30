import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2, ShieldCheck, HelpCircle } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';
import { useAuth } from '../context/AuthContext';
import GlossaryTooltip from './GlossaryTooltip';
import './SubtitleViewer.css';

// Escape regex special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if text is originally Vietnamese to avoid double Vietnamese subtitles
function isVietnameseText(text) {
  if (!text) return false;
  return /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]/.test(text);
}

// Eased smooth scroll that doesn't trigger Chromium window scroll bug
function smoothScrollTo(element, target, duration = 250) {
  const start = element.scrollTop;
  const change = target - start;
  if (Math.abs(change) < 2) {
    element.scrollTop = target;
    return;
  }
  
  const startTime = performance.now();

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // EaseInOutQuad
    const ease = progress < 0.5 
      ? 2 * progress * progress 
      : -1 + (4 - 2 * progress) * progress;

    element.scrollTop = start + change * ease;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

export default function SubtitleViewer({ segments, currentTime, onSeek, t, lang, videoOverlayCc, setVideoOverlayCc, onHoverDomainWord }) {
  const { session } = useAuth();
  const [activeIdx, setActiveIdx] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [dynamicGlossary, setDynamicGlossary] = useState({});
  
  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // 1. Identify active segment index (with 400ms offset to compensate for YouTube subtitle lag)
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    const syncOffset = 0.4;
    const adjustedTime = currentTime + syncOffset;
    
    // Find segment matching adjusted time
    let idx = segments.findIndex(seg => adjustedTime >= seg.start && adjustedTime <= seg.end);
    
    // If not found, find the closest active segment
    if (idx === -1) {
      idx = segments.findIndex((seg, i) => 
        adjustedTime >= seg.start && (i === segments.length - 1 || adjustedTime < segments[i + 1].start)
      );
    }

    if (idx !== -1 && idx !== activeIdx) {
      setActiveIdx(idx);
    }
  }, [currentTime, segments, activeIdx]);

  // 2. Smoothly scroll active line into view (inside the container only)
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeLine = activeLineRef.current;
      
      const containerHeight = container.clientHeight;
      const targetScrollTop = activeLine.offsetTop - (containerHeight / 2) + (activeLine.clientHeight / 2);
      
      smoothScrollTo(container, targetScrollTop, 200);
    }
  }, [activeIdx, autoScroll]);

  // 3. Helper to format seconds to [MM:SS]
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 4. Parse text and inject glossary highlights
  const renderHighlightedText = (text, domainWords = []) => {
    const glossaryTerms = Object.keys(GLOSSARY);
    const combinedTerms = [...new Set([...glossaryTerms, ...(domainWords || [])])];
    const sortedTerms = combinedTerms.filter(Boolean).sort((a, b) => b.length - a.length);
    if (sortedTerms.length === 0) return text;

    const regex = new RegExp(`\\b(${sortedTerms.map(escapeRegExp).join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      const lowerPart = part.toLowerCase();
      const isGlossary = !!GLOSSARY[lowerPart];
      const isDynamic = !!dynamicGlossary[lowerPart];
      const isDomainWord = (domainWords || []).some(dw => dw.toLowerCase() === lowerPart);

      if (isGlossary || isDynamic || isDomainWord) {
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

  // 5. Fetch dynamic definitions from Supabase / Gemini
  const fetchDynamicDefinition = async (term) => {
    const lowerKey = term.toLowerCase();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/glossary/definition?term=${encodeURIComponent(term)}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      if (data && data.term) {
        const termData = {
          term: data.term || term,
          translation: data.translation || term,
          definition: data.definition || "Thuật ngữ trong bài học.",
          category: data.category || "Chuyên ngành"
        };

        setDynamicGlossary(prev => ({
          ...prev,
          [lowerKey]: termData
        }));

        setHoveredTerm(prev => {
          if (prev && prev.term.toLowerCase() === lowerKey) {
            return termData;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic definition:", err);
      const fallbackDef = {
        term: term,
        translation: term,
        definition: "Thuật ngữ chuyên ngành trong bài giảng.",
        category: "General"
      };
      setDynamicGlossary(prev => ({
        ...prev,
        [lowerKey]: fallbackDef
      }));
      setHoveredTerm(prev => {
        if (prev && prev.term.toLowerCase() === lowerKey) {
          return fallbackDef;
        }
        return prev;
      });
    }
  };

  // 6. Glossary hover handlers
  const handleMouseEnter = (e, termKey) => {
    if (onHoverDomainWord) {
      onHoverDomainWord();
    }
    const rect = e.target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 150;
    
    // Position tooltip above the highlighted word, centered
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 12;

    // Viewport boundaries check
    x = Math.max(10, Math.min(x, window.innerWidth - tooltipWidth - 10));
    y = Math.max(10, y);

    const lowerKey = termKey.toLowerCase();

    if (GLOSSARY[lowerKey]) {
      setHoveredTerm(GLOSSARY[lowerKey]);
      setTooltipPos({ x, y });
      setTooltipVisible(true);
    } else if (dynamicGlossary[lowerKey]) {
      setHoveredTerm(dynamicGlossary[lowerKey]);
      setTooltipPos({ x, y });
      setTooltipVisible(true);
    } else {
      setHoveredTerm({ term: termKey, loading: true });
      setTooltipPos({ x, y });
      setTooltipVisible(true);
      fetchDynamicDefinition(termKey);
    }
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
        <div className="toolbar-controls" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`sync-btn btn-secondary ${videoOverlayCc ? 'active' : ''}`}
            onClick={() => setVideoOverlayCc(!videoOverlayCc)}
            title="Toggle Subtitles Overlay on Video"
          >
            {t('videoOverlayCc')}: {videoOverlayCc ? 'ON' : 'OFF'}
          </button>
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
                  {isVietnameseText(seg.original_text) ? (
                    <p className="sub-text-vi">
                      {renderHighlightedText(seg.text, seg.domain_words)}
                    </p>
                  ) : (
                    <>
                      {/* Original English Text (Entity-Protected) */}
                      <p className="sub-text-en">
                        {renderHighlightedText(seg.original_text || seg.text, seg.domain_words)}
                      </p>
                      {/* Vietnamese Context-aware Translation */}
                      {lang === 'vi' && (
                        <p className="sub-text-vi">
                          {renderHighlightedText(seg.original_text ? seg.text : getMockTranslation(seg.text), seg.domain_words)}
                        </p>
                      )}
                    </>
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
