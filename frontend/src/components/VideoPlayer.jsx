import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';
import GlossaryTooltip from './GlossaryTooltip';
import { useAuth } from '../context/AuthContext';
import './VideoPlayer.css';

// Utility to extract YouTube ID
function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if text is originally Vietnamese to avoid double Vietnamese subtitles
function isVietnameseText(text) {
  if (!text) return false;
  return /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]/.test(text);
}

export default function VideoPlayer({ url, onProgress, seekTime, segments, currentTime, showOverlay, lang, pauseTrigger }) {
  const { session } = useAuth();
  const [dynamicGlossary, setDynamicGlossary] = useState({});
  const [hoveredTerm, setHoveredTerm] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Fetch dynamic definitions from Supabase / Gemini
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

  const handleMouseEnter = (e, termKey) => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
    const rect = e.target.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 150;
    
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 12;

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

  const renderHighlightedText = (text, domainWords = []) => {
    if (!text) return "";
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
            style={{ cursor: 'help' }}
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };
  const videoId = getYouTubeId(url);
  const containerId = 'youtube-player-iframe';
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const wrapperRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 85 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPos: { x: 50, y: 85 } });

  const startDrag = (clientX, clientY) => {
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPos: { ...position }
    };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left-click
    startDrag(e.clientX, e.clientY);
    e.preventDefault(); // Prevent text selection
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const updateDrag = (clientX, clientY) => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      
      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;
      
      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;
      
      let newX = dragRef.current.startPos.x + deltaXPercent;
      let newY = dragRef.current.startPos.y + deltaYPercent;
      
      // Restrict subtitles to remain within a safe zone (5% to 95%)
      newX = Math.max(5, Math.min(95, newX));
      newY = Math.max(5, Math.min(95, newY));
      
      setPosition({ x: newX, y: newY });
    };

    const stopDrag = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', stopDrag);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging]);

  // Identify active segment for overlay subtitles (with 400ms offset to compensate for YouTube subtitle lag)
  const syncOffset = 0.4;
  const activeSegment = (showOverlay && segments && segments.length > 0)
    ? segments.find(seg => (currentTime + syncOffset) >= seg.start && (currentTime + syncOffset) <= seg.end)
    : null;

  // Handle fullscreen changes programmatically
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Helper to remove iframe native fullscreen capabilities
  const stripIframeFullscreen = () => {
    const iframe = document.getElementById(containerId);
    if (iframe) {
      iframe.removeAttribute('allowfullscreen');
      const allowAttr = iframe.getAttribute('allow');
      if (allowAttr) {
        const updatedAllow = allowAttr
          .split(';')
          .map(p => p.trim())
          .filter(p => !p.startsWith('fullscreen'))
          .join('; ');
        iframe.setAttribute('allow', updatedAllow);
      }
    }
  };

  // 1. Load YouTube IFrame API dynamically
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    // Add API script to DOM
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Callback when API is loaded
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      setApiReady(true);
    };

    return () => {
      // Clean up callback if component unmounts before API loads
      window.onYouTubeIframeAPIReady = previousCallback;
    };
  }, []);

  // 2. Initialize Player when API is ready and videoId changes
  useEffect(() => {
    if (!apiReady || !videoId) return;

    // Destroy existing player if it exists
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying player:', e);
      }
      playerRef.current = null;
    }

    // Clear progress interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Create player
    playerRef.current = new window.YT.Player(containerId, {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0, // Disable YouTube's default fullscreen button to use our custom click-through overlay wrapper fullscreen!
        cc_load_policy: 0, // Disable default CC to show ours!
        iv_load_policy: 3
      },
      events: {
        onReady: () => {
          stripIframeFullscreen();
        },
        onStateChange: (event) => {
          stripIframeFullscreen(); // Strip again on state change to ensure YouTube doesn't re-inject
          // Play state = 1
          if (event.data === window.YT.PlayerState.PLAYING) {
            startPollingProgress();
          } else {
            stopPollingProgress();
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
              const exactTime = playerRef.current.getCurrentTime();
              onProgress(exactTime);
            }
          }
        }
      }
    });

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
      stopPollingProgress();
    };
  }, [apiReady, videoId]);

  // 3. Handle external seek requests
  useEffect(() => {
    if (playerRef.current && typeof seekTime === 'number') {
      playerRef.current.seekTo(seekTime, true);
      // If player was paused, play it
      if (playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        playerRef.current.playVideo();
      }
    }
  }, [seekTime]);

  // Sync current time on overlay toggle to ensure subtitles show up instantly even when paused
  useEffect(() => {
    if (showOverlay && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      const time = playerRef.current.getCurrentTime();
      onProgress(time);
    }
  }, [showOverlay, onProgress]);

  // Handle external pause requests (e.g., when hovering over a domain word in SubtitleViewer)
  useEffect(() => {
    if (playerRef.current && pauseTrigger > 0 && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
  }, [pauseTrigger]);

  const startPollingProgress = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = playerRef.current.getCurrentTime();
        onProgress(currentTime);
      }
    }, 200); // Poll every 200ms for tight sync
  };

  const stopPollingProgress = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  if (!videoId) {
    return <div className="video-player-error">Invalid Video URL</div>;
  }

  return (
    <div className={`video-player-wrapper ${isFullscreen ? 'fullscreen' : ''}`} ref={wrapperRef}>
      <div className="player-aspect-ratio">
        <div id={containerId}></div>
      </div>

      <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
        {isFullscreen ? <Minimize2 size={16} strokeWidth={3} /> : <Maximize2 size={16} strokeWidth={3} />}
      </button>
      
      {activeSegment && (
        <div 
          className={`caption-overlay ${isDragging ? 'dragging' : ''}`}
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isVietnameseText(activeSegment.original_text) ? (
            <p className="caption-vi">
              {renderHighlightedText(activeSegment.text, activeSegment.domain_words)}
            </p>
          ) : (
            <>
              <p className="caption-en">
                {renderHighlightedText(activeSegment.original_text || activeSegment.text, activeSegment.domain_words)}
              </p>
              {lang === 'vi' && (
                <p className="caption-vi">
                  {renderHighlightedText(activeSegment.original_text ? activeSegment.text : getMockTranslationForOverlay(activeSegment.text), activeSegment.domain_words)}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <GlossaryTooltip 
        termData={hoveredTerm} 
        position={tooltipPos} 
        visible={tooltipVisible} 
      />
    </div>
  );
}

// Simple mock translation helper for Demo Mode overlay
function getMockTranslationForOverlay(engText) {
  let text = engText;
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

  let viText = text;
  
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
    ruleBook.forEach(rule => {
      viText = viText.replace(rule.eng, rule.vi);
    });
    if (viText === text) {
      viText = "[Dịch]: " + text;
    }
  }
  return viText;
}
