import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Bot, User, Clock, Loader2 } from 'lucide-react';
import './RAGChatbot.css';

export default function RAGChatbot({ segments, onSeek, t }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize with a welcome message from the AI tutor
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          sender: 'bot',
          text: t('chatbotWelcome'),
          time: new Date()
        }
      ]);
    }
  }, [t, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Format time display
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Click handler for seeks inside text
  const handleTimestampClick = (secs) => {
    onSeek(secs);
  };

  // Custom parser to replace timestamp annotations (e.g., [01:23] or [83]) with clickable badges
  const renderMessageText = (text) => {
    // Match timestamps format: [MM:SS] or [SS] or [HH:MM:SS] or [sec: 83]
    const regex = /\[(\d{2}):(\d{2})\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add plain text before match
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const totalSeconds = mins * 60 + secs;

      // Add clickable timestamp badge
      parts.push(
        <button 
          key={matchIndex}
          className="chat-timestamp-badge"
          onClick={() => handleTimestampClick(totalSeconds)}
          title={`Seek to ${match[1]}:${match[2]}`}
        >
          <Clock size={10} />
          <span>{match[1]}:{match[2]}</span>
        </button>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const newMsg = {
      sender: 'user',
      text: userText,
      time: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    // Simulate RAG Pipeline delay (1.5 - 2s)
    setTimeout(() => {
      const responseText = queryLocalRAG(userText, segments, t);
      const botMsg = {
        sender: 'bot',
        text: responseText,
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="chatbot-panel">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble-wrapper ${msg.sender}`}>
            <div className="chat-avatar">
              {msg.sender === 'bot' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="chat-bubble-content">
              <div className="chat-bubble">
                <p>{renderMessageText(msg.text)}</p>
              </div>
              <span className="chat-time">
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-wrapper bot">
            <div className="chat-avatar">
              <Bot size={16} />
            </div>
            <div className="chat-bubble-content">
              <div className="chat-bubble loading-bubble">
                <Loader2 size={16} className="spinner" />
                <span>AI Tutor is searching transcript...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-form">
        <input
          type="text"
          placeholder={t('askSomethingAboutVideo')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn btn-primary" disabled={loading || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

// Client-side RAG simulation matching keyword topics with timestamps in the transcript
function queryLocalRAG(query, segments, t) {
  if (!segments || segments.length === 0) {
    return "I'm sorry, I couldn't access the video transcript context to answer your question.";
  }

  const q = query.toLowerCase();

  // Helper to format timestamp numbers to [MM:SS]
  const toTimestamp = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
  };

  // Find segments containing query words
  let matchedSegments = [];
  
  // Specific Technical topic mapping
  if (q.includes("linked list") || q.includes("list") || q.includes("node") || q.includes("pointer")) {
    matchedSegments = segments.filter(seg => 
      seg.text.toLowerCase().includes("list") || 
      seg.text.toLowerCase().includes("node") || 
      seg.text.toLowerCase().includes("pointer")
    );
    
    if (matchedSegments.length > 0) {
      const first = matchedSegments[0];
      return `A **Linked List** is a linear data structure discussed around ${toTimestamp(first.start)}. Unlike arrays, elements in a linked list are not stored in contiguous memory but are linked via pointers. Each element is called a **Node** and contains a data field and a next pointer which points to the next node in the list. You can see this visualised or explained in the video starting at ${toTimestamp(first.start)}.`;
    }
  }

  if (q.includes("fastapi") || q.includes("framework") || q.includes("api")) {
    matchedSegments = segments.filter(seg => 
      seg.text.toLowerCase().includes("fastapi") || 
      seg.text.toLowerCase().includes("framework") || 
      seg.text.toLowerCase().includes("api")
    );
    if (matchedSegments.length > 0) {
      const first = matchedSegments[0];
      return `The tutor explains **FastAPI** around ${toTimestamp(first.start)}. FastAPI is a Python web framework designed for high performance and speedy API creation. It automatically supports async execution and validates client request schemas using Pydantic. Review this segment in the video at ${toTimestamp(first.start)}.`;
    }
  }

  if (q.includes("gradient descent") || q.includes("loss") || q.includes("optimize") || q.includes("neural")) {
    matchedSegments = segments.filter(seg => 
      seg.text.toLowerCase().includes("gradient") || 
      seg.text.toLowerCase().includes("loss") || 
      seg.text.toLowerCase().includes("neural")
    );
    if (matchedSegments.length > 0) {
      const first = matchedSegments[0];
      return `Around ${toTimestamp(first.start)}, the video introduces **Gradient Descent** as a crucial optimization algorithm. In training Neural Networks, the goal is to minimize the **Loss Function**, which measures the model's error. Gradient Descent calculates the gradient slope and updates model weights in the direction of the steepest descent to reduce errors. Watch the full walkthrough at ${toTimestamp(first.start)}.`;
    }
  }

  if (q.includes("what is the video") || q.includes("summary") || q.includes("about") || q.includes("tóm tắt")) {
    // Generate summary using first few segments
    const firstSec = segments[0];
    const middleSec = segments[Math.floor(segments.length / 2)];
    return `This video is an educational lecture. It starts at ${toTimestamp(firstSec.start)} with an introduction of the main concepts. By the middle of the lecture around ${toTimestamp(middleSec.start)}, the tutor goes deeper into details, implementations, and concrete examples. Please ask about specific keywords like "linked list", "FastAPI", or "gradient descent" for detailed timestamp seek pointers.`;
  }

  // General semantic keyword match fallbacks
  const keywords = q.split(/\s+/).filter(w => w.length > 3);
  let bestMatch = null;
  let maxHits = 0;

  for (const seg of segments) {
    let hits = 0;
    const textLower = seg.text.toLowerCase();
    for (const kw of keywords) {
      if (textLower.includes(kw)) hits++;
    }
    if (hits > maxHits) {
      maxHits = hits;
      bestMatch = seg;
    }
  }

  if (bestMatch && maxHits > 0) {
    return `Based on your question, I found a matching section in the lecture at ${toTimestamp(bestMatch.start)} where the speaker mentions: 
    
    *"${bestMatch.text}"*
    
    Click the timestamp badge ${toTimestamp(bestMatch.start)} to jump directly to this explanation.`;
  }

  return "I searched the transcript but couldn't find a direct answer to that query. Try asking about the main technical terms mentioned in the video (e.g. lists, nodes, API endpoints, neural training).";
}
