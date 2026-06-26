import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Languages, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import LandingPage from './components/LandingPage';
import SkeletonLoader from './components/SkeletonLoader';
import VideoPlayer from './components/VideoPlayer';
import SubtitleViewer from './components/SubtitleViewer';
import SidebarTabs from './components/SidebarTabs';
import RAGChatbot from './components/RAGChatbot';
import FlashcardKit from './components/FlashcardKit';
import QuizKit from './components/QuizKit';
import MindmapKit from './components/MindmapKit';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import './App.css';

// Translation dictionary
const LOCALIZATION = {
  en: {
    appName: "StudyMind",
    tagline: "Smart AI Study Companion",
    betaVersion: "CI 2026 Candidate",
    heroTitlePart1: "Redefine Technical Learning with",
    heroSubtitle: "Transform passive video lectures into active, context-aware learning. Keep academic terms protected in English, inspect explanations instantly on hover, and chat with your RAG tutor.",
    inputPlaceholder: "Paste a YouTube lecture URL (e.g. MIT OpenCourseWare, Harvard CS50)...",
    startStudying: "Start Studying",
    tryTheseExamples: "Or choose one of these technical lectures to demo:",
    analyzingVideo: "Analyzing Lecture Content...",
    autoScroll: "Auto-Scroll",
    noSubtitles: "No subtitles found for this segment.",
    academicEntityProtection: "Academic Entity Protection Filter",
    askSomethingAboutVideo: "Ask a question about the video...",
    chatbotWelcome: "Hello! I am your AI Video Tutor. Ask me any questions about the concepts in this video, and I will search the transcript to explain them with seekable timestamp badges.",
    tabChat: "AI Tutor",
    tabFlashcards: "Flashcards",
    tabQuiz: "Quiz",
    tabMindmap: "Mindmap",
    prev: "Prev",
    next: "Next",
    quizCompleted: "Quiz Completed!",
    tryAgain: "Try Again",
    switchToDark: "Switch to Dark Mode",
    switchToLight: "Switch to Light Mode",
    backToLanding: "Go Back",
    demoBadge: "Offline Fallback Demo Mode",
    footerText: "Developed by TeamToTe for Coding Inspiration 2026.",
    // New Translations
    studyHistory: "Study History",
    noHistory: "No history yet. Paste a YouTube URL above to begin!",
    clearHistory: "Clear All",
    studiedOn: "Studied on",
    rateLimitTitle: "Daily Limit Reached",
    rateLimitDesc: "To protect API limits, you are limited to 10 new video transcriptions per 24 hours. You can still study any video from your History or try the Example lectures!",
    close: "Close",
    videoOverlayCc: "Video Overlay CC",
    invalidUrl: "Please enter a valid YouTube URL!",
    feature1Title: "Interactive Subtitles",
    feature1Desc: "Protect technical terms in English and inspect immediate translations and academic glossaries on hover.",
    feature2Title: "AI Study Assistant",
    feature2Desc: "Ask questions about the video and get context-aware answers with seekable timestamp bookmarks.",
    feature3Title: "Smart Quizzes",
    feature3Desc: "Generate custom quizzes based on lecture contents to test your understanding.",
    feature4Title: "Concept Mindmaps",
    feature4Desc: "Generate visual concept graphs dynamically linked to key timestamps in the video.",
    // Loader Steps
    loaderStep1: "Validating YouTube video details...",
    loaderStep2: "Checking for pre-existing English / Vietnamese subtitles...",
    loaderStep3: "Fallback: Accessing audio stream (skip download)...",
    loaderStep4: "Uploading audio stream to Gemini File API...",
    loaderStep5: "Running Speech-to-Text via Gemini Flash (preserving engineering glossary)...",
    loaderStep6: "Splitting transcript & building semantic vector index..."
  },
  vi: {
    appName: "StudyMind",
    tagline: "Trợ Lý Học Tập AI Thông Minh",
    betaVersion: "Ứng Viên CI 2026",
    heroTitlePart1: "Định Nghĩa Lại Cách Học Kỹ Thuật Qua",
    heroSubtitle: "Chuyển hóa phương thức xem bài giảng thụ động thành môi trường học tập tương tác chủ động. Bảo vệ thực thể chuyên môn, hover xem giải nghĩa glossary thuật ngữ chuyên ngành tức thì.",
    inputPlaceholder: "Dán đường dẫn video YouTube bài giảng (ví dụ MIT OpenCourseWare, Harvard CS50)...",
    startStudying: "Bắt Đầu Học",
    tryTheseExamples: "Hoặc chọn một trong các bài giảng kỹ thuật mẫu dưới đây:",
    analyzingVideo: "Đang Phân Tích Bài Giảng...",
    autoScroll: "Cuộn tự động",
    noSubtitles: "Không tìm thấy phụ đề cho đoạn này.",
    academicEntityProtection: "Bộ Lọc Bảo Vệ Thuật Ngữ Chuyên Ngành",
    askSomethingAboutVideo: "Đặt câu hỏi về nội dung video...",
    chatbotWelcome: "Xin chào! Tôi là Trợ Lý Học Tập AI của bạn. Hãy hỏi tôi bất kỳ câu hỏi nào về các khái niệm trong bài học, tôi sẽ tìm trong phụ đề và giải nghĩa kèm link timestamp.",
    tabChat: "AI Hỏi Đáp",
    tabFlashcards: "Flashcards",
    tabQuiz: "Quiz Trắc Nghiệm",
    tabMindmap: "Sơ Đồ Tư Duy",
    prev: "Trước",
    next: "Sau",
    quizCompleted: "Hoàn Thành Bài Test!",
    tryAgain: "Làm lại",
    switchToDark: "Chuyển sang chế độ tối",
    switchToLight: "Chuyển sang chế độ sáng",
    backToLanding: "Quay lại",
    demoBadge: "Chế Độ Chạy Thử Fallback",
    footerText: "Phát triển bởi Đội thi TeamToTe - Cuộc thi Coding Inspiration 2026.",
    // New Translations
    studyHistory: "Lịch Sử Học Tập",
    noHistory: "Chưa có lịch sử học tập. Hãy dán link YouTube ở trên để bắt đầu!",
    clearHistory: "Xóa Tất Cả",
    studiedOn: "Học ngày",
    rateLimitTitle: "Đạt Giới Hạn Sử Dụng",
    rateLimitDesc: "Để tránh quá tải hạn ngạch (Rate Limit) API của hệ thống, bạn chỉ được dịch tối đa 10 video mới trong vòng 24 giờ. Bạn vẫn có thể học lại các video trong Lịch sử hoặc chọn các bài giảng mẫu!",
    close: "Đóng",
    videoOverlayCc: "Phụ đề trên Video",
    invalidUrl: "Vui lòng nhập đường dẫn YouTube hợp lệ!",
    feature1Title: "Phụ Đề Tương Tác",
    feature1Desc: "Bảo vệ thuật ngữ tiếng Anh gốc và tra cứu định nghĩa glossary tức thì khi hover chuột.",
    feature2Title: "Trợ Lý Học Tập AI",
    feature2Desc: "Hỏi đáp về nội dung bài giảng, nhận câu trả lời thông minh đính kèm timestamp chuyển tua video.",
    feature3Title: "Trắc Nghiệm Thông Minh",
    feature3Desc: "Tự động tạo câu hỏi trắc nghiệm từ nội dung bài giảng để kiểm tra mức độ tiếp thu.",
    feature4Title: "Sơ Đồ Tư Duy",
    feature4Desc: "Tạo biểu đồ tư duy trực quan liên kết trực tiếp tới các phân cảnh chính của video.",
    // Loader Steps
    loaderStep1: "Đang xác thực thông tin liên kết YouTube...",
    loaderStep2: "Kiểm tra sự tồn tại của phụ đề tiếng Anh / tiếng Việt gốc...",
    loaderStep3: "Dự phòng: Trích xuất luồng âm thanh từ video (bất đồng bộ)...",
    loaderStep4: "Đang tải tệp âm thanh lên Gemini File API...",
    loaderStep5: "Khởi chạy Gemini Flash Audio Speech-to-Text (bảo vệ glossary thuật ngữ)...",
    loaderStep6: "Phân mảnh văn bản (chunking) & tạo lập Vector Index..."
  }
};

