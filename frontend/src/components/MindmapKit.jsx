import React, { useState, useEffect } from 'react';
import { Network, Play, Info } from 'lucide-react';
import './MindmapKit.css';

export default function MindmapKit({ segments, onSeek, t }) {
  const [mindmapData, setMindmapData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!segments || segments.length === 0) return;

    const text = segments.map(s => s.text).join(' ').toLowerCase();
    let data = null;

    if (text.includes("list") || text.includes("node") || text.includes("pointer")) {
      data = {
        id: "root",
        label: "Linked List Lecture",
        desc: "Overview of linear linked lists and pointer operations.",
        timestamp: 0,
        children: [
          {
            id: "structure",
            label: "1. Core Structure",
            desc: "The physical memory allocation and components of a linked list.",
            timestamp: 10,
            children: [
              { id: "node", label: "Nodes", desc: "Data items holding values.", timestamp: 20 },
              { id: "pointer", label: "Pointers", desc: "References holding addresses of next nodes.", timestamp: 45 }
            ]
          },
          {
            id: "operations",
            label: "2. Operations",
            desc: "Standard manipulation algorithms.",
            timestamp: 85,
            children: [
              { id: "insert", label: "Insertion", desc: "Adding nodes at head, tail, or middle.", timestamp: 105 },
              { id: "delete", label: "Deletion", desc: "Removing nodes and re-linking pointers.", timestamp: 155 }
            ]
          },
          {
            id: "complexities",
            label: "3. Time Complexities",
            desc: "Big-O performance analysis.",
            timestamp: 210,
            children: [
              { id: "search-complex", label: "Search: O(n)", desc: "Requires traversing nodes linearly.", timestamp: 220 },
              { id: "insert-complex", label: "Insert Head: O(1)", desc: "Constant time pointer reassignment.", timestamp: 250 }
            ]
          }
        ]
      };
    } else if (text.includes("fastapi") || text.includes("framework") || text.includes("endpoint")) {
      data = {
        id: "root",
        label: "FastAPI Development",
        desc: "Modern asynchronous API design using Python.",
        timestamp: 0,
        children: [
          {
            id: "architecture",
            label: "1. Core Architecture",
            desc: "FastAPI system stack layers.",
            timestamp: 15,
            children: [
              { id: "starlette", label: "Starlette", desc: "Handles low-level web routing and events.", timestamp: 35 },
              { id: "uvicorn", label: "Uvicorn ASGI", desc: "Lightning-fast web server implementation.", timestamp: 50 }
            ]
          },
          {
            id: "pydantic",
            label: "2. Validation & Types",
            desc: "Type safety and schema contract mappings.",
            timestamp: 80,
            children: [
              { id: "models", label: "Pydantic Models", desc: "Classes defining request/response structures.", timestamp: 95 },
              { id: "validation", label: "Auto-Validation", desc: "Validates types at runtime, returning 422 codes on errors.", timestamp: 130 }
            ]
          },
          {
            id: "async",
            label: "3. Concurrency",
            desc: "Asynchronous program executions.",
            timestamp: 170,
            children: [
              { id: "endpoints", label: "Async Endpoints", desc: "Declaring routes with async def keywords.", timestamp: 185 },
              { id: "depends", label: "Dependencies", desc: "Declaring reusable dependencies using Depends().", timestamp: 220 }
            ]
          }
        ]
      };
    } else if (text.includes("gradient") || text.includes("loss") || text.includes("network") || text.includes("neural")) {
      data = {
        id: "root",
        label: "Gradient Descent Optimization",
        desc: "Training algorithms for Deep Neural Networks.",
        timestamp: 0,
        children: [
          {
            id: "concepts",
            label: "1. Key Concepts",
            desc: "Math fundamentals of models.",
            timestamp: 12,
            children: [
              { id: "loss-fn", label: "Loss Function", desc: "Mathematical quantification of prediction error.", timestamp: 30 },
              { id: "weights", label: "Weights & Biases", desc: "Parameters adjusted to learn features.", timestamp: 55 }
            ]
          },
          {
            id: "algorithm-steps",
            label: "2. Optimization Step",
            desc: "How parameters get updated.",
            timestamp: 90,
            children: [
              { id: "gradients", label: "Compute Gradients", desc: "Calculating partial derivatives of loss.", timestamp: 105 },
              { id: "lr", label: "Learning Rate", desc: "Multiplier defining step increments.", timestamp: 140 }
            ]
          },
          {
            id: "training-loop",
            label: "3. Training Cycle",
            desc: "Full network training lifecycle.",
            timestamp: 190,
            children: [
              { id: "forward", label: "Forward Pass", desc: "Feeding input and calculating outputs.", timestamp: 200 },
              { id: "backprop", label: "Backpropagation", desc: "Propagating errors backward to update weights.", timestamp: 235 }
            ]
          }
        ]
      };
    } else {
      // Default mindmap
      data = {
        id: "root",
        label: "StudyMind Ecosystem",
        desc: "Interactive lecture assistant modules.",
        timestamp: 0,
        children: [
          {
            id: "transcription",
            label: "1. Speech-to-Text",
            desc: "Audio extraction and transcription.",
            timestamp: 10,
            children: [
              { id: "whisper-svc", label: "Whisper STT", desc: "Translating voices into text.", timestamp: 15 },
              { id: "entity-protection", label: "Entity Filter", desc: "Academic term whitelist protection.", timestamp: 35 }
            ]
          },
          {
            id: "rag-video",
            label: "2. RAG AI Tutor",
            desc: "Contextual chatbot answers.",
            timestamp: 60,
            children: [
              { id: "embeddings-db", label: "ChromaDB/Qdrant", desc: "Storing transcript vectors.", timestamp: 70 },
              { id: "timestamp-sync", label: "Time Seek", desc: "Linking replies to timestamps.", timestamp: 95 }
            ]
          }
        ]
      };
    }

    setMindmapData(data);
    setSelectedNode(data); // Select root by default
  }, [segments]);

  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  const handlePlayNode = (secs) => {
    onSeek(secs);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!mindmapData) {
    return <div className="mindmap-empty">Generating Mindmap...</div>;
  }

  return (
    <div className="mindmap-panel animate-fade-in">
      <div className="mindmap-scroll-area">
        <div className="mindmap-tree">
          {/* Root node */}
          <div className="mindmap-column root-column">
            <button 
              className={`mindmap-node root-node ${selectedNode?.id === mindmapData.id ? 'selected' : ''}`}
              onClick={(e) => handleNodeClick(mindmapData, e)}
            >
              <Network size={16} className="node-icon" />
              <span>{mindmapData.label}</span>
            </button>
          </div>

          {/* Connectors & Sub-columns */}
          <div className="mindmap-branches">
            {mindmapData.children.map((child) => (
              <div key={child.id} className="mindmap-branch-group">
                {/* Level 1 Node */}
                <div className="mindmap-column level-1">
                  <button 
                    className={`mindmap-node lvl1-node ${selectedNode?.id === child.id ? 'selected' : ''}`}
                    onClick={(e) => handleNodeClick(child, e)}
                  >
                    <span>{child.label}</span>
                  </button>
                </div>

                {/* Level 2 Nodes (Leafs) */}
                <div className="mindmap-column level-2-group">
                  {child.children?.map((leaf) => (
                    <button 
                      key={leaf.id}
                      className={`mindmap-node leaf-node ${selectedNode?.id === leaf.id ? 'selected' : ''}`}
                      onClick={(e) => handleNodeClick(leaf, e)}
                    >
                      <span className="leaf-dot"></span>
                      <span>{leaf.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node detail display panel */}
      {selectedNode && (
        <div className="node-details-box glass">
          <div className="node-details-header">
            <h4>{selectedNode.label}</h4>
            <button 
              className="play-node-btn btn-primary"
              onClick={() => handlePlayNode(selectedNode.timestamp)}
              title="Seek Video to Node Timestamp"
            >
              <Play size={12} fill="white" />
              <span>{formatTime(selectedNode.timestamp)}</span>
            </button>
          </div>
          <p className="node-desc">
            <Info size={12} className="info-icon" />
            <span>{selectedNode.desc}</span>
          </p>
        </div>
      )}
    </div>
  );
}
