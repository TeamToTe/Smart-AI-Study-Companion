import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import './RAGChatbot.css';

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="chat-code-block-container">
      <div className="chat-code-block-header">
        <span className="chat-code-lang">{language}</span>
        <button className="chat-code-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="chat-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MathBlock = ({ math }) => {
  const html = window.katex 
    ? window.katex.renderToString(math, { displayMode: true, throwOnError: false }) 
    : math;
  return <div className="chat-math-block" style={{ overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: html }} />;
};

const MathInline = ({ math }) => {
  const html = window.katex 
    ? window.katex.renderToString(math, { displayMode: false, throwOnError: false }) 
    : math;
  return <span className="chat-math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function RAGChatbot({ segments, onSeek, t, videoUrl, chatQuery, setChatQuery }) {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const isLoggedIn = !!session?.access_token;
  const [katexLoaded, setKatexLoaded] = useState(!!window.katex);

  useEffect(() => {
    if (window.katex) {
      setKatexLoaded(true);
      return;
    }

    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
    script.async = true;
    script.onload = () => setKatexLoaded(true);
    script.onerror = () => console.error("Failed to load KaTeX script.");
    document.body.appendChild(script);
  }, []);

  const charCount = input.length;

  // Load chat history when videoUrl or session changes
  useEffect(() => {
    if (!videoUrl || !session?.access_token) {
      setMessages([
        {
          sender: 'bot',
          text: t('chatbotWelcome'),
          time: new Date()
        }
      ]);
      setSessionId(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const url = `/api/chat/history?video_url=${encodeURIComponent(videoUrl)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSessionId(data.session_id);
          
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map(m => ({
              ...m,
              time: m.time ? new Date(m.time) : new Date()
            })));
          } else {
            setMessages([
              {
                sender: 'bot',
                text: t('chatbotWelcome'),
                time: new Date()
              }
            ]);
          }
        } else {
          console.error("Failed to load chat history, status:", response.status);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [videoUrl, session?.access_token]);

  // Scroll to bottom when messages change, but only if we have active chat history (more than 1 message)
  useEffect(() => {
    if (messages.length > 1 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Click handler for seeks inside text
  const handleTimestampClick = (secs) => {
    onSeek(secs);
  };

  // Custom parser to handle Markdown elements (headings, bold, lists, code) and timestamp badges [MM:SS]
  const renderMessageText = (text) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const renderedElements = [];
    let insideList = false;
    let listItems = [];
    let insideCodeBlock = false;
    let codeBlockLines = [];
    let codeLanguage = '';
    let insideMathBlock = false;
    let mathBlockLines = [];

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
            className="chat-timestamp-badge animate-pulse-glow"
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

    // Helper: Parse Bold **bold**, Code `code`, and Math $math$
    const parseBoldAndCode = (inputText, parentKey) => {
      const regex = /(\*\*.*?\*\*|`.*?`|\$[^$]+?\$)/g;
      const parts = inputText.split(regex);
      
      return parts.map((part, index) => {
        const key = `${parentKey}-${index}`;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={key} className="chat-inline-code">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <MathInline key={key} math={part.slice(1, -1)} />;
        }
        return part;
      });
    };

    const flushList = (key) => {
      if (insideList && listItems.length > 0) {
        renderedElements.push(
          <ul key={key} className="chat-ul">
            {listItems}
          </ul>
        );
        listItems = [];
        insideList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const lineKey = `line-${i}`;

      if (trimmedLine.startsWith('```')) {
        flushList(`flush-list-code-${i}`);
        
        if (insideCodeBlock) {
          const codeContent = codeBlockLines.join('\n');
          renderedElements.push(
            <CodeBlock 
              key={`code-${i}`} 
              code={codeContent} 
              language={codeLanguage} 
            />
          );
          insideCodeBlock = false;
          codeBlockLines = [];
          codeLanguage = '';
        } else {
          insideCodeBlock = true;
          codeLanguage = trimmedLine.slice(3).trim() || 'code';
        }
        continue;
      }

      if (insideCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      if (insideMathBlock) {
        if (trimmedLine.endsWith('$$')) {
          const finalLine = trimmedLine.slice(0, -2).trim();
          if (finalLine) mathBlockLines.push(finalLine);
          renderedElements.push(
            <MathBlock key={`math-${i}`} math={mathBlockLines.join('\n')} />
          );
          insideMathBlock = false;
          mathBlockLines = [];
        } else {
          mathBlockLines.push(line);
        }
        continue;
      }

      if (trimmedLine.startsWith('$$')) {
        flushList(`flush-list-math-${i}`);
        if (trimmedLine.endsWith('$$') && trimmedLine.length > 2) {
          renderedElements.push(
            <MathBlock key={`math-${i}`} math={trimmedLine.slice(2, -2)} />
          );
        } else {
          insideMathBlock = true;
          mathBlockLines = [];
        }
        continue;
      }

      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        if (!insideList) {
          insideList = true;
          listItems = [];
        }
        const itemContent = trimmedLine.substring(2);
        listItems.push(
          <li key={`li-${i}`}>
            {parseInlineStyles(itemContent, `li-content-${i}`)}
          </li>
        );
      } else {
        flushList(`flush-list-${i}`);

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
    }

    flushList('flush-list-end');
    if (insideCodeBlock && codeBlockLines.length > 0) {
      renderedElements.push(
        <CodeBlock 
          key="code-end" 
          code={codeBlockLines.join('\n')} 
          language={codeLanguage} 
        />
      );
    }
    if (insideMathBlock && mathBlockLines.length > 0) {
      renderedElements.push(
        <MathBlock 
          key="math-end" 
          math={mathBlockLines.join('\n')} 
        />
      );
    }

    return renderedElements;
  };

  const sendMessage = async (textToSend) => {
    if (!textToSend.trim() || loading) return;

    if (textToSend.length > 2000) {
      const userMsg = {
        sender: 'user',
        text: textToSend,
        time: new Date()
      };
      const errorMsg = {
        sender: 'bot',
        text: t('wordLimitExceeded'),
        time: new Date()
      };
      setMessages(prev => [...prev, userMsg, errorMsg]);
      return;
    }

    const newMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const headers = { 
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          session_id: sessionId,
          query: textToSend,
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
        text: "Hệ thống hiện đang được bảo trì, bạn thử lại sau nhé.",
        time: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-send queries when chatQuery prop changes
  useEffect(() => {
    if (chatQuery) {
      if (isLoggedIn) {
        if (!loading) {
          sendMessage(chatQuery);
          setChatQuery(null);
        }
      } else {
        setInput(chatQuery);
        setChatQuery(null);
      }
    }
  }, [chatQuery, isLoggedIn, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !isLoggedIn || charCount > 2000) return;
    const userText = input.trim();
    setInput('');
    await sendMessage(userText);
  };

  return (
    <div className="chatbot-panel">
      <div className="chat-messages" ref={messagesContainerRef}>
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
      </div>

      {!isLoggedIn && (
        <div className="chat-login-prompt">
          <span>Vui lòng đăng nhập để bắt đầu trò chuyện với AI Tutor.</span>
        </div>
      )}

      <form onSubmit={handleSend} className="chat-input-form">
        <div className="chat-input-wrapper">
          <input
            type="text"
            placeholder={isLoggedIn ? t('askSomethingAboutVideo') : 'Vui lòng đăng nhập để đặt câu hỏi...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`chat-input ${charCount > 2000 ? 'input-error' : ''}`}
            disabled={!isLoggedIn || loading}
          />
          {input.trim() && (
            <span className={`chat-word-counter ${charCount > 2000 ? 'exceeded' : ''}`}>
              {charCount} / 2000 {t('wordsCount')}
            </span>
          )}
        </div>
        <button 
          type="submit" 
          className="chat-send-btn btn-primary" 
          disabled={loading || !input.trim() || !isLoggedIn || charCount > 2000}
        >
          <Send size={16} />
        </button>
      </form>
      {charCount > 2000 && (
        <div className="chat-input-error-msg">
          {t('wordLimitExceeded')}
        </div>
      )}
    </div>
  );
}

