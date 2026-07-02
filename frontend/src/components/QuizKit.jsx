import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './QuizKit.css';

const containsExceptionInfo = (q) => {
  if (!q || typeof q !== 'object') return true;
  const question = String(q.question || '').toLowerCase();
  const explanation = String(q.explanation || '').toLowerCase();
  const optionsStr = Array.isArray(q.options) ? q.options.join(' ').toLowerCase() : '';
  
  const errorKeywords = [
    "api keys and models failed",
    "failed. last error:",
    "failed to fetch",
    "error calling gemini",
    "error calling groq",
    "api key is not configured",
    "keys and models failed"
  ];
  
  return errorKeywords.some(keyword => 
    question.includes(keyword) || 
    explanation.includes(keyword) || 
    optionsStr.includes(keyword)
  );
};

const isValidQuizArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(q => {
    if (!q || typeof q !== 'object') return false;
    if (!q.question || !Array.isArray(q.options) || q.options.length === 0 || q.correct === undefined || !q.explanation) return false;
    return !containsExceptionInfo(q);
  });
};

export default function QuizKit({ segments, t, videoUrl, lang = 'vi' }) {
  const { session } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [submittedStates, setSubmittedStates] = useState([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate quiz questions based on video context
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    const fetchQuiz = async () => {
      // Check cache first
      if (videoUrl) {
        const cacheKey = `studymind_cache_quiz_${lang}_${videoUrl.toLowerCase()}`;
        const cachedQuizStr = localStorage.getItem(cacheKey);
        if (cachedQuizStr) {
          try {
            const cachedQuiz = JSON.parse(cachedQuizStr);
            if (isValidQuizArray(cachedQuiz)) {
              setQuestions(cachedQuiz);
              setSelectedAnswers(new Array(cachedQuiz.length).fill(null));
              setSubmittedStates(new Array(cachedQuiz.length).fill(false));
              setLoading(false);
              setError(null);
              return; // Skip fetching from API
            } else {
              localStorage.removeItem(cacheKey);
            }
          } catch (e) {
            console.error("Failed to parse cached quiz:", e);
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

        // Estimate video length in minutes
        const durationSeconds = segments.length > 0 ? segments[segments.length - 1].end : 0;
        const durationMinutes = durationSeconds / 60;
        const numQuestions = Math.max(3, Math.min(8, Math.floor(3 + durationMinutes / 4)));

        const queryPrompt = lang === 'vi'
          ? `Hãy tạo ra đúng ${numQuestions} câu hỏi trắc nghiệm kiểm tra kiến thức của bài học này dưới dạng JSON. ` +
            "Câu hỏi, các lựa chọn và phần giải thích phải viết bằng tiếng Việt, các thuật ngữ kỹ thuật tiếng Anh gốc giữ nguyên. " +
            "Trả về DUY NHẤT một mảng JSON hợp lệ chứa các đối tượng có cấu trúc chính xác như sau: " +
            "[{\"question\": \"nội dung câu hỏi\", \"options\": [\"lựa chọn A\", \"lựa chọn B\", \"lựa chọn C\", \"lựa chọn D\"], \"correct\": 0, \"explanation\": \"giải thích chi tiết lý do lựa chọn này là đúng\"}]. " +
            "Chú ý: correct phải là một số nguyên (từ 0 đến 3) đại diện cho chỉ mục của đáp án đúng. " +
            "Không bao gồm bất kỳ lời dẫn nào, không bọc trong khối code block markdown, chỉ trả về chuỗi JSON thô."
          : `Create exactly ${numQuestions} multiple-choice questions to test the knowledge of this lesson in JSON format. ` +
            "The questions, options, and explanations must be written in English. " +
            "Return ONLY a valid JSON array containing objects with the exact structure: " +
            "[{\"question\": \"question content\", \"options\": [\"option A\", \"option B\", \"option C\", \"option D\"], \"correct\": 0, \"explanation\": \"detailed explanation of why this option is correct\"}]. " +
            "Note: correct must be an integer (from 0 to 3) representing the index of the correct option. " +
            "Do not include any intro/outro text, do not wrap in markdown code blocks, return only raw JSON string.";

        const response = await fetch('/api/chat/raw', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: queryPrompt,
            segments: segments.map(s => ({ start: s.start, end: s.end, text: s.text }))
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quiz from backend.');
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

        const parsedQuiz = JSON.parse(cleanedJson);
        if (isValidQuizArray(parsedQuiz)) {
          setQuestions(parsedQuiz);
          setSelectedAnswers(new Array(parsedQuiz.length).fill(null));
          setSubmittedStates(new Array(parsedQuiz.length).fill(false));
          // Save to cache
          if (videoUrl) {
            const cacheKey = `studymind_cache_quiz_${lang}_${videoUrl.toLowerCase()}`;
            localStorage.setItem(cacheKey, JSON.stringify(parsedQuiz));
          }
        } else {
          throw new Error('Invalid quiz format received.');
        }
      } catch (err) {
        console.warn("Failed to generate dynamic quiz, falling back to offline quiz database:", err);
        setError(err.message || 'Failed to generate quiz.');
        fallbackOfflineQuiz();
      } finally {
        setLoading(false);
      }
    };

    const fallbackOfflineQuiz = () => {
      const text = segments.map(s => s.text).join(' ').toLowerCase();
      let generatedQuizzes = [];

      if (text.includes("list") || text.includes("node") || text.includes("pointer")) {
        generatedQuizzes = lang === 'vi' ? [
          {
            question: "Điều nào sau đây là đúng về Linked List (Danh sách liên kết) so với Array (Mảng)?",
            options: [
              "Linked List có thời gian truy cập ngẫu nhiên là O(1)",
              "Các phần tử Linked List được lưu trữ liên tục trong bộ nhớ",
              "Linked List có thể dễ dàng co giãn kích thước động",
              "Linked List luôn tiêu tốn ít bộ nhớ hơn Array"
            ],
            correct: 2,
            explanation: "Linked List có thể dễ dàng chèn/xóa các phần tử và thay đổi kích thước động mà không tốn chi phí tái cấp phát bộ nhớ như Array."
          },
          {
            question: "Độ phức tạp thời gian để chèn một phần tử mới vào đầu một singly Linked List là bao nhiêu?",
            options: [
              "O(1)",
              "O(log n)",
              "O(n)",
              "O(n log n)"
            ],
            correct: 0,
            explanation: "Chèn ở đầu danh sách chỉ yêu cầu tạo nút mới, trỏ con trỏ của nó vào đầu hiện tại và cập nhật con trỏ đầu. Việc này tốn thời gian hằng số O(1)."
          },
          {
            question: "Nếu một nút trong singly Linked List bị xóa, thành phần nào phải được cập nhật?",
            options: [
              "Trường dữ liệu của nút bị xóa",
              "Con trỏ next của nút đứng trước nó",
              "Chỉ cập nhật con trỏ tail",
              "Không có con trỏ nào cần cập nhật"
            ],
            correct: 1,
            explanation: "Để bỏ qua nút bị xóa, con trỏ next của nút đứng trước nó phải được cập nhật để trỏ trực tiếp đến nút tiếp theo của nút bị xóa."
          }
        ] : [
          {
            question: "Which of the following is true about Linked Lists compared to Arrays?",
            options: [
              "Linked Lists have O(1) random access time",
              "Linked Lists elements are stored contiguously in memory",
              "Linked Lists can grow and shrink dynamically in size easily",
              "Linked Lists always consume less memory than arrays"
            ],
            correct: 2,
            explanation: "Linked lists can easily insert/delete items and resize dynamically without reallocation costs, unlike arrays which require contiguous chunks of memory."
          },
          {
            question: "What is the time complexity to insert a new element at the beginning of a singly linked list?",
            options: [
              "O(1)",
              "O(log n)",
              "O(n)",
              "O(n log n)"
            ],
            correct: 0,
            explanation: "Inserting at the head requires creating a node, pointing its next pointer to the current head, and updating the head pointer. This takes constant O(1) time."
          },
          {
            question: "If a node in a singly linked list is deleted, what must be updated?",
            options: [
              "The data field of the deleted node",
              "The next pointer of the preceding node",
              "The tail pointer only",
              "No pointers need to be updated"
            ],
            correct: 1,
            explanation: "To bypass the deleted node, the preceding node's next pointer must be updated to point to the deleted node's next node."
          }
        ];
      } else if (text.includes("fastapi") || text.includes("framework") || text.includes("endpoint")) {
        generatedQuizzes = lang === 'vi' ? [
          {
            question: "Thư viện nào được FastAPI sử dụng để phân tích và kiểm định dữ liệu?",
            options: [
              "Flask",
              "Pydantic",
              "SQLAlchemy",
              "Django"
            ],
            correct: 1,
            explanation: "FastAPI phụ thuộc vào các mô hình Pydantic để kiểm định yêu cầu đầu vào, tuần tự hóa phản hồi đầu ra và tự động tạo tài liệu trong OpenAPI."
          },
          {
            question: "FastAPI đạt được hiệu năng bất đồng bộ bằng cách nào?",
            options: [
              "Bằng cách sử dụng đa luồng (multi-threading) cho các tác vụ CPU",
              "Bằng cách biên dịch Python thành mã C",
              "Bằng cách tận dụng Starlette và máy chủ ASGI Uvicorn",
              "Bằng cách tắt hỗ trợ HTTP/2"
            ],
            correct: 2,
            explanation: "FastAPI được xây dựng trên Starlette (bộ công cụ ASGI gọn nhẹ) và chạy trên Uvicorn, cho phép nó xử lý hiệu quả các yêu cầu bất đồng bộ đồng thời."
          },
          {
            question: "Phương thức HTTP nào nên được dùng để tạo một tài nguyên mới trên endpoint FastAPI?",
            options: [
              "GET",
              "POST",
              "PUT",
              "DELETE"
            ],
            correct: 1,
            explanation: "Theo các nguyên tắc RESTful, phương thức POST được sử dụng để gửi dữ liệu thực thể nhằm tạo ra các tài nguyên mới trên máy chủ."
          }
        ] : [
          {
            question: "Which library is used by FastAPI for data parsing and validation?",
            options: [
              "Flask",
              "Pydantic",
              "SQLAlchemy",
              "Django"
            ],
            correct: 1,
            explanation: "FastAPI relies on Pydantic models to validate incoming requests, serialize outgoing responses, and automatically document them in OpenAPI."
          },
          {
            question: "How does FastAPI achieve asynchronous performance?",
            options: [
              "By using multi-threading on CPU tasks",
              "By compiling Python into C code",
              "By leveraging Starlette and ASGI server Uvicorn",
              "By disabling HTTP/2 support"
            ],
            correct: 2,
            explanation: "FastAPI is built on top of Starlette (a lightweight ASGI toolkit) and is run on Uvicorn, which allows it to handle concurrent async requests efficiently."
          },
          {
            question: "Which HTTP method should be used to create a new resource on a FastAPI endpoint?",
            options: [
              "GET",
              "POST",
              "PUT",
              "DELETE"
            ],
            correct: 1,
            explanation: "Following REST principles, the POST method is used to submit entity data to create new resources on the server."
          }
        ];
      } else if (text.includes("gradient") || text.includes("loss") || text.includes("network") || text.includes("neural")) {
        generatedQuizzes = lang === 'vi' ? [
          {
            question: "Vai trò chính của Hàm mất mát (Loss Function) trong việc huấn luyện mô hình máy học là gì?",
            options: [
              "Tăng tốc độ của các epoch huấn luyện",
              "Đo lường sai số giữa dự đoán của mô hình và nhãn thực tế",
              "Khởi tạo ngẫu nhiên ma trận trọng số",
              "Chuẩn hóa các biến mục tiêu"
            ],
            correct: 1,
            explanation: "Hàm mất mát tính toán một giá trị vô hướng đại diện cho sai số dự đoán của mô hình. Bộ tối ưu hóa sẽ làm việc để giảm thiểu giá trị này."
          },
          {
            question: "Siêu tham số nào quyết định kích thước bước đi trong thuật toán Gradient Descent?",
            options: [
              "Batch size",
              "Tỷ lệ học (Learning rate)",
              "Number of layers",
              "Dropout rate"
            ],
            correct: 1,
            explanation: "Tỷ lệ học đóng vai trò là hệ số nhân trên gradient vector, kiểm soát độ lớn của bước cập nhật trọng số về phía điểm cực tiểu."
          },
          {
            question: "Điều gì xảy ra nếu tỷ lệ học (learning rate) trong Gradient Descent quá lớn?",
            options: [
              "Mô hình mất quá nhiều thời gian để huấn luyện",
              "Trọng số của mô hình bị đóng băng",
              "Quá trình tối ưu hóa có thể vượt quá điểm cực tiểu và phân kỳ",
              "Các gradient tự động trở về 0"
            ],
            correct: 2,
            explanation: "Tỷ lệ học quá cao làm cho cập nhật tham số đi quá xa, có thể nhảy qua thung lũng cực tiểu và làm mô hình không thể hội tụ."
          }
        ] : [
          {
            question: "What is the primary role of a Loss Function in training machine learning models?",
            options: [
              "To speed up training epochs",
              "To measure the error between predictions and ground truths",
              "To initialize weight matrices randomly",
              "To normalize target variables"
            ],
            correct: 1,
            explanation: "A Loss Function calculates a scalar value representing the model's prediction error. The optimizer works to minimize this value."
          },
          {
            question: "Which hyperparameter determines the size of steps taken in Gradient Descent?",
            options: [
              "Batch size",
              "Learning rate",
              "Number of layers",
              "Dropout rate"
            ],
            correct: 1,
            explanation: "The learning rate acts as a multiplier on the gradient vector, controlling how large of a step is taken towards the minimum point."
          },
          {
            question: "What happens if the learning rate in Gradient Descent is too large?",
            options: [
              "To speed up training epochs",
              "The model weights will freeze",
              "The optimization may overshoot the minimum and diverge",
              "The gradient values will automatically become zero"
            ],
            correct: 2,
            explanation: "A high learning rate causes parameter updates to step too far, potentially jumping across the minimum valleys and failing to converge."
          }
        ];
      } else {
        generatedQuizzes = lang === 'vi' ? [
          {
            question: "Mục đích chính của bộ lọc 'Bảo vệ Thuật ngữ Chuyên ngành' là gì?",
            options: [
              "Ngăn chặn truy cập vào các trang web trái phép",
              "Ngăn chặn việc dịch nghĩa thô các thuật ngữ kỹ thuật cốt lõi",
              "Mã hóa đường dẫn truyền phát video",
              "Kiểm tra hồ sơ định danh của học sinh"
            ],
            correct: 1,
            explanation: "Việc dịch trực tiếp các thuật ngữ như 'Linked List' thành 'Danh sách liên kết' có thể làm mất đi ngữ cảnh học thuật chuẩn. Bộ lọc này giữ nguyên các thuật ngữ bằng tiếng Anh."
          },
          {
            question: "Thanh bên Trợ lý AI (AI Tutor) truy xuất ngữ cảnh về video bằng cách nào?",
            options: [
              "Bằng cách tìm kiếm các bài học tương tự trên web",
              "Bằng cách tìm kiếm ngữ nghĩa (RAG) trên transcript của video",
              "Bằng cách phân tích lịch sử duyệt web của người dùng",
              "Bằng cách quét phần bình luận của video"
            ],
            correct: 1,
            explanation: "Chatbot truy vấn một Vector Database lưu trữ các phân đoạn transcript được chia nhỏ, giúp nó trích xuất chính xác các mốc thời gian khớp với câu hỏi của người dùng."
          }
        ] : [
          {
            question: "What is the main purpose of the 'Academic Entity Protection' filter?",
            options: [
              "To block access to unauthorized websites",
              "To prevent the literal translation of key technical terms",
              "To encrypt video streaming URLs",
              "To check students' identity profiles"
            ],
            correct: 1,
            explanation: "Literally translating terms like 'Linked List' into 'Danh sách liên kết' can break the academic context. The filter protects these terms in English."
          },
          {
            question: "How does the AI Tutor sidebar retrieve context about the video?",
            options: [
              "By searching the web for matching tutorials",
              "By performing semantic search (RAG) over the video transcript",
              "By analyzing the user's browser history",
              "By scanning the video comments section"
            ],
            correct: 1,
            explanation: "The chatbot queries a Vector Database storing chunked transcript segments, letting it extract precise timestamps matching the user's question."
          }
        ];
      }

      setQuestions(generatedQuizzes);
      setSelectedAnswers(new Array(generatedQuizzes.length).fill(null));
      setSubmittedStates(new Array(generatedQuizzes.length).fill(false));
    };

    fetchQuiz();
    setCurrentIdx(0);
    setScore(0);
    setShowResult(false);
  }, [segments, session, videoUrl, lang]);

  const handleSelectOption = (idx) => {
    if (submittedStates[currentIdx]) return;
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentIdx] = idx;
    setSelectedAnswers(nextAnswers);
  };

  const handleSubmit = () => {
    const selectedAns = selectedAnswers[currentIdx];
    if (selectedAns === null || submittedStates[currentIdx]) return;
    
    const nextSubmitted = [...submittedStates];
    nextSubmitted[currentIdx] = true;
    setSubmittedStates(nextSubmitted);
    
    if (selectedAns === questions[currentIdx].correct) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswers(new Array(questions.length).fill(null));
    setSubmittedStates(new Array(questions.length).fill(false));
    setScore(0);
    setShowResult(false);
  };

  if (loading) {
    return <div className="quiz-empty animate-pulse-glow">Generating AI Quiz...</div>;
  }

  if (questions.length === 0) {
    return <div className="quiz-empty">No quiz available.</div>;
  }

  if (showResult) {
    const scorePercent = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-result-panel animate-fade-in glass">
        <Award size={48} className="result-award-icon" />
        <h3>{t('quizCompleted')}</h3>
        <div className="result-score-circle">
          <span className="score-num">{score}</span>
          <span className="score-total">/ {questions.length}</span>
        </div>
        <p className="result-percent">{scorePercent}% Accuracy</p>
        <p className="result-feedback">
          {scorePercent >= 80 ? "Outstanding job! You've mastered this lecture content!" : 
           scorePercent >= 50 ? "Good work. Review the glossary to improve your score!" : 
           "Keep studying and review the video timestamps to clarify concepts."}
        </p>
        <button className="restart-btn btn-primary" onClick={handleRestart} style={{ marginBottom: '16px' }}>
          <RotateCcw size={16} />
          <span>{t('tryAgain')}</span>
        </button>

        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
            {lang === 'vi' ? 'Bạn đã làm xong bài kiểm tra! Hãy đóng góp ý kiến khảo sát cho dự án nhé:' : 'You have completed the quiz! Please share your feedback to help our project:'}
          </p>
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSccMyV6meG-NjsJYqjAls43GR9x6JmrZAAvHN-l8bc0Z0J1cA/viewform?usp=dialog" 
            target="_blank" 
            rel="noreferrer"
            className="text-gradient"
            style={{ fontWeight: 'bold', fontSize: '13px', textDecoration: 'none' }}
          >
            {t('feedbackSurvey')} &rarr;
          </a>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const selectedAns = selectedAnswers[currentIdx];
  const submitted = submittedStates[currentIdx];

  return (
    <div className="quiz-panel animate-fade-in">
      <div className="quiz-navigation">
        {questions.map((_, qIdx) => {
          let btnClass = 'quiz-nav-btn';
          if (currentIdx === qIdx) {
            btnClass += ' active';
          }
          if (submittedStates[qIdx]) {
            const isCorrect = selectedAnswers[qIdx] === questions[qIdx].correct;
            btnClass += isCorrect ? ' correct' : ' incorrect';
          } else if (selectedAnswers[qIdx] !== null) {
            btnClass += ' answered';
          }
          
          return (
            <button 
              key={qIdx} 
              className={btnClass}
              onClick={() => setCurrentIdx(qIdx)}
            >
              {qIdx + 1}
            </button>
          );
        })}
      </div>

      <div className="quiz-progress-header">
        <span>QUESTION {currentIdx + 1} OF {questions.length}</span>
        <div className="quiz-mini-bar">
          <div 
            className="quiz-mini-fill"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h3 className="quiz-question">{currentQ.question}</h3>

      <div className="quiz-options">
        {currentQ.options.map((opt, oIdx) => {
          let optionClass = '';
          if (submitted) {
            if (oIdx === currentQ.correct) {
              optionClass = 'correct';
            } else if (selectedAns === oIdx) {
              optionClass = 'incorrect';
            } else {
              optionClass = 'dimmed';
            }
          } else if (selectedAns === oIdx) {
            optionClass = 'selected';
          }

          return (
            <button
              key={oIdx}
              className={`quiz-option-btn ${optionClass}`}
              onClick={() => handleSelectOption(oIdx)}
              disabled={submitted}
            >
              <span className="option-indicator">{String.fromCharCode(65 + oIdx)}</span>
              <span className="option-text">{opt}</span>
              {submitted && oIdx === currentQ.correct && (
                <CheckCircle2 size={16} className="opt-status-icon correct" />
              )}
              {submitted && selectedAns === oIdx && oIdx !== currentQ.correct && (
                <XCircle size={16} className="opt-status-icon incorrect" />
              )}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div className="quiz-explanation-box glass">
          <p className="explanation-title">EXPLANATION</p>
          <p className="explanation-text">{currentQ.explanation}</p>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button
            className="btn-primary quiz-action-btn"
            onClick={handleSubmit}
            disabled={selectedAns === null}
          >
            Submit Answer
          </button>
        ) : (
          <button
            className="btn-primary quiz-action-btn success-btn"
            onClick={handleNext}
          >
            {currentIdx === questions.length - 1 ? 'Show Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