const EXAMPLES = [
  {
    title: "Data Structures & Algorithms - Harvard CS50",
    url: "https://www.youtube.com/watch?v=RBSGKlAboiM"
  },
  {
    title: "FastAPI Complete Tutorial for Beginners",
    url: "https://www.youtube.com/watch?v=tLKKmCO9_p4"
  },
  {
    title: "Neural Networks from Scratch (3Blue1Brown)",
    url: "https://www.youtube.com/watch?v=aircAruvnKk"
  }
];

export default function App() {
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('vi'); // Default to Vietnamese
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(null);
  const [segments, setSegments] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [isProcessed, setIsProcessed] = useState(false);
  const [pendingWorkspaceData, setPendingWorkspaceData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [videoOverlayCc, setVideoOverlayCc] = useState(false);
  
  // History & Rate Limit States
  const [history, setHistory] = useState([]);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // 1. Theme application effect
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  // 2. Load History on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('studymind_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing study history:', e);
      }
    }
  }, []);

  // Sync routing on initial load
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');

    if (path === '/video' && videoUrl) {
      setCurrentPath('/video');
      setTimeout(() => {
        handleUrlSubmit(videoUrl);
      }, 150);
    } else if (videoUrl) {
      // Redirect /?v=... (old style query) to /video?v=...
      window.history.replaceState({}, '', `/video?v=${encodeURIComponent(videoUrl)}`);
      setCurrentPath('/video');
      setTimeout(() => {
        handleUrlSubmit(videoUrl);
      }, 150);
    } else if (path !== '/' && path !== '/home') {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    } else if (path === '/home') {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const videoUrl = params.get('v');
      
      setCurrentPath(path);
      
      if (path === '/video' && videoUrl) {
        if (url !== videoUrl) {
          handleUrlSubmit(videoUrl);
        }
      } else {
        setUrl('');
        setSegments([]);
        setCurrentTime(0);
        setActiveTab('chat');
        setLoading(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [url]);

  // 3. Translation utility
  const t = (key) => {
    return LOCALIZATION[lang][key] || key;
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // 4. Rate Limiting Check
  const checkRateLimit = (submittedUrl) => {
    // 1. Bypass rate limit completely on Localhost for development/testing
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return true;
    }

    // 2. PREVENT RATE LIMITING FOR PRE-CONFIGURED SAMPLES & HISTORY (Already processed)
    const isExample = EXAMPLES.some(ex => ex.url.toLowerCase() === submittedUrl.toLowerCase());
    const isHistory = history.some(item => item.url.toLowerCase() === submittedUrl.toLowerCase());
    if (isExample || isHistory) return true;

    const savedTimestamps = localStorage.getItem('studymind_request_timestamps');
    let timestamps = [];
    if (savedTimestamps) {
      try {
        timestamps = JSON.parse(savedTimestamps);
      } catch (e) {}
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Filter out timestamps older than 24 hours
    const activeTimestamps = timestamps.filter(t => t > oneDayAgo);

    // 3. Raise limit to 10 for public testing since we now have 6 rotated API keys!
    if (activeTimestamps.length >= 10) {
      // Hit rate limit (10 requests per day max)
      setShowRateLimitModal(true);
      return false;
    }

    // Add current timestamp and save
    activeTimestamps.push(now);
    localStorage.setItem('studymind_request_timestamps', JSON.stringify(activeTimestamps));
    return true;
  };

  // 5. Handle Video Submission & API calls
  const handleUrlSubmit = async (submittedUrl) => {
    // Run Rate Limiting check
    if (!checkRateLimit(submittedUrl)) {
      return;
    }

    setUrl(submittedUrl);
    setLoading(true);
    setIsProcessed(false);
    setPendingWorkspaceData(null);
    setIsDemoMode(false);
    setSegments([]);
    setProgress(0);

    let fetchedSegments = null;
    let videoTitle = "Video Lecture";
    let demoIntervalId = null;

    // Set custom titles based on example URLs
    const matchedExample = EXAMPLES.find(ex => ex.url.toLowerCase() === submittedUrl.toLowerCase());
    if (matchedExample) {
      videoTitle = matchedExample.title;
    } else {
      // Get short identifier for custom URL
      const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = submittedUrl.match(reg);
      const videoId = match ? match[2] : "ID";
      videoTitle = `Lecture Video [${videoId}]`;
    }

    const startTime = Date.now();
    try {
      // Connect to FastAPI backend async endpoint
      const response = await fetch('/api/transcriptions/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: submittedUrl })
      });

      if (!response.ok) {
        throw new Error('Backend failed or not running');
      }

      const data = await response.json();
      const taskId = data.task_id;
      if (!taskId) {
        throw new Error('No task ID returned by backend');
      }

      // Poll task status
      let taskCompleted = false;
      let taskResult = null;
      const pollInterval = 2000; // Poll every 2 seconds
      
      while (!taskCompleted) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(`/api/tasks/${taskId}`);
        if (!statusResponse.ok) {
          throw new Error('Failed to fetch task status');
        }
        
        const statusData = await statusResponse.json();
        if (statusData.progress !== undefined) {
          setProgress(statusData.progress);
        }
        if (statusData.status === 'SUCCESS') {
          taskCompleted = true;
          taskResult = statusData.result;
        } else if (statusData.status === 'FAILURE') {
          throw new Error(statusData.result?.error || 'Task failed on backend');
        } else if (statusData.status === 'REVOKED') {
          throw new Error('Task was cancelled');
        }
      }

      if (taskResult && taskResult.segments && taskResult.segments.length > 0) {
        fetchedSegments = taskResult.segments;
      } else {
        throw new Error('No segments found in task result');
      }
    } catch (err) {
      console.warn('Backend API request failed. Falling back to frontend mock data for demo.', err);
      setIsDemoMode(true);
      const mockSegments = getMockSegmentsForUrl(submittedUrl);
      fetchedSegments = mockSegments;
      
      // Simulate progress for Demo Mode
      setProgress(0);
      demoIntervalId = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            if (demoIntervalId) clearInterval(demoIntervalId);
            return 95;
          }
          return prev + 5;
        });
      }, 200);
    } finally {
      // Keep loader visible for a minimum of 4 seconds to show the beautiful terminal animation
      const elapsed = Date.now() - startTime;
      const minDuration = 4000;
      const remainingTime = Math.max(0, minDuration - elapsed);
      
      setTimeout(() => {
        if (demoIntervalId) clearInterval(demoIntervalId);
        setIsProcessed(true);
        setProgress(100);
        setPendingWorkspaceData({
          url: submittedUrl,
          title: videoTitle,
          segments: fetchedSegments
        });
        // Sync URL query parameters & Route to /video
        window.history.pushState({}, '', `/video?v=${encodeURIComponent(submittedUrl)}`);
        setCurrentPath('/video');
      }, remainingTime);
    }
  };

  const handleLaunchWorkspace = () => {
    if (pendingWorkspaceData) {
      setSegments(pendingWorkspaceData.segments);
      addToHistory(pendingWorkspaceData.url, pendingWorkspaceData.title);
    }
    setLoading(false);
  };

  const addToHistory = (url, title) => {
    setHistory(prev => {
      // Check if already exists, remove it first to move to top
      const filtered = prev.filter(item => item.url.toLowerCase() !== url.toLowerCase());
      const updated = [
        {
          url,
          title,
          date: new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
        },
        ...filtered
      ];
      // Limit to 30 items to prevent storage bloat
      const capped = updated.slice(0, 30);
      localStorage.setItem('studymind_history', JSON.stringify(capped));
      return capped;
    });
  };

  const deleteHistoryItem = (urlToDelete, e) => {
    e.stopPropagation(); // Avoid triggering loading the video
    setHistory(prev => {
      const updated = prev.filter(item => item.url !== urlToDelete);
      localStorage.setItem('studymind_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    localStorage.removeItem('studymind_history');
    setHistory([]);
  };

  const handleSeek = (time) => {
    setSeekTime(time);
    setTimeout(() => {
      setSeekTime(null);
    }, 100);
  };

  const handleBackToLanding = () => {
    setUrl('');
    setSegments([]);
    setCurrentTime(0);
    setActiveTab('chat');
    // Navigate back to /
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  return (
    <div className="app-wrapper">
      {/* Sleek App Header */}
      <header className="glass">
        <div className="logo" onClick={handleBackToLanding} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <BookOpen size={16} fill="white" />
          </div>
          <span>Study<span className="text-gradient">Mind</span></span>
        </div>

        <div className="header-controls">
          {isDemoMode && url && !loading && (
            <span className="demo-badge">
              <Sparkles size={12} style={{ animation: 'pulseGlow 2s infinite' }} />
              {t('demoBadge')}
            </span>
          )}
          <LanguageToggle lang={lang} setLang={setLang} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} t={t} />
        </div>
      </header>

      {/* Main Area */}
      <main className="main-content">
        {currentPath !== '/video' ? (
          <LandingPage 
            onSubmit={handleUrlSubmit} 
            history={history}
            onDeleteHistory={deleteHistoryItem}
            onClearHistory={clearHistory}
            examples={EXAMPLES}
            t={t} 
          />
        ) : loading ? (
          <SkeletonLoader 
            t={t} 
            isProcessed={isProcessed} 
            onLaunch={handleLaunchWorkspace} 
            lang={lang} 
            progress={progress}
          />
        ) : (
          <div className="workspace-container">
            {/* Top Workspace Bar containing Back Button */}
            <div className="workspace-top-bar">
              <button className="workspace-back-btn btn-secondary" onClick={handleBackToLanding}>
                <ArrowLeft size={16} />
                <span>{t('backToLanding')}</span>
              </button>
            </div>

            <div className="workspace-grid">
              {/* Left Column: Player & Subtitles (Larger video layout) */}
              <div className="left-column">
                <VideoPlayer 
                  url={url} 
                  onProgress={setCurrentTime} 
                  seekTime={seekTime} 
                  segments={segments}
                  currentTime={currentTime}
                  showOverlay={videoOverlayCc}
                  lang={lang}
                />
                <SubtitleViewer 
                  segments={segments} 
                  currentTime={currentTime} 
                  onSeek={handleSeek} 
                  t={t}
                  lang={lang}
                  videoOverlayCc={videoOverlayCc}
                  setVideoOverlayCc={setVideoOverlayCc}
                />
              </div>

              {/* Right Column: Interactive Study Kits */}
              <div className="right-column">
                <SidebarTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t}>
                  {activeTab === 'chat' && (
                    <RAGChatbot segments={segments} onSeek={handleSeek} t={t} />
                  )}
                  {activeTab === 'flashcards' && (
                    <FlashcardKit segments={segments} t={t} />
                  )}
                  {activeTab === 'quiz' && (
                    <QuizKit segments={segments} t={t} />
                  )}
                  {activeTab === 'mindmap' && (
                    <MindmapKit segments={segments} onSeek={handleSeek} t={t} />
                  )}
                </SidebarTabs>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Rate Limit Alert Modal */}
      {showRateLimitModal && (
        <div className="modal-overlay glass">
          <div className="modal-content glass animate-pop-in">
            <div className="modal-warning-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>{t('rateLimitTitle')}</h3>
            <p>{t('rateLimitDesc')}</p>
            <button className="btn-primary modal-close-btn" onClick={() => setShowRateLimitModal(false)}>
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* App Footer */}
      <footer>
        <p>{t('footerText')} &copy; 2026 | <a href="https://github.com/TeamToTe/Smart-AI-Study-Companion" target="_blank" rel="noreferrer">GitHub Repository</a></p>
      </footer>
    </div>
  );
}

// Mock transcript generator for demo mode (Harvard CS50, FastAPI, 3Blue1Brown Neural Networks)
function getMockSegmentsForUrl(url) {
  const lowercaseUrl = url.toLowerCase();

  // 1. Harvard CS50: Linked List
  if (lowercaseUrl.includes("rbsgklaboim") || lowercaseUrl.includes("list") || lowercaseUrl.includes("cs50")) {
    return [
      { start: 0, end: 12, text: "Welcome back to CS50. Today we are going to explore data structures, specifically the linked list." },
      { start: 13, end: 28, text: "In computer science, a linked list is a linear data structure that consists of elements called nodes." },
      { start: 29, end: 44, text: "Unlike standard arrays, these nodes are not stored in contiguous chunks of memory." },
      { start: 45, end: 60, text: "Instead, each node has a pointer that holds the memory address of the next node in the list." },
      { start: 61, end: 75, text: "The first node is referred to as the head, and the final node points to NULL." },
      { start: 76, end: 92, text: "Let us see what happens when we want to insert a node. This operation is dynamic." },
      { start: 93, end: 110, text: "If we insert a node at the head of the list, we simply set the new node's next pointer to the current head." },
      { start: 111, end: 130, text: "Then, we update the head pointer to address the new node. This runs in O(1) constant time complexity." },
      { start: 131, end: 152, text: "If we delete a node, we must change the preceding node's pointer to bypass the deleted node." },
      { start: 153, end: 172, text: "This re-linking of pointers ensures memory is managed cleanly, avoiding memory leaks." },
      { start: 173, end: 195, text: "However, to search for a value in a linked list, we cannot use index arithmetic like arrays." },
      { start: 196, end: 215, text: "We must start at the head node and traverse through next pointers one-by-one." },
      { start: 216, end: 238, text: "Thus, the search time complexity is O(n), where n is the number of nodes in the list." },
      { start: 239, end: 260, text: "This trade-off is crucial to evaluate when designing software algorithms for datasets." }
    ];
  }

  // 2. FastAPI Tutorial
  if (lowercaseUrl.includes("tlkkmco9_p4") || lowercaseUrl.includes("fastapi")) {
    return [
      { start: 0, end: 14, text: "Welcome to this complete tutorial. We will build a production-ready API using the FastAPI framework." },
      { start: 15, end: 32, text: "FastAPI is a modern web framework designed for building REST APIs with Python 3.8+." },
      { start: 33, end: 48, text: "It is extremely fast, powered by Starlette for web routes and Uvicorn for ASGI execution." },
      { start: 49, end: 68, text: "One of its key features is declarative validation, which is handled automatically by Pydantic." },
      { start: 69, end: 85, text: "By using standard Python type hints, Pydantic parses and validates client inputs." },
      { start: 86, end: 104, text: "Let us define a schema for a new user request using Pydantic models." },
      { start: 105, end: 125, text: "If a request fails validation, FastAPI returns a 422 error detailing the invalid parameters." },
      { start: 126, end: 145, text: "FastAPI also supports native asynchronous programming out of the box using async/await." },
      { start: 146, end: 165, text: "We can define our endpoints as async def to handle I/O bound queries concurrently." },
      { start: 166, end: 185, text: "To create resources, we map endpoints to POST routers. Let us write @app.post() for users." },
      { start: 186, end: 205, text: "FastAPI also has a powerful dependency injection system declared via Depends()." },
      { start: 206, end: 228, text: "We can inject services, database sessions, or security protocols cleanly into our endpoint signatures." }
    ];
  }

  // 3. 3Blue1Brown Neural Network
  if (lowercaseUrl.includes("aircaruvnkk") || lowercaseUrl.includes("neural") || lowercaseUrl.includes("brown")) {
    return [
      { start: 0, end: 11, text: "What is a neural network? Let's break down the mathematical fundamentals from scratch." },
      { start: 12, end: 28, text: "A neural network consists of layers of nodes. We pass inputs, multiply them by weights, and add biases." },
      { start: 29, end: 45, text: "To evaluate our network's predictions against the actual target, we use a loss function." },
      { start: 46, end: 65, text: "The loss function measures the error. A smaller loss value means our neural predictions are accurate." },
      { start: 66, end: 89, text: "To train the network, we must minimize this loss function. That is where gradient descent comes in." },
      { start: 90, end: 104, text: "Gradient descent is an optimization algorithm that calculates the gradient direction of steepest descent." },
      { start: 105, end: 122, text: "We update our weights by taking a step proportional to the negative gradient slope." },
      { start: 123, end: 139, text: "The step size is controlled by a hyperparameter called the learning rate." },
      { start: 140, end: 158, text: "If the learning rate is too small, gradient descent takes too long to converge." },
      { start: 159, end: 178, text: "If the learning rate is too large, the optimizer may overshoot the minimum and diverge." },
      { start: 179, end: 198, text: "During the training loop, inputs are fed forward in the forward pass to compute output loss." },
      { start: 199, end: 218, text: "Then, the errors are propagated back in backpropagation, updating weights at each layer." },
      { start: 219, end: 238, text: "This cycle of updates iteratively decreases training loss, training our model to learn patterns." }
    ];
  }

  // 4. Default Fallback
  return [
    { start: 0, end: 10, text: "Welcome to StudyMind. Paste a valid technical YouTube lecture to load transcriptions." },
    { start: 11, end: 25, text: "This AI study companion is designed to protect academic entities and optimize technical translations." },
    { start: 26, end: 40, text: "You can hover over terms like linked list or gradient descent to see definitions." },
    { start: 41, end: 55, text: "Use the AI Tutor sidebar on the right to query the transcript context with timestamp seekers." },
    { start: 56, end: 75, text: "The app also compiles flashcards, quizzes, and a conceptual mindmap based on transcript facts." },
    { start: 76, end: 95, text: "Click on any timestamp or mindmap node to seek the video to that exact point." }
  ];
}
