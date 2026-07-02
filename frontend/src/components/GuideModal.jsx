import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, Network, CheckCircle, ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import './GuideModal.css';

export default function GuideModal({ isOpen, onClose, lang }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: lang === 'vi' ? 'Bảo vệ Thuật ngữ & Tra Từ Điển' : 'Terminology Protection & Dictionary',
      icon: <BookOpen size={48} className="guide-icon-color" />,
      content: lang === 'vi' 
        ? [
            <span key="1">• Thuật ngữ tiếng Anh chuyên ngành được giữ nguyên để bảo toàn ngữ cảnh học.</span>,
            <span key="2">• <strong><span className="guide-highlight">Kích đúp (Double-click)</span></strong> vào từ bất kỳ trên phụ đề để tra nhanh từ điển Cambridge và nghe phát âm.</span>
          ]
        : [
            <span key="1">• Academic English terms are protected to maintain original study context.</span>,
            <span key="2">• <strong><span className="guide-highlight">Double-click</span></strong> any word in subtitles to look up in Cambridge quick dictionary & play audio.</span>
          ]
    },
    {
      title: lang === 'vi' ? 'Sơ đồ Tư duy & Kết nối RAG' : 'Mind Map & RAG Connection',
      icon: <Network size={48} className="guide-icon-color" />,
      content: lang === 'vi'
        ? [
            <span key="1">• Trực quan hóa cấu trúc bài học, hỗ trợ thu phóng và tua nhanh đến mốc phát video tương ứng.</span>,
            <span key="2">• Bấm một node sơ đồ và chọn nút <strong><span className="guide-highlight">"Hỏi AI"</span></strong> ở bảng chi tiết để chatbot trả lời sâu về chủ đề đó.</span>
          ]
        : [
            <span key="1">• Visualize lesson structures. Drag, zoom, and seek video playback directly from nodes.</span>,
            <span key="2">• Click a node and select <strong><span className="guide-highlight">"Ask AI"</span></strong> in details to command the chatbot to analyze it.</span>
          ]
    },
    {
      title: lang === 'vi' ? 'Thẻ ghi nhớ & Phân cấp Nhận thức' : 'Taxonomy Flashcards & Quizzes',
      icon: <CheckCircle size={48} className="guide-icon-color" />,
      content: lang === 'vi'
        ? [
            <span key="1">• Ôn luyện Flashcard phân cấp nhận thức theo <strong>Thang đo Bloom</strong> (Nhớ, Hiểu, Vận dụng, Phân tích).</span>,
            <span key="2">• Làm bài trắc nghiệm trích xuất trực tiếp và <strong><span className="guide-highlight">nhấp mốc thời gian</span></strong> ở câu làm sai để xem lại bài học.</span>
          ]
        : [
            <span key="1">• Learn active Flashcards classified by <strong>Bloom's Taxonomy</strong> (Remember, Understand, Apply, Analyze).</span>,
            <span key="2">• Take auto-generated quizzes and <strong><span className="guide-highlight">click timestamps</span></strong> on failed questions to review instantly.</span>
          ]
    },
    {
      title: lang === 'vi' ? 'Phím tắt Học tập nhanh' : 'Keyboard Study Shortcuts',
      icon: <Keyboard size={48} className="guide-icon-color" />,
      content: lang === 'vi'
        ? [
            <span key="1" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tối đa hóa thời gian học không cần chạm chuột:</span>,
            <span key="2">• <strong><span className="guide-highlight">Alt + 1 / 2 / 3 / 4</span></strong>: Chuyển đổi tab nhanh (Chat, Flashcards, Quiz, Sơ đồ)</span>,
            <span key="3">• <strong><span className="guide-highlight">Space</span></strong>: Tạm dừng / Phát video bài giảng</span>,
            <span key="4">• <strong><span className="guide-highlight">Mũi tên Trái / Phải</span></strong>: Tua video tiến/lùi 5 giây</span>,
            <span key="5">• <strong><span className="guide-highlight">Shift + N</span></strong>: Lật thẻ ghi nhớ Flashcard</span>
          ]
        : [
            <span key="1" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Maximize study efficiency without reaching for your mouse:</span>,
            <span key="2">• <strong><span className="guide-highlight">Alt + 1 / 2 / 3 / 4</span></strong>: Toggle tabs quickly (Chat, Flashcards, Quiz, Mindmap)</span>,
            <span key="3">• <strong><span className="guide-highlight">Space</span></strong>: Play / Pause video playback</span>,
            <span key="4">• <strong><span className="guide-highlight">Left / Right Arrows</span></strong>: Seek backward/forward by 5 seconds</span>,
            <span key="5">• <strong><span className="guide-highlight">Shift + N</span></strong>: Flip current flashcard</span>
          ]
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="guide-modal-overlay">
      <div className="guide-modal-card glass animate-fade-in">
        <button className="guide-close-btn" onClick={onClose} title={lang === 'vi' ? 'Đóng' : 'Close'}>
          <X size={18} />
        </button>

        <div className="guide-header">
          <HelpCircle size={20} className="guide-header-icon" />
          <h2>{lang === 'vi' ? 'Hướng dẫn Học tập Cực nhanh' : 'Quick Study Guide'}</h2>
        </div>

        <div className="guide-slide-container">
          <div className="guide-slide-icon">
            {slides[currentSlide].icon}
          </div>
          <h3 className="guide-slide-title">{slides[currentSlide].title}</h3>
          
          <div className="guide-slide-content">
            {slides[currentSlide].content.map((item, idx) => (
              <div key={idx} className="guide-text-line">{item}</div>
            ))}
          </div>
        </div>

        <div className="guide-progress-bar">
          {slides.map((_, idx) => (
            <span 
              key={idx} 
              className={`guide-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
            />
          ))}
        </div>

        <div className="guide-footer">
          <button 
            className="btn-secondary guide-nav-btn" 
            onClick={handlePrev}
            disabled={currentSlide === 0}
          >
            <ChevronLeft size={16} />
            <span>{lang === 'vi' ? 'Trước' : 'Prev'}</span>
          </button>

          <button className="btn-primary guide-nav-btn" onClick={handleNext}>
            <span>{currentSlide === slides.length - 1 ? (lang === 'vi' ? 'Bắt đầu' : 'Start') : (lang === 'vi' ? 'Tiếp' : 'Next')}</span>
            {currentSlide < slides.length - 1 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
