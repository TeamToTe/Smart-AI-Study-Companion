import React, { useState, useEffect, useRef } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, Play, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MindmapKit.css';

export default function MindmapKit({ segments, onSeek, t, videoUrl }) {
  const { session } = useAuth();
  const [mindmapData, setMindmapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paths, setPaths] = useState([]);

  // Interactive Zoom/Pan states
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const scrollAreaRef = useRef(null);
  const containerRef = useRef(null);
  const rootRef = useRef(null);
  const branchRefs = useRef({});
  const leafRefs = useRef({});

  // Clean brackets/timestamps from node titles
  const cleanLabelText = (text) => {
    if (!text) return "";
    return text.replace(/\s*[\[\(]\d{2}:\d{2}[\]\)]/g, "").trim();
  };

  // Parse exact timestamp from labels if present
  const extractTimestamp = (text) => {
    if (!text) return null;
    const match = text.match(/[\[\(](\d{2}):(\d{2})[\]\)]/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      return mins * 60 + secs;
    }
    return null;
  };

  // Fallback keyword timing estimator
  const estimateTimestamp = (label) => {
    if (!label || !segments || segments.length === 0) return 0;
    const cleanLabel = label.toLowerCase().replace(/[^\w\s\u00C0-\u1EF9]/g, ' ');
    const words = cleanLabel.split(/\s+/).filter(w => w.length > 2);
    
    if (words.length > 0) {
      let bestSegment = null;
      let maxOverlap = 0;
      
      for (const seg of segments) {
        const segText = seg.text.toLowerCase();
        let overlap = 0;
        for (const word of words) {
          if (segText.includes(word)) {
            overlap++;
          }
        }
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          bestSegment = seg;
        }
      }
      
      if (bestSegment && maxOverlap >= 1) {
        return Math.floor(bestSegment.start);
      }
    }
    
    return 0;
  };

  // Get resolved timestamp
  const getNodeTimestamp = (node) => {
    const rawText = node.root_title || node.label || "";
    const extracted = extractTimestamp(rawText);
    if (extracted !== null) return extracted;
    return estimateTimestamp(rawText);
  };

  // Fetch mindmap data
  useEffect(() => {
    if (!segments || segments.length === 0) return;

    const fetchMindmap = async () => {
      // Check cache first
      if (videoUrl) {
        const cacheKey = `studymind_cache_mindmap_${videoUrl.toLowerCase()}`;
        const cachedDataStr = localStorage.getItem(cacheKey);
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            if (cachedData && cachedData.root_title) {
              setMindmapData(cachedData);
              setSelectedNode(cachedData);
              setLoading(false);
              setError(null);
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached mindmap:", e);
          }
        }
      }

      setLoading(true);
      setError(null);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const queryPrompt = 
          "You are an expert Content Summarizer and Mind Map Architect. Your task is to analyze the provided video transcript and extract the core concepts into a structured mind map format.\n\n" +
          "CRITICAL RULES:\n" +
          "1. Language: Output MUST be in Vietnamese.\n" +
          "2. Extreme Conciseness: Keep labels extremely short. Max 2-4 words per label. Do NOT write full sentences.\n" +
          "3. NO TIMESTAMPS: Absolutely DO NOT include any timestamps (e.g., [00:00], 00:12) in the branch labels. Strip them out completely.\n" +
          "4. Strict Hierarchy: Exactly 1 root concept, 3 to 4 main branches, and exactly 2 sub-branches per main branch.\n" +
          "5. Output Format: Output ONLY a valid JSON object matching the schema below. No markdown formatting, no explanations.\n\n" +
          "JSON SCHEMA:\n" +
          "{\n" +
          "  \"root_title\": \"String (Core topic)\",\n" +
          "  \"branches\": [\n" +
          "    {\n" +
          "      \"id\": \"String (Unique ID)\",\n" +
          "      \"label\": \"String (Main concept, max 4 words)\",\n" +
          "      \"sub_branches\": [\n" +
          "        \"String (Detail, max 4 words, NO timestamps)\",\n" +
          "        \"String (Detail, max 4 words, NO timestamps)\"\n" +
          "      ]\n" +
          "    }\n" +
          "  ]\n" +
          "}";

        const contextSegments = segments.map(s => ({ start: s.start, end: s.end, text: s.text }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: queryPrompt,
            segments: contextSegments,
            history: []
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch mindmap from AI tutor.');
        }

        const data = await response.json();
        const rawJsonText = data.response;

        // Clean markdown backticks if Gemini wrapped it
        let cleanedJson = rawJsonText.trim();
        if (cleanedJson.startsWith("```")) {
          cleanedJson = cleanedJson.replace(/^```(json)?\s*/i, "");
          cleanedJson = cleanedJson.replace(/\s*```$/, "");
        }
        cleanedJson = cleanedJson.trim();

        const parsedData = JSON.parse(cleanedJson);
        if (parsedData && parsedData.root_title) {
          setMindmapData(parsedData);
          setSelectedNode(parsedData);
          
          if (videoUrl) {
            const cacheKey = `studymind_cache_mindmap_${videoUrl.toLowerCase()}`;
            localStorage.setItem(cacheKey, JSON.stringify(parsedData));
          }
        } else {
          throw new Error('Invalid mindmap format received.');
        }
      } catch (err) {
        console.warn("Failed to generate dynamic mindmap, falling back to local database:", err);
        setError(err.message || 'Failed to generate mindmap.');
        fallbackOfflineMindmap();
      } finally {
        setLoading(false);
      }
    };

    const fallbackOfflineMindmap = () => {
      const text = segments.map(s => s.text).join(' ').toLowerCase();
      let data = null;

      if (text.includes("list") || text.includes("node") || text.includes("pointer")) {
        data = {
          root_title: "Cấu trúc Linked List",
          branches: [
            {
              id: "structure",
              label: "Thành phần cơ bản",
              sub_branches: ["Nút dữ liệu", "Con trỏ liên kết"]
            },
            {
              id: "operations",
              label: "Thao tác chính",
              sub_branches: ["Thêm nút mới", "Xóa nút cũ"]
            },
            {
              id: "complexities",
              label: "Độ phức tạp",
              sub_branches: ["Tìm kiếm Tuyến tính", "Thêm đầu Hằng số"]
            }
          ]
        };
      } else if (text.includes("fastapi") || text.includes("framework") || text.includes("endpoint")) {
        data = {
          root_title: "Phát triển FastAPI",
          branches: [
            {
              id: "architecture",
              label: "Kiến trúc lõi",
              sub_branches: ["Bộ định tuyến Starlette", "Máy chủ Uvicorn"]
            },
            {
              id: "pydantic",
              label: "Kiểm định kiểu",
              sub_branches: ["Mô hình Pydantic", "Tự động kiểm định"]
            },
            {
              id: "async",
              label: "Bất đồng bộ",
              sub_branches: ["Đường dẫn Async", "Hệ thống Depends"]
            }
          ]
        };
      } else if (text.includes("gradient") || text.includes("loss") || text.includes("network") || text.includes("neural")) {
        data = {
          root_title: "Thuật toán Gradient Descent",
          branches: [
            {
              id: "concepts",
              label: "Khái niệm lõi",
              sub_branches: ["Hàm mất mát", "Trọng số biases"]
            },
            {
              id: "algorithm-steps",
              label: "Cập nhật tham số",
              sub_branches: ["Tính đạo hàm", "Tỷ lệ học"]
            },
            {
              id: "training-loop",
              label: "Vòng lặp huấn luyện",
              sub_branches: ["Lan truyền xuôi", "Lan truyền ngược"]
            }
          ]
        };
      } else {
        data = {
          root_title: "Hệ sinh thái StudyMind",
          branches: [
            {
              id: "transcription",
              label: "Chuyển đổi âm thanh",
              sub_branches: ["Nhận dạng Whisper", "Lọc thực thể"]
            },
            {
              id: "rag-video",
              label: "Trợ lý AI RAG",
              sub_branches: ["Lưu trữ Vector", "Nhảy mốc thời gian"]
            }
          ]
        };
      }

      setMindmapData(data);
      setSelectedNode(data);
    };

    fetchMindmap();
  }, [segments, session, videoUrl]);

  // Redraw SVG paths connecting nodes (adjusting coordinates by zoom factor)
  const redrawPaths = () => {
    if (!containerRef.current || !rootRef.current || !mindmapData) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPaths = [];

    const rootEl = rootRef.current;
    const rootRect = rootEl.getBoundingClientRect();
    const rootStartX = (rootRect.right - containerRect.left) / zoom;
    const rootStartY = (rootRect.top + rootRect.height / 2 - containerRect.top) / zoom;

    const branches = mindmapData.branches || [];
    branches.forEach((branch, branchIdx) => {
      const branchEl = branchRefs.current[branchIdx];
      if (!branchEl) return;
      const branchRect = branchEl.getBoundingClientRect();
      const branchEndX = (branchRect.left - containerRect.left) / zoom;
      const branchEndY = (branchRect.top + branchRect.height / 2 - containerRect.top) / zoom;

      // Curve coefficients
      const distanceX = branchEndX - rootStartX;
      const cp1x = rootStartX + distanceX * 0.45;
      const cp1y = rootStartY;
      const cp2x = rootStartX + distanceX * 0.55;
      const cp2y = branchEndY;

      newPaths.push({
        id: `root-${branch.id}`,
        parentId: 'root',
        childId: branch.id,
        d: `M ${rootStartX} ${rootStartY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${branchEndX} ${branchEndY}`
      });

      const branchStartX = (branchRect.right - containerRect.left) / zoom;
      const branchStartY = (branchRect.top + branchRect.height / 2 - containerRect.top) / zoom;

      const subBranches = branch.sub_branches || [];
      subBranches.forEach((sub, subIdx) => {
        const leafId = `${branch.id}-leaf-${subIdx}`;
        const leafEl = leafRefs.current[leafId];
        if (!leafEl) return;
        const leafRect = leafEl.getBoundingClientRect();
        const leafEndX = (leafRect.left - containerRect.left) / zoom;
        const leafEndY = (leafRect.top + leafRect.height / 2 - containerRect.top) / zoom;

        const distanceSubX = leafEndX - branchStartX;
        const cp1x_sub = branchStartX + distanceSubX * 0.45;
        const cp1y_sub = branchStartY;
        const cp2x_sub = branchStartX + distanceSubX * 0.55;
        const cp2y_sub = leafEndY;

        newPaths.push({
          id: `branch-leaf-${leafId}`,
          parentId: branch.id,
          childId: leafId,
          d: `M ${branchStartX} ${branchStartY} C ${cp1x_sub} ${cp1y_sub}, ${cp2x_sub} ${cp2y_sub}, ${leafEndX} ${leafEndY}`
        });
      });
    });

    setPaths(newPaths);
  };

  // Observe resizes and draw triggers
  useEffect(() => {
    if (!mindmapData || loading) return;

    // Small delay to let DOM render complete
    const timer = setTimeout(() => {
      redrawPaths();
    }, 100);

    const observer = new ResizeObserver(() => {
      redrawPaths();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', redrawPaths);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', redrawPaths);
    };
  }, [mindmapData, loading, zoom]);

  // Handle non-passive wheel events on the scroll area for zooming
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const zoomStep = 0.05;
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(prev + zoomStep, 2.0));
      } else {
        setZoom(prev => Math.max(prev - zoomStep, 0.5));
      }
    };

    scrollEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      scrollEl.removeEventListener('wheel', handleWheel);
    };
  }, [mindmapData, loading]);

  // Recalculate paths on selection changes
  useEffect(() => {
    redrawPaths();
  }, [selectedNode]);

  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  const handlePlayNode = (secs) => {
    if (secs !== null && secs !== undefined) {
      onSeek(secs);
    }
  };

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Panning Canvas Drag Handlers
  const handleMouseDown = (e) => {
    // Only pan if clicking on background, not on a node button
    if (e.target.closest('.mindmap-node')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Zooming Handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  if (loading) {
    return <div className="mindmap-empty animate-pulse-glow">Đang tạo sơ đồ tư duy AI...</div>;
  }

  if (!mindmapData) {
    return <div className="mindmap-empty">Không có sơ đồ tư duy khả dụng.</div>;
  }

  const branches = mindmapData.branches || [];

  return (
    <div className="mindmap-panel animate-fade-in" style={{ position: 'relative' }}>
      <div 
        ref={scrollAreaRef}
        className={`mindmap-scroll-area ${isDragging ? 'dragging' : 'pannable'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div 
          ref={containerRef} 
          className="mindmap-tree layout-horizontal"
          style={{ 
            position: 'relative',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform var(--transition-fast)'
          }}
        >
          {/* Dynamic SVG connecting path overlay */}
          <svg 
            className="mindmap-svg-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          >
            {paths.map((p) => {
              const isActive = selectedNode && (
                selectedNode.id === p.childId || 
                selectedNode.id === p.parentId ||
                (selectedNode.root_title && p.parentId === 'root')
              );
              return (
                <path
                  key={p.id}
                  d={p.d}
                  className={`mindmap-svg-path ${isActive ? 'active' : ''}`}
                />
              );
            })}
          </svg>

          {/* Column 1: Root Node */}
          <div className="mindmap-column root-column">
            <button 
              ref={rootRef}
              className={`mindmap-node root-node ${selectedNode?.root_title ? 'selected' : ''}`}
              onClick={(e) => handleNodeClick(mindmapData, e)}
            >
              <Network size={16} className="node-icon" />
              <span>{cleanLabelText(mindmapData.root_title)}</span>
            </button>
          </div>

          {/* Columns 2 & 3: Main branches & Sub-branches */}
          <div className="mindmap-branches-container">
            {branches.map((branch, branchIdx) => (
              <div key={branch.id} className="mindmap-branch-row">
                {/* Column 2: Level 1 Node */}
                <div className="mindmap-column level-1-wrapper">
                  <button 
                    ref={(el) => { branchRefs.current[branchIdx] = el; }}
                    className={`mindmap-node lvl1-node ${selectedNode?.id === branch.id ? 'selected' : ''}`}
                    onClick={(e) => handleNodeClick(branch, e)}
                  >
                    <span>{cleanLabelText(branch.label)}</span>
                  </button>
                </div>

                {/* Column 3: Level 2 Nodes (Leafs) */}
                <div className="mindmap-column level-2-wrapper">
                  {branch.sub_branches?.map((leafText, leafIdx) => {
                    const leafId = `${branch.id}-leaf-${leafIdx}`;
                    const isSelected = selectedNode?.id === leafId;
                    return (
                      <button 
                        key={leafId}
                        ref={(el) => { leafRefs.current[leafId] = el; }}
                        className={`mindmap-node leaf-node ${isSelected ? 'selected' : ''}`}
                        onClick={(e) => handleNodeClick({ id: leafId, label: leafText }, e)}
                      >
                        <span className="leaf-dot"></span>
                        <span>{cleanLabelText(leafText)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Canvas Zoom Toolbar (Top Right) */}
      <div className="mindmap-canvas-toolbar">
        {/* Zoom controls */}
        <button className="canvas-tool-btn" onClick={handleZoomOut} title="Thu nhỏ (Lăn chuột xuống)">
          <ZoomOut size={16} />
        </button>
        <span className="zoom-level-text">{Math.round(zoom * 100)}%</span>
        <button className="canvas-tool-btn" onClick={handleZoomIn} title="Phóng to (Lăn chuột lên)">
          <ZoomIn size={16} />
        </button>
        <button className="canvas-tool-btn" onClick={handleResetZoom} title="Reset">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Node detail display panel */}
      {selectedNode && (
        <div className="node-details-box glass animate-fade-in" style={{ zIndex: 5 }}>
          <div className="node-details-header">
            <h4>{cleanLabelText(selectedNode.root_title || selectedNode.label)}</h4>
            <button 
              className="play-node-btn btn-primary"
              onClick={() => handlePlayNode(getNodeTimestamp(selectedNode))}
              title="Seek Video to Node Timestamp"
            >
              <Play size={12} fill="white" />
              <span>{formatTime(getNodeTimestamp(selectedNode))}</span>
            </button>
          </div>
          <p className="node-desc">
            <Info size={12} className="info-icon" />
            <span>Mốc thời gian phát được trích xuất trực tiếp từ sơ đồ bài học.</span>
          </p>
        </div>
      )}
    </div>
  );
}
