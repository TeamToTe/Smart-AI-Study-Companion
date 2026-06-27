import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
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

  // Click handler for seeks inside text
  const handleTimestampClick = (secs) => {
    onSeek(secs);
  };

  // Custom parser to handle Markdown elements (headings, bold, lists, code) and timestamp badges [MM:SS]
  const renderMessageText = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    let insideList = false;
    const renderedElements = [];
    let listItems = [];

    // Helper: Parse inline styles (Timestamp, Bold, Inline code)
    const parseInlineStyles = (lineText, lineKey) => {
      const timestampRegex = /\[(\d{2}):(\d{2})\]/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      let partKey = 0;

      while ((match = timestampRegex.exec(lineText)) !== null) {
        const matchIndex = match.index;
        
        if (matchIndex > lastIndex) {
          parts.push(...parseBoldAndCode(lineText.substring(lastIndex, matchIndex), `${lineKey}-${partKey++}`));
        }

        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const totalSeconds = mins * 60 + secs;

        parts.push(
          <button 
            key={`${lineKey}-ts-${matchIndex}`}
            className="chat-timestamp-badge"
            onClick={() => handleTimestampClick(totalSeconds)}
            title={`Seek to ${match[1]}:${match[2]}`}
          >
            <Clock size={10} />
            <span>{match[1]}:{match[2]}</span>
          </button>
        );

        lastIndex = timestampRegex.lastIndex;
      }

      if (lastIndex < lineText.length) {
        parts.push(...parseBoldAndCode(lineText.substring(lastIndex), `${lineKey}-${partKey++}`));
      }

      return parts.length > 0 ? parts : [lineText];
    };

    // Helper: Parse Bold **bold** and Code `code`
    const parseBoldAndCode = (inputText, parentKey) => {
      const regex = /(\*\*.*?\*\*|`.*?`)/g;
      const parts = inputText.split(regex);
      
      return parts.map((part, index) => {
        const key = `${parentKey}-${index}`;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={key} className="chat-inline-code">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      const lineKey = `line-${lineIndex}`;

      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!insideList) {
          insideList = true;
          listItems = [];
        }
        const itemContent = trimmedLine.substring(2);
        listItems.push(
          <li key={`li-${lineIndex}`}>
            {parseInlineStyles(itemContent, `li-content-${lineIndex}`)}
          </li>
        );
      } else {
        if (insideList) {
          renderedElements.push(
            <ul key={`ul-${lineIndex}`} className="chat-ul">
              {listItems}
            </ul>
          );
          insideList = false;
        }

        if (trimmedLine.startsWith('### ')) {
          renderedElements.push(
            <h4 key={lineKey} className="chat-h4">
              {parseInlineStyles(trimmedLine.substring(4), lineKey)}
            </h4>
          );
        } else if (trimmedLine.startsWith('## ')) {
          renderedElements.push(
            <h3 key={lineKey} className="chat-h3">
              {parseInlineStyles(trimmedLine.substring(3), lineKey)}
            </h3>
          );
        } else if (trimmedLine.startsWith('# ')) {
          renderedElements.push(
            <h2 key={lineKey} className="chat-h2">
              {parseInlineStyles(trimmedLine.substring(2), lineKey)}
            </h2>
          );
        } else if (trimmedLine !== '') {
          renderedElements.push(
            <div key={lineKey} className="chat-p">
              {parseInlineStyles(line, lineKey)}
            </div>
          );
        }
      }
    });

    if (insideList) {
      renderedElements.push(
        <ul key="ul-end" className="chat-ul">
          {listItems}
        </ul>
      );
    }

    return renderedElements;
  };

  const handleSend = async (e) => {
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

    try {
      // Map frontend messages history to Backend ChatMessage structure
      const history = messages
        .filter(msg => msg.text !== t('chatbotWelcome'))
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          content: msg.text
        }));

      // Call Backend API
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          query: userText,
          history: history,
          segments: segments.map(seg => ({
            start: seg.start,
            end: seg.end,
            text: seg.text
          }))
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to get answer from server');
      }

      const data = await response.json();
      
      const botMsg = {
        sender: 'bot',
        text: data.response,
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat API Error:", err);
      const errorMsg = {
        sender: 'bot',
        text: "Xin lỗi, tôi gặp sự cố khi kết nối với máy chủ AI Tutor. Hãy đảm bảo máy chủ Backend đang chạy và API Key đã được cấu hình chính xác.",
        time: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
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
                <div className="chat-formatted-content">
                  {renderMessageText(msg.text)}
                </div>
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

