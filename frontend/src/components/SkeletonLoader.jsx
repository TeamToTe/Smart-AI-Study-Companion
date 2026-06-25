import React, { useState, useEffect } from 'react';
import { Loader2, Terminal, CheckCircle2, ChevronRight, Trophy, HelpCircle, ArrowRight, Check, X } from 'lucide-react';
import './SkeletonLoader.css';

const TRIVIA_QUESTIONS = {
  vi: [
    {
      question: "Kiến trúc mạng nơ-ron nào là nền tảng cho các mô hình ngôn ngữ lớn (LLM) hiện nay như GPT, Gemini?",
      options: ["CNN (Mạng nơ-ron tích chập)", "RNN (Mạng nơ-ron hồi quy)", "Transformer", "LSTM"],
      answer: 2,
      explanation: "Kiến trúc Transformer (được Google công bố năm 2017) với cơ chế Tự chú ý (Self-Attention) là nền tảng cho hầu hết các mô hình LLM ngày nay."
    },
    {
      question: "Độ phức tạp thời gian (Time Complexity) trung bình của việc tìm kiếm phần tử trong Bảng băm (Hash Table) là bao nhiêu?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 0,
      explanation: "Với hàm băm tốt và ít xung đột, việc tìm kiếm trong Bảng băm đạt độ phức tạp O(1) (thời gian hằng số)."
    },
    {
      question: "Ai là người được lịch sử công nhận là nhà lập trình máy tính đầu tiên trên thế giới?",
      options: ["Alan Turing", "Ada Lovelace", "Grace Hopper", "Charles Babbage"],
      answer: 1,
      explanation: "Ada Lovelace viết thuật toán đầu tiên để tính số Bernoulli trên máy phân tích của Charles Babbage vào thế kỷ 19."
    },
    {
      question: "Cấu trúc dữ liệu nào hoạt động theo nguyên tắc LIFO (Last In, First Out - Vào sau, ra trước)?",
      options: ["Hàng đợi (Queue)", "Ngăn xếp (Stack)", "Cây nhị phân (Binary Tree)", "Đồ thị (Graph)"],
      answer: 1,
      explanation: "Ngăn xếp (Stack) giống như chồng đĩa, đĩa nào đặt vào cuối cùng (Last In) sẽ được lấy ra đầu tiên (First Out)."
    },
    {
      question: "Trong Python, từ khóa nào được dùng để khai báo một hàm bất đồng bộ (coroutine)?",
      options: ["def async", "async def", "await def", "async function"],
      answer: 1,
      explanation: "Cú pháp 'async def' được giới thiệu trong Python 3.5 để định nghĩa một coroutine hoạt động bất đồng bộ."
    },
    {
      question: "Lịch sử ghi nhận con 'Bug' (lỗi máy tính) đầu tiên thực chất là gì?",
      options: ["Một con kiến", "Một con bướm đêm thật", "Một lỗi chia cho 0", "Một bóng bán dẫn bị chảy"],
      answer: 1,
      explanation: "Năm 1947, bà Grace Hopper tìm thấy một con bướm đêm thật (moth) bị kẹt trong rơ-le số 70 của máy tính Harvard Mark II và dán nó vào nhật ký."
    },
    {
      question: "Giao thức mạng nào được sử dụng để truyền tải dữ liệu trang web bảo mật (có mã hóa)?",
      options: ["HTTP", "FTP", "HTTPS", "SMTP"],
      answer: 2,
      explanation: "HTTPS (Hypertext Transfer Protocol Secure) sử dụng mã hóa TLS/SSL để bảo mật dữ liệu truyền giữa trình duyệt và máy chủ."
    }
  ],
  en: [
    {
      question: "Which neural network architecture is the foundation for modern LLMs like GPT and Gemini?",
      options: ["CNN", "RNN", "Transformer", "LSTM"],
      answer: 2,
      explanation: "The Transformer architecture (introduced by Google in 2017) with its Self-Attention mechanism is the foundation of modern LLMs."
    },
    {
      question: "What is the average time complexity of looking up an item in a Hash Table?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      answer: 0,
      explanation: "In average case with a good hash function, Hash Table search takes O(1) (constant time)."
    },
    {
      question: "Who is widely recognized as the world's first computer programmer?",
      options: ["Alan Turing", "Ada Lovelace", "Grace Hopper", "Charles Babbage"],
      answer: 1,
      explanation: "Ada Lovelace wrote the first algorithm intended to be carried out by Charles Babbage's Analytical Engine in the 19th century."
    },
    {
      question: "Which data structure operates on a LIFO (Last In, First Out) basis?",
      options: ["Queue", "Stack", "Binary Tree", "Graph"],
      answer: 1,
      explanation: "A Stack operates like a pile of plates, where the last item placed on top (Last In) is the first to be removed (First Out)."
    },
    {
      question: "In Python, which keyword combination is used to declare an asynchronous function (coroutine)?",
      options: ["def async", "async def", "await def", "async function"],
      answer: 1,
      explanation: "The syntax 'async def' is used in Python 3.5+ to declare asynchronous coroutines."
    },
    {
      question: "What was the first actual computer 'bug' recorded in history?",
      options: ["An ant", "A real moth", "A division-by-zero error", "A melted transistor"],
      answer: 1,
      explanation: "In 1947, Grace Hopper found a real moth trapped in Relay #70 of the Harvard Mark II computer and taped it to her logbook."
    },
    {
      question: "Which network protocol is used to secure data transfer on websites?",
      options: ["HTTP", "FTP", "HTTPS", "SMTP"],
      answer: 2,
      explanation: "HTTPS (Hypertext Transfer Protocol Secure) uses TLS/SSL encryption to secure communications between browser and server."
    }
  ]
};

