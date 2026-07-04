import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Languages, AlertTriangle, ArrowLeft, Trash2, LogIn, LogOut, User, Menu, X, HelpCircle, Bell, BellRing, Check, XCircle, RefreshCw, Unlock, Share2, Star, Lock } from 'lucide-react';
import LandingPage from './components/LandingPage';
import SkeletonLoader from './components/SkeletonLoader';
import VideoPlayer from './components/VideoPlayer';
import SubtitleViewer from './components/SubtitleViewer';
import SidebarTabs from './components/SidebarTabs';
import RAGChatbot from './components/RAGChatbot';
import FlashcardKit from './components/FlashcardKit';
import QuizKit from './components/QuizKit';
import MindmapKit from './components/MindmapKit';
import SharedMaterialsTab from './components/SharedMaterialsTab';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import GuideModal from './components/GuideModal';
import ConfirmModal from './components/ConfirmModal';
import { LOCALIZATION } from './data/localization';
import { EXAMPLES } from './data/examples';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('studymind_theme') || 'light';
  });
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('studymind_lang') || 'vi';
  });
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(null);
  const [segments, setSegments] = useState([]);
  const [originalSegments, setOriginalSegments] = useState(null);
  const [sharedMeta, setSharedMeta] = useState(null);
  const [existingTranslations, setExistingTranslations] = useState([]);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [pendingLicenseMaterial, setPendingLicenseMaterial] = useState(null);
  const [agreedToLandingLicense, setAgreedToLandingLicense] = useState(false);
  const [submittedUrlCache, setSubmittedUrlCache] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('studymind_active_tab') || 'chat';
  });
  const [chatQuery, setChatQuery] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  const [isProcessed, setIsProcessed] = useState(false);
  const [pendingWorkspaceData, setPendingWorkspaceData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [videoOverlayCc, setVideoOverlayCc] = useState(() => {
    const saved = localStorage.getItem('studymind_video_overlay_cc');
    return saved !== null ? saved === 'true' : true;
  });
  const [subMode, setSubMode] = useState(() => {
    return localStorage.getItem('studymind_sub_mode') || 'bilingual';
  });
  const [pauseTrigger, setPauseTrigger] = useState(0);
  const [togglePlayTrigger, setTogglePlayTrigger] = useState(0);

  // Role and Shared Materials Mocking State
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem('studymind_demo_role') || 'requester';
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Sync role to localStorage
  useEffect(() => {
    localStorage.setItem('studymind_demo_role', currentRole);
  }, [currentRole]);

  // Load and listen to notifications changes
  const loadNotifications = () => {
    const saved = localStorage.getItem('studymind_notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleNotiUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('studymind_notifications_updated', handleNotiUpdate);
    return () => {
      window.removeEventListener('studymind_notifications_updated', handleNotiUpdate);
    };
  }, []);

  // Auth state
  const { user, session, signOut, loading: authLoading, isRecovering, setIsRecovering } = useAuth();

  const demoEmail = currentRole === 'owner' ? 'hoang_cs@fpt.edu.vn' : (user?.email || 'learner@fpt.edu.vn');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle password recovery flow from email
  useEffect(() => {
    if (isRecovering) {
      setAuthModalMode('update-password');
      setIsAuthModalOpen(true);
    }
  }, [isRecovering]);

  // Custom Modal States (Confirm/Alert)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Yes",
    cancelText: "No",
    showCancel: true,
    onConfirm: null,
    onCancel: null
  });
  
  // History & Rate Limit States
  const [history, setHistory] = useState([]);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  // Routing State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // 1. Theme application effect
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('studymind_theme', theme);
  }, [theme]);

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('studymind_lang', lang);
  }, [lang]);

  // Save videoOverlayCc preference to localStorage
  useEffect(() => {
    localStorage.setItem('studymind_video_overlay_cc', videoOverlayCc);
  }, [videoOverlayCc]);

  // Save subMode preference to localStorage
  useEffect(() => {
    localStorage.setItem('studymind_sub_mode', subMode);
  }, [subMode]);

  // Save active tab preference to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('studymind_active_tab', activeTab);
  }, [activeTab]);

  // Auto-open guide tour on first load of video workspace
  useEffect(() => {
    if (isProcessed && segments.length > 0) {
      const tourCompleted = localStorage.getItem('studymind_tour_completed');
      if (!tourCompleted) {
        setIsGuideOpen(true);
        localStorage.setItem('studymind_tour_completed', 'true');
      }
    }
  }, [isProcessed, segments]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // Alt + 1/2/3/4: tab switching
      if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const tabMap = {
          '1': 'chat',
          '2': 'flashcards',
          '3': 'quiz',
          '4': 'mindmap'
        };
        setActiveTab(tabMap[e.key]);
        return;
      }

      // If user is typing, ignore other global shortcuts
      if (isTyping) return;

      // Space: Toggle play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        setTogglePlayTrigger(prev => prev + 1);
      }

      // Left Arrow: Seek backward 5s
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setSeekTime(Math.max(0, currentTime - 5));
      }

      // Right Arrow: Seek forward 5s
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        setSeekTime(currentTime + 5);
      }

      // Shift + N: Flip flashcard
      if (e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('studymind-flip-card'));
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
    };
  }, [currentTime]);

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
    if (authLoading) return;

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('v');
    const shareToken = params.get('share_token');

    if (shareToken) {
      setCurrentPath('/video');
      setTimeout(() => {
        loadSharedTranscriptToken(shareToken);
      }, 150);
    } else if (path === '/video' && videoUrl) {
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
  }, [authLoading]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    if (authLoading) return;

    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const videoUrl = params.get('v');
      const shareToken = params.get('share_token');
      
      setCurrentPath(path);
      
      if (shareToken) {
        loadSharedTranscriptToken(shareToken);
      } else if (path === '/video' && videoUrl) {
        if (url !== videoUrl) {
          handleUrlSubmit(videoUrl);
        }
      } else {
        setUrl('');
        setSegments([]);
        setSharedMeta(null);
        setCurrentTime(0);
        setActiveTab('chat');
        setLoading(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [url, authLoading]);

  // 3. Translation utility
  const t = (key) => {
    return LOCALIZATION[lang][key] || key;
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('studymind_theme', nextTheme);
      return nextTheme;
    });
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


  const handleLandingPageSubmit = async (submittedUrl) => {
    setSubmittedUrlCache(submittedUrl);
    
    let urlToProcess = submittedUrl;
    const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
    const match = submittedUrl.match(reg);
    if (match && match[2] && match[2].length === 11) {
      urlToProcess = `https://www.youtube.com/watch?v=${match[2]}`;
    }

    setLoading(true);
    setProgress(15);
    try {
      const response = await fetch(`/api/shares/transcripts?video_url=${encodeURIComponent(urlToProcess)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setExistingTranslations(data);
          setShowExistingModal(true);
          setLoading(false);
          setProgress(0);
        } else {
          handleUrlSubmit(submittedUrl);
        }
      } else {
        handleUrlSubmit(submittedUrl);
      }
    } catch (err) {
      console.error("Error checking existing translations:", err);
      handleUrlSubmit(submittedUrl);
    }
  };

  const handleSelectExistingTranslation = (mat) => {
    if (user && mat.owner_id === user.id) {
      setShowExistingModal(false);
      loadSharedTranscriptToken(mat.share_token);
    } else {
      setPendingLicenseMaterial(mat);
      setAgreedToLandingLicense(false);
    }
  };

  const handleConfirmLandingLicense = async () => {
    if (!agreedToLandingLicense || !pendingLicenseMaterial) return;

    const token = pendingLicenseMaterial.share_token;
    setPendingLicenseMaterial(null);
    setShowExistingModal(false);

    if (session) {
      setLoading(true);
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (session.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        await fetch(`/api/shares/transcripts/${token}/clone`, {
          method: 'POST',
          headers: headers
        });
      } catch (err) {
        console.error('Cloning failed, fallback:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadSharedTranscriptToken(token);
  };

  const handleForceNewTranslation = () => {
    setShowExistingModal(false);
    setPendingLicenseMaterial(null);
    handleUrlSubmit(submittedUrlCache);
  };

  const getLicenseDescription = (lic) => {
    switch (lic) {
      case 'CC0':
        return lang === 'vi' 
          ? 'CC0: Tác giả từ bỏ mọi quyền tác giả, chuyển tác phẩm vào miền công cộng. Cho phép sao chép, sửa đổi, phân phối tự do cho mọi mục đích.'
          : 'CC0: Creator waives all copyright, placing the work in the public domain. Copy, modify, and distribute freely for any purpose.';
      case 'CC-BY':
        return lang === 'vi' 
          ? 'CC-BY: Cho phép chia sẻ, sửa đổi cho mọi mục đích (thương mại/phi thương mại) nhưng phải ghi danh tác giả.' 
          : 'CC-BY: Share and adapt freely, even commercially, with attribution to the author.';
      case 'CC-BY-SA':
        return lang === 'vi' 
          ? 'CC-BY-SA: Cho phép sửa đổi, chia sẻ nhưng các tác phẩm phái sinh phải áp dụng cùng giấy phép này và ghi danh tác giả.'
          : 'CC-BY-SA: Share and adapt, but new creations must be licensed under identical terms and attribute the author.';
      case 'CC-BY-NC':
        return lang === 'vi' 
          ? 'CC-BY-NC: Cho phép chia sẻ, sửa đổi nhưng chỉ cho mục đích phi thương mại và phải ghi danh tác giả.' 
          : 'CC-BY-NC: Share and adapt with attribution, strictly for non-commercial purposes only.';
      case 'CC-BY-NC-SA':
        return lang === 'vi' 
          ? 'CC-BY-NC-SA: Cho phép sửa đổi, chia sẻ cho mục đích phi thương mại, yêu cầu ghi danh tác giả và áp dụng cùng giấy phép.'
          : 'CC-BY-NC-SA: Share and adapt with attribution, strictly for non-commercial purposes under identical terms.';
      case 'CC-BY-ND':
        return lang === 'vi' 
          ? 'CC-BY-ND: Cho phép sao chép chia sẻ tác phẩm nguyên bản, cấm sửa đổi phái sinh, phải ghi danh tác giả.' 
          : 'CC-BY-ND: Copy and distribute original work with attribution, no modifications allowed.';
      case 'CC-BY-NC-ND':
        return lang === 'vi' 
          ? 'CC-BY-NC-ND: Cho phép chia sẻ tác phẩm nguyên bản phi thương mại, cấm sửa đổi phái sinh, phải ghi danh tác giả.'
          : 'CC-BY-NC-ND: Share original work for non-commercial purposes with attribution, no modifications allowed.';
      default:
        return lic;
    }
  };

  const loadSharedTranscriptToken = async (shareToken) => {
    setLoading(true);
    setProgress(20);
    try {
      const response = await fetch(`/api/shares/transcripts/${shareToken}`);
      if (!response.ok) {
        throw new Error(lang === 'vi' ? 'Không tìm thấy hoặc không thể truy cập bản dịch chia sẻ.' : 'Shared transcript not found or inaccessible.');
      }
      const data = await response.json();
      setProgress(60);
      
      const mappedSegments = (data.segments || []).map(seg => ({
        start: Number(seg.start_time),
        end: Number(seg.end_time),
        text: seg.translated_text,
        original_text: seg.original_text,
        highlights: seg.highlights || []
      }));

      setProgress(90);
      const videoUrl = data.video_url;
      setUrl(videoUrl);
      setSegments(mappedSegments);
      setSharedMeta(data);
      setIsProcessed(true);
      
      sessionStorage.setItem('studymind_current_share_token', shareToken);
      sessionStorage.setItem('studymind_current_share_owner', data.owner_id);
      if (data.cloned_from_id) {
        sessionStorage.setItem('studymind_current_share_cloned_from', data.cloned_from_id);
      } else {
        sessionStorage.removeItem('studymind_current_share_cloned_from');
      }

      if (user) {
        addToHistory(videoUrl, data.video_title);
      }

      window.history.pushState({}, '', `/video?v=${encodeURIComponent(videoUrl)}&share_token=${shareToken}`);
      setCurrentPath('/video');
      setActiveTab('share');
    } catch (err) {
      console.error(err);
      setModalConfig({
        isOpen: true,
        title: lang === 'vi' ? 'Lỗi Tải Bản Dịch' : 'Load Error',
        message: err.message,
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
          handleBackToLanding();
        }
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // 5. Handle Video Submission & API calls
  const handleUrlSubmit = async (submittedUrl) => {
    // Sanitize YouTube URL (e.g., extract video ID and strip playlist or time parameters)
    let urlToProcess = submittedUrl;
    let videoId = "ID";
    const reg = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
    const match = submittedUrl.match(reg);
    if (match && match[2] && match[2].length === 11) {
      videoId = match[2];
      urlToProcess = `https://www.youtube.com/watch?v=${videoId}`;
    }

    if (!user) {
      setAuthModalMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    // Run Rate Limiting check
    if (!checkRateLimit(urlToProcess)) {
      return;
    }

    // Check frontend localStorage cache first
    const cachedSegmentsStr = localStorage.getItem(`studymind_cache_segments_${urlToProcess.toLowerCase()}`);
    if (cachedSegmentsStr) {
      try {
        const cachedSegments = JSON.parse(cachedSegmentsStr);
        if (cachedSegments && cachedSegments.length > 0) {
          const matchedExample = EXAMPLES.find(ex => ex.url.toLowerCase() === urlToProcess.toLowerCase());
          let videoTitle = "Video Lecture";
          if (matchedExample) {
            videoTitle = matchedExample.title;
          } else {
            videoTitle = `Lecture Video [${videoId}]`;
          }

          setUrl(urlToProcess);
          setSegments(cachedSegments);
          setLoading(false);
          setIsProcessed(true);
          window.history.pushState({}, '', `/video?v=${encodeURIComponent(urlToProcess)}`);
          setCurrentPath('/video');
          addToHistory(urlToProcess, videoTitle);
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached segments:", e);
      }
    }

    setUrl(urlToProcess);
    setLoading(true);
    setIsProcessed(false);
    setPendingWorkspaceData(null);
    setSegments([]);
    setOriginalSegments(null);
    setSharedMeta(null);
    setProgress(0);

    // Redirect to /video immediately so user sees the progress screen from 0%
    const searchParams = new URLSearchParams(window.location.search);
    const currentV = searchParams.get('v');
    if (window.location.pathname !== '/video' || currentV !== urlToProcess) {
      window.history.pushState({}, '', `/video?v=${encodeURIComponent(urlToProcess)}`);
    }
    setCurrentPath('/video');

    let fetchedSegments = null;
    let videoTitle = "Video Lecture";

    // Set custom titles based on example URLs
    const matchedExample = EXAMPLES.find(ex => ex.url.toLowerCase() === urlToProcess.toLowerCase());
    if (matchedExample) {
      videoTitle = matchedExample.title;
    } else {
      videoTitle = `Lecture Video [${videoId}]`;
    }

    const startTime = Date.now();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      // Connect to FastAPI backend async endpoint
      const response = await fetch('/api/transcriptions/async', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ url: urlToProcess })
      });

      if (!response.ok) {
        let errMessage = lang === 'vi' ? 'Yêu cầu phân tích video thất bại.' : 'Backend request failed.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errMessage = errData.detail;
          }
        } catch (_) {
          try {
            const text = await response.text();
            if (text) errMessage = text;
          } catch (_) {}
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      const taskId = data.task_id;
      if (!taskId) {
        throw new Error(lang === 'vi' ? 'Không nhận được Task ID từ máy chủ.' : 'No task ID returned.');
      }

      // Poll task status
      let taskCompleted = false;
      let taskResult = null;
      const pollInterval = 2000; // Poll every 2 seconds
      
      while (!taskCompleted) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusHeaders = {};
        if (session?.access_token) {
          statusHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        const statusResponse = await fetch(`/api/tasks/${taskId}`, {
          headers: statusHeaders
        });
        if (!statusResponse.ok) {
          throw new Error(lang === 'vi' ? 'Lỗi kiểm tra tiến độ tác vụ.' : 'Failed to fetch task status.');
        }
        
        const statusData = await statusResponse.json();
        if (statusData.progress !== undefined) {
          setProgress(statusData.progress);
        }
        if (statusData.status === 'SUCCESS') {
          taskCompleted = true;
          taskResult = statusData.result;
        } else if (statusData.status === 'FAILURE') {
          throw new Error(statusData.result?.error || (lang === 'vi' ? 'Tác vụ thất bại trên hệ thống.' : 'Task failed on backend.'));
        } else if (statusData.status === 'REVOKED') {
          throw new Error(lang === 'vi' ? 'Tác vụ đã bị hủy bỏ.' : 'Task was cancelled.');
        }
      }

      if (taskResult && taskResult.segments && taskResult.segments.length > 0) {
        fetchedSegments = taskResult.segments;
      } else {
        throw new Error(lang === 'vi' ? 'Không tìm thấy dữ liệu phụ đề.' : 'No segments found.');
      }

      // Keep loader visible for a minimum of 4 seconds to show the beautiful terminal animation
      const elapsed = Date.now() - startTime;
      const minDuration = 4000;
      const remainingTime = Math.max(0, minDuration - elapsed);
      
      setTimeout(() => {
        setIsProcessed(true);
        setProgress(100);
        setPendingWorkspaceData({
          url: urlToProcess,
          title: videoTitle,
          segments: fetchedSegments
        });
      }, remainingTime);

    } catch (err) {
      console.error('Backend transcription failed:', err);
      // Reset state and return to landing
      setUrl('');
      setSegments([]);
      setCurrentTime(0);
      setActiveTab('chat');
      setCurrentPath('/');
      setLoading(false);
      setIsProcessed(false);
      setProgress(0);

      // Show custom alert dialog
      setModalConfig({
        isOpen: true,
        title: lang === 'vi' ? 'Lỗi Phân Tích' : 'Analysis Error',
        message: err.message || (lang === 'vi' ? 'Không thể kết nối đến máy chủ phân tích.' : 'Could not connect to the transcription server.'),
        confirmText: lang === 'vi' ? 'Đóng' : 'Close',
        showCancel: false,
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        onCancel: null
      });
    }
  };

  const handleLaunchWorkspace = () => {
    if (pendingWorkspaceData) {
      setSegments(pendingWorkspaceData.segments);
      addToHistory(pendingWorkspaceData.url, pendingWorkspaceData.title);
      // Cache segments in frontend localStorage
      try {
        localStorage.setItem(
          `studymind_cache_segments_${pendingWorkspaceData.url.toLowerCase()}`,
          JSON.stringify(pendingWorkspaceData.segments)
        );
      } catch (e) {
        console.error("Failed to cache segments in localStorage:", e);
      }
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
    setModalConfig({
      isOpen: true,
      title: lang === 'vi' ? 'Xóa Bài Giảng' : 'Delete Video',
      message: t('confirmDeleteVideo'),
      confirmText: lang === 'vi' ? 'Xóa' : 'Delete',
      cancelText: lang === 'vi' ? 'Hủy' : 'Cancel',
      showCancel: true,
      onConfirm: () => {
        setHistory(prev => {
          const updated = prev.filter(item => item.url !== urlToDelete);
          localStorage.setItem('studymind_history', JSON.stringify(updated));
          return updated;
        });
        localStorage.removeItem(`studymind_cache_segments_${urlToDelete.toLowerCase()}`);
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const clearHistory = () => {
    setModalConfig({
      isOpen: true,
      title: lang === 'vi' ? 'Xóa Lịch Sử' : 'Clear History',
      message: t('confirmClearHistory'),
      confirmText: lang === 'vi' ? 'Xóa Tất Cả' : 'Clear All',
      cancelText: lang === 'vi' ? 'Hủy' : 'Cancel',
      showCancel: true,
      onConfirm: () => {
        localStorage.removeItem('studymind_history');
        // Clear all cached segments keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('studymind_cache_segments_')) {
            localStorage.removeItem(key);
          }
        }
        setHistory([]);
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleApproveRequest = (requestId, notiId) => {
    const savedRequests = localStorage.getItem('studymind_material_requests') || '[]';
    const reqs = JSON.parse(savedRequests);
    const reqIndex = reqs.findIndex(r => r.id === requestId);
    if (reqIndex !== -1) {
      reqs[reqIndex].status = 'approved';
      localStorage.setItem('studymind_material_requests', JSON.stringify(reqs));

      const savedNotis = localStorage.getItem('studymind_notifications') || '[]';
      const notis = JSON.parse(savedNotis);
      notis.push({
        id: `noti-${Date.now()}`,
        type: 'request_approved',
        title: lang === 'vi' ? 'Yêu cầu được phê duyệt!' : 'Request Approved!',
        message: lang === 'vi' 
          ? `Chủ sở hữu đã phê duyệt quyền truy cập bản dịch [${reqs[reqIndex].materialLanguage.toUpperCase()}] cho video "${reqs[reqIndex].videoTitle}".`
          : `The Owner approved access to the [${reqs[reqIndex].materialLanguage.toUpperCase()}] translation for "${reqs[reqIndex].videoTitle}".`,
        requesterEmail: reqs[reqIndex].requesterEmail,
        read: false,
        createdAt: new Date().toISOString()
      });

      const notiIndex = notis.findIndex(n => n.id === notiId);
      if (notiIndex !== -1) {
        notis[notiIndex].read = true;
        notis[notiIndex].status = 'approved';
      }
      localStorage.setItem('studymind_notifications', JSON.stringify(notis));
      window.dispatchEvent(new Event('studymind_notifications_updated'));
    }
  };

  const handleRejectRequest = (requestId, notiId) => {
    const savedRequests = localStorage.getItem('studymind_material_requests') || '[]';
    const reqs = JSON.parse(savedRequests);
    const reqIndex = reqs.findIndex(r => r.id === requestId);
    if (reqIndex !== -1) {
      reqs[reqIndex].status = 'rejected';
      localStorage.setItem('studymind_material_requests', JSON.stringify(reqs));

      const savedNotis = localStorage.getItem('studymind_notifications') || '[]';
      const notis = JSON.parse(savedNotis);
      notis.push({
        id: `noti-${Date.now()}`,
        type: 'request_rejected',
        title: lang === 'vi' ? 'Yêu cầu bị từ chối' : 'Request Denied',
        message: lang === 'vi' 
          ? `Chủ sở hữu từ chối quyền truy cập bản dịch [${reqs[reqIndex].materialLanguage.toUpperCase()}] cho video "${reqs[reqIndex].videoTitle}".`
          : `The Owner denied access to the [${reqs[reqIndex].materialLanguage.toUpperCase()}] translation for "${reqs[reqIndex].videoTitle}".`,
        requesterEmail: reqs[reqIndex].requesterEmail,
        read: false,
        createdAt: new Date().toISOString()
      });

      const notiIndex = notis.findIndex(n => n.id === notiId);
      if (notiIndex !== -1) {
        notis[notiIndex].read = true;
        notis[notiIndex].status = 'rejected';
      }
      localStorage.setItem('studymind_notifications', JSON.stringify(notis));
      window.dispatchEvent(new Event('studymind_notifications_updated'));
    }
  };

  const handleClearNotifications = () => {
    const cleared = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem('studymind_notifications', JSON.stringify(cleared));
    setNotifications(cleared);
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
    setOriginalSegments(null);
    setSharedMeta(null);
    setCurrentTime(0);
    setActiveTab('chat');
    sessionStorage.removeItem('studymind_current_share_token');
    sessionStorage.removeItem('studymind_current_share_owner');
    sessionStorage.removeItem('studymind_current_share_cloned_from');
    // Navigate back to /
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  return (
    <div className="app-wrapper">
      {/* Sleek App Header */}
      <header className="glass">
        <div className="logo" onClick={handleBackToLanding}>
          <div className="logo-icon">
            <BookOpen size={16} fill="white" />
          </div>
          <span>Study<span className="text-gradient">Mind</span></span>
        </div>

        {/* Desktop Controls */}
        <div className="header-controls">


          {/* Interactive Notifications Bell */}
          <div className="notification-bell-container">
            <button 
              className={`btn-secondary bell-btn ${notifications.filter(n => !n.read && (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail)).length > 0 ? 'pulse' : ''}`}
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              title={lang === 'vi' ? 'Thông báo' : 'Notifications'}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
            >
              {notifications.filter(n => !n.read && (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail)).length > 0 ? (
                <BellRing size={16} className="text-gradient-icon" />
              ) : (
                <Bell size={16} />
              )}
              {notifications.filter(n => !n.read && (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail)).length > 0 && (
                <span className="bell-badge-count">
                  {notifications.filter(n => !n.read && (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail)).length}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="notifications-dropdown glass animate-pop-in">
                <div className="noti-dropdown-header">
                  <h5>{lang === 'vi' ? 'Thông báo' : 'Notifications'}</h5>
                  <button onClick={handleClearNotifications} className="clear-noti-btn">
                    {lang === 'vi' ? 'Đánh dấu đã đọc' : 'Mark all read'}
                  </button>
                </div>

                <div className="noti-list">
                  {notifications.filter(n => (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail)).length === 0 ? (
                    <div className="noti-empty">
                      <p>{lang === 'vi' ? 'Không có thông báo mới' : 'No new notifications'}</p>
                    </div>
                  ) : (
                    notifications
                      .filter(n => (currentRole === 'owner' ? n.ownerEmail === demoEmail : n.requesterEmail === demoEmail))
                      .slice()
                      .reverse()
                      .map((noti) => (
                        <div key={noti.id} className={`noti-item ${noti.read ? 'read' : 'unread'}`}>
                          <div className="noti-item-content">
                            <div className="noti-item-header">
                              <h6>{noti.title}</h6>
                              <span className="noti-time">
                                {new Date(noti.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p>{noti.message}</p>
                            
                            {/* Action Buttons for Request received by Owner */}
                            {noti.type === 'request_received' && currentRole === 'owner' && noti.status !== 'approved' && noti.status !== 'rejected' && (
                              <div className="noti-item-actions">
                                <button 
                                  onClick={() => handleApproveRequest(noti.requestId, noti.id)} 
                                  className="btn-success btn-noti-action"
                                >
                                  <Check size={10} />
                                  <span>{lang === 'vi' ? 'Duyệt' : 'Approve'}</span>
                                </button>
                                <button 
                                  onClick={() => handleRejectRequest(noti.requestId, noti.id)} 
                                  className="btn-danger btn-noti-action"
                                >
                                  <XCircle size={10} />
                                  <span>{lang === 'vi' ? 'Từ chối' : 'Reject'}</span>
                                </button>
                              </div>
                            )}

                            {noti.status && (
                              <span className={`noti-status-label ${noti.status}`}>
                                {noti.status === 'approved' ? (lang === 'vi' ? 'Đã duyệt' : 'Approved') : (lang === 'vi' ? 'Từ chối' : 'Rejected')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          <LanguageToggle lang={lang} setLang={setLang} />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} t={t} />
          <button 
            className="btn-secondary help-tour-btn" 
            onClick={() => setIsGuideOpen(true)} 
            title={lang === 'vi' ? 'Hướng dẫn học tập' : 'Study Guide'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
          >
            <HelpCircle size={16} />
          </button>
          
          {user ? (
            <div className="user-profile-menu">
              <div className="user-info" title={user.email}>
                <User size={14} />
                <span className="user-email-text">{user.email.split('@')[0]}</span>
              </div>
              <button className="btn-secondary btn-logout" onClick={() => signOut()}>
                <LogOut size={14} />
                <span className="btn-text-responsive">{t('signOut')}</span>
              </button>
            </div>
          ) : (
            <button className="btn-primary btn-login" onClick={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}>
              <LogIn size={14} />
              <span>{t('signIn')}</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-menu-drawer glass">
            <div className="mobile-menu-group">
              <div className="mobile-controls-row">
                <LanguageToggle lang={lang} setLang={setLang} />
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} t={t} />
                <button 
                  className="btn-secondary help-tour-btn" 
                  onClick={() => { setIsGuideOpen(true); setMobileMenuOpen(false); }} 
                  title={lang === 'vi' ? 'Hướng dẫn học tập' : 'Study Guide'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <HelpCircle size={16} />
                </button>
              </div>
            </div>
            
            <div className="mobile-menu-divider" />
            
            <div className="mobile-menu-group">
              {user ? (
                <div className="mobile-user-info-wrapper">
                  <div className="mobile-user-details">
                    <User size={14} />
                    <span className="mobile-user-email">{user.email}</span>
                  </div>
                  <button className="btn-secondary btn-logout w-full" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                    <LogOut size={14} />
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              ) : (
                <button className="btn-primary btn-login w-full" onClick={() => {
                  setAuthModalMode('signin');
                  setIsAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}>
                  <LogIn size={14} />
                  <span>{t('signIn')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Area */}
      <main className="main-content">
        {currentPath !== '/video' ? (
          <LandingPage 
            onSubmit={handleLandingPageSubmit} 
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
              {sharedMeta && (
                <div className="shared-meta-banner glass">
                  <Unlock size={14} className="text-success" style={{ marginRight: '6px' }} />
                  <span>
                    {lang === 'vi' 
                      ? `Đang xem bản dịch chia sẻ bởi ${sharedMeta.attribution_name || 'tác giả'} (${sharedMeta.license_type})`
                      : `Viewing translation shared by ${sharedMeta.attribution_name || 'author'} (${sharedMeta.license_type})`}
                  </span>
                </div>
              )}
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
                  pauseTrigger={pauseTrigger}
                  togglePlayTrigger={togglePlayTrigger}
                  subMode={subMode}
                />
                <SubtitleViewer 
                  segments={segments} 
                  currentTime={currentTime} 
                  onSeek={handleSeek} 
                  t={t}
                  lang={lang}
                  videoOverlayCc={videoOverlayCc}
                  setVideoOverlayCc={setVideoOverlayCc}
                  onHoverDomainWord={() => setPauseTrigger(prev => prev + 1)}
                  setPauseTrigger={setPauseTrigger}
                  subMode={subMode}
                  setSubMode={setSubMode}
                />
              </div>

              {/* Right Column: Interactive Study Kits */}
              <div className="right-column">
                <SidebarTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t}>
                  <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                    <RAGChatbot segments={segments} onSeek={handleSeek} t={t} videoUrl={url} chatQuery={chatQuery} setChatQuery={setChatQuery} />
                  </div>
                  <div style={{ display: activeTab === 'flashcards' ? 'block' : 'none', height: '100%' }}>
                    <FlashcardKit segments={segments} t={t} videoUrl={url} lang={lang} />
                  </div>
                  <div style={{ display: activeTab === 'quiz' ? 'block' : 'none', height: '100%' }}>
                    <QuizKit segments={segments} t={t} videoUrl={url} lang={lang} />
                  </div>
                  <div style={{ display: activeTab === 'mindmap' ? 'block' : 'none', height: '100%' }}>
                    <MindmapKit segments={segments} onSeek={handleSeek} t={t} videoUrl={url} lang={lang} setChatQuery={setChatQuery} setActiveTab={setActiveTab} />
                  </div>
                  <div style={{ display: activeTab === 'share' ? 'block' : 'none', height: '100%' }}>
                    <SharedMaterialsTab 
                      videoUrl={url} 
                      videoTitle={pendingWorkspaceData?.title} 
                      segments={segments} 
                      onLoadSegments={(newSegs) => {
                        if (!originalSegments && segments && segments.length > 0) {
                          setOriginalSegments(segments);
                        }
                        setSegments(newSegs);
                      }} 
                      onUnloadSegments={handleBackToLanding}
                      lang={lang} 
                      t={t} 
                    />
                  </div>
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
        <p>
          {t('footerText')} &copy; 2026 |{' '}
          <a href="https://github.com/TeamToTe/Smart-AI-Study-Companion" target="_blank" rel="noreferrer">GitHub Repository</a> |{' '}
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSccMyV6meG-NjsJYqjAls43GR9x6JmrZAAvHN-l8bc0Z0J1cA/viewform?usp=dialog" target="_blank" rel="noreferrer" className="text-gradient" style={{ fontWeight: 'bold' }}>
            {t('feedbackSurvey')}
          </a>
        </p>
      </footer>

      {/* Custom Confirmation / Alert Modal */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        showCancel={modalConfig.showCancel}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          if (isRecovering && setIsRecovering) {
            setIsRecovering(false);
          }
        }} 
        lang={lang} 
        initialMode={authModalMode}
      />

      {/* Existing Translations Selection Modal */}
      {showExistingModal && (
        <div className="modal-overlay glass">
          <div className="modal-content glass-panel animate-pop-in" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <Share2 size={22} className="text-gradient-icon" />
              <h3>{lang === 'vi' ? 'Bản Dịch Cộng Đồng Có Sẵn' : 'Community Translations Available'}</h3>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                {lang === 'vi' 
                  ? 'Hệ thống phát hiện video bài giảng này đã có sẵn các bản dịch do cộng đồng đóng góp. Bạn có thể sử dụng bản dịch sẵn có (tiết kiệm thời gian và hạn ngạch API) hoặc chọn dịch lại từ đầu.'
                  : 'We found community translations for this lecture video. You can use an existing translation to save time and API quota, or start a new translation from scratch.'}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                {existingTranslations.map((mat) => {
                  const isOwner = user && mat.owner_id === user.id;
                  return (
                    <div 
                      key={mat.id} 
                      className="glass" 
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border-color)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent, #3b82f6)', padding: '2px 6px', borderRadius: '4px' }}>
                            {lang === 'vi' ? 'Bản dịch' : 'Translation'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={12} fill="var(--color-accent)" color="var(--color-accent)" />
                            {Number(mat.avg_rating || 0).toFixed(1)} ({mat.ratings_count || 0})
                          </span>
                        </div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {lang === 'vi' ? 'Người dịch: ' : 'Author: '}
                          <strong>{isOwner ? (lang === 'vi' ? 'Bạn sở hữu' : 'You own') : (mat.attribution_name || 'Contributor')}</strong>
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: '3px' }}>
                          {mat.license_type}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => handleSelectExistingTranslation(mat)}
                        className="btn-primary"
                        style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {lang === 'vi' ? 'Sử dụng' : 'Use'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  setShowExistingModal(false);
                  setExistingTranslations([]);
                }} 
                className="btn-secondary"
              >
                {lang === 'vi' ? 'Đóng' : 'Close'}
              </button>
              
              <button 
                onClick={handleForceNewTranslation} 
                className="btn-primary" 
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                {lang === 'vi' ? 'Dịch mới từ đầu' : 'Translate From Scratch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Landing License Agreement Modal */}
      {pendingLicenseMaterial && (
        <div className="modal-overlay glass">
          <div className="modal-content glass-panel animate-pop-in license-agreement-modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <Lock size={20} className="text-gradient-icon" />
              <h3>{lang === 'vi' ? 'Điều Khoản Bản Quyền & Truy Cập' : 'Copyright License Agreement'}</h3>
            </div>

            <div className="modal-body">
              <p className="intro-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {lang === 'vi' 
                  ? `Bản dịch này được chia sẻ bởi ${pendingLicenseMaterial.attribution_name || 'tác giả'} dưới giấy phép bản quyền quốc tế:` 
                  : `This translation is shared by ${pendingLicenseMaterial.attribution_name || 'author'} under the following international license:`}
              </p>

              <div className="license-details-box glass" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.01)' }}>
                <h5 className="license-title" style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{pendingLicenseMaterial.license_type}</h5>
                <p className="license-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>{getLicenseDescription(pendingLicenseMaterial.license_type)}</p>
                <div className="license-rules" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="rule-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Check size={12} className="text-success" />
                    <span>{lang === 'vi' ? 'Luôn luôn ghi công tác giả gốc.' : 'Always give credit to the original creator.'}</span>
                  </div>
                  {pendingLicenseMaterial.license_type.includes('NC') && (
                    <div className="rule-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Check size={12} className="text-danger" />
                      <span>{lang === 'vi' ? 'Không sử dụng cho mục đích thương mại.' : 'Do not use for commercial purposes.'}</span>
                    </div>
                  )}
                  {pendingLicenseMaterial.license_type.includes('ND') && (
                    <div className="rule-item" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <Check size={12} className="text-danger" />
                      <span>{lang === 'vi' ? 'Giữ nguyên bản, không chỉnh sửa phái sinh.' : 'Do not modify or adapt the translation.'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="license-agree-checkbox" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                <input 
                  type="checkbox" 
                  id="agreeLandingCheckbox" 
                  checked={agreedToLandingLicense} 
                  onChange={(e) => setAgreedToLandingLicense(e.target.checked)} 
                  style={{ marginTop: '2px' }}
                />
                <label htmlFor="agreeLandingCheckbox" style={{ cursor: 'pointer', lineHeight: 1.4 }}>
                  <strong>{lang === 'vi' ? 'Tôi cam kết tuân thủ đầy đủ điều khoản giấy phép bản quyền nêu trên.' : 'I commit to comply with the license terms specified above.'}</strong>
                </label>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPendingLicenseMaterial(null)} className="btn-secondary">
                {lang === 'vi' ? 'Quay lại' : 'Back'}
              </button>
              <button 
                onClick={handleConfirmLandingLicense} 
                disabled={!agreedToLandingLicense} 
                className="btn-primary"
              >
                <span>{lang === 'vi' ? 'Đồng ý & Tải' : 'Agree & Load'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal Tour */}
      <GuideModal 
        isOpen={isGuideOpen} 
        onClose={() => setIsGuideOpen(false)} 
        lang={lang} 
      />
    </div>
  );
}