export default function SkeletonLoader({ t, isProcessed, onLaunch, lang = 'vi' }) {
  const [activeStep, setActiveStep] = useState(0);

  // Trivia states
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  const steps = [
    t('loaderStep1'),
    t('loaderStep2'),
    t('loaderStep3'),
    t('loaderStep4'),
    t('loaderStep5'),
    t('loaderStep6')
  ];

  const questions = TRIVIA_QUESTIONS[lang] || TRIVIA_QUESTIONS['vi'];
  const currentQuestion = questions[questionIdx];

  // Auto-progress steps while loading (only if not processed yet)
  useEffect(() => {
    if (isProcessed) {
      setActiveStep(steps.length - 1);
      return;
    }

    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, [steps.length, isProcessed]);

  // If processed, instantly complete steps
  useEffect(() => {
    if (isProcessed) {
      setActiveStep(steps.length - 1);
    }
  }, [isProcessed, steps.length]);

  const handleOptionClick = (optionIdx) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
    setIsAnswered(true);
    setTotalAnswered(prev => prev + 1);
    if (optionIdx === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setQuestionIdx((prev) => (prev + 1) % questions.length);
  };

  return (
    <div className="loader-container animate-fade-in">
      <div className="loader-card glass">
        
        {/* Status Header */}
        <div className="loader-header">
          {isProcessed ? (
            <div className="loader-status success-ready animate-pulse-glow">
              <CheckCircle2 className="success-icon" size={24} />
              <h2>{lang === 'vi' ? 'Bài học đã sẵn sàng!' : 'Lesson is ready!'}</h2>
            </div>
          ) : (
            <div className="loader-status">
              <Loader2 className="spinner" size={24} />
              <h2>{t('analyzingVideo')}</h2>
            </div>
          )}
          <span className="loader-percentage">
            {isProcessed ? '100%' : `${Math.min(Math.round(((activeStep + 1) / steps.length) * 100), 100)}%`}
          </span>
        </div>

        {/* Global Progress Bar */}
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: isProcessed ? '100%' : `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Launch Button when Processed */}
        {isProcessed && (
          <div className="launch-wrapper animate-pop-in">
            <button className="launch-btn pulse-glow-btn" onClick={onLaunch}>
              {lang === 'vi' ? '🚀 VÀO HỌC NGAY' : '🚀 START STUDYING NOW'}
              <ArrowRight size={18} />
            </button>
            <p className="launch-subtext">
              {lang === 'vi' 
                ? 'Bạn có thể tiếp tục chơi trắc nghiệm hoặc nhấn nút phía trên để bắt đầu học ngay.'
                : 'You can continue playing trivia or click the button above to start studying immediately.'}
            </p>
          </div>
        )}

        {/* Terminal Pipeline Log Panel */}
        <div className="terminal-panel">
          <div className="terminal-header">
            <Terminal size={14} className="terminal-icon" />
            <span>study-companion-pipeline.log</span>
            <div className="terminal-dots">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
          </div>
          <div className="terminal-body">
            {steps.map((step, idx) => {
              if (!isProcessed && idx > activeStep) return null;
              const isCompleted = isProcessed || idx < activeStep;
              return (
                <div key={idx} className={`terminal-line ${isCompleted ? 'completed' : 'active'}`}>
                  {isCompleted ? (
                    <CheckCircle2 size={14} className="line-icon success" />
                  ) : (
                    <ChevronRight size={14} className="line-icon active-caret" />
                  )}
                  <span className="line-text">{step}</span>
                  {!isCompleted && <span className="caret">|</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* CS Trivia Quiz Panel (Replacing static skeletons with high-value UX) */}
        <div className="trivia-panel glass">
          <div className="trivia-header">
            <div className="trivia-title">
              <HelpCircle size={18} className="trivia-icon-glow" />
              <span>{lang === 'vi' ? '🧠 Thử thách Trắc nghiệm Công nghệ' : '🧠 Computer Science Trivia'}</span>
            </div>
            <div className="trivia-score">
              <Trophy size={14} />
              <span>{lang === 'vi' ? `Đúng: ${score}/${totalAnswered}` : `Score: ${score}/${totalAnswered}`}</span>
            </div>
          </div>

          <div className="trivia-body">
            <h4 className="trivia-question">{currentQuestion.question}</h4>
            
            <div className="trivia-options-grid">
              {currentQuestion.options.map((option, idx) => {
                let optionClass = '';
                let icon = null;

                if (isAnswered) {
                  if (idx === currentQuestion.answer) {
                    optionClass = 'correct';
                    icon = <Check size={14} className="option-state-icon" />;
                  } else if (idx === selectedOption) {
                    optionClass = 'incorrect';
                    icon = <X size={14} className="option-state-icon" />;
                  } else {
                    optionClass = 'disabled';
                  }
                }

                return (
                  <button 
                    key={idx} 
                    className={`trivia-option-btn ${optionClass}`}
                    onClick={() => handleOptionClick(idx)}
                    disabled={isAnswered}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    <span className="option-text">{option}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div className="trivia-feedback animate-fade-in">
                <div className="feedback-explanation">
                  <strong>{lang === 'vi' ? '💡 Giải thích: ' : '💡 Explanation: '}</strong>
                  {currentQuestion.explanation}
                </div>
                <button className="trivia-next-btn btn-secondary" onClick={handleNextQuestion}>
                  <span>{lang === 'vi' ? 'Câu tiếp theo' : 'Next Question'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
