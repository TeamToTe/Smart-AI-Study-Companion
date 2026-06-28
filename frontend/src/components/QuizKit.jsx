import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './QuizKit.css';

export default function QuizKit({ segments, t, videoUrl }) {
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
        const cacheKey = `studymind_cache_quiz_${videoUrl.toLowerCase()}`;
        const cachedQuizStr = localStorage.getItem(cacheKey);
        if (cachedQuizStr) {
          try {
            const cachedQuiz = JSON.parse(cachedQuizStr);
            if (cachedQuiz && cachedQuiz.length > 0) {
              setQuestions(cachedQuiz);
              setSelectedAnswers(new Array(cachedQuiz.length).fill(null));
              setSubmittedStates(new Array(cachedQuiz.length).fill(false));
              setLoading(false);
              setError(null);
              return; // Skip fetching from API
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

        const queryPrompt = 
          "Hãy tạo ra đúng 3 câu hỏi trắc nghiệm kiểm tra kiến thức của bài học này dưới dạng JSON. " +
          "Câu hỏi, các lựa chọn và phần giải thích phải viết bằng tiếng Việt, các thuật ngữ kỹ thuật tiếng Anh gốc giữ nguyên. " +
          "Trả về DUY NHẤT một mảng JSON hợp lệ chứa các đối tượng có cấu trúc chính xác như sau: " +
          "[{\"question\": \"nội dung câu hỏi\", \"options\": [\"lựa chọn A\", \"lựa chọn B\", \"lựa chọn C\", \"lựa chọn D\"], \"correct\": 0, \"explanation\": \"giải thích chi tiết lý do lựa chọn này là đúng\"}]. " +
          "Chú ý: correct phải là một số nguyên (từ 0 đến 3) đại diện cho chỉ mục của đáp án đúng. " +
          "Không bao gồm bất kỳ lời dẫn nào, không bọc trong khối code block markdown, chỉ trả về chuỗi JSON thô.";

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: queryPrompt,
            segments: segments.map(s => ({ start: s.start, end: s.end, text: s.text })),
            history: []
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

        const parsedQuizzes = JSON.parse(cleanedJson);
        if (Array.isArray(parsedQuizzes) && parsedQuizzes.length > 0) {
          setQuestions(parsedQuizzes);
          setSelectedAnswers(new Array(parsedQuizzes.length).fill(null));
          setSubmittedStates(new Array(parsedQuizzes.length).fill(false));
          // Save to cache
          if (videoUrl) {
            const cacheKey = `studymind_cache_quiz_${videoUrl.toLowerCase()}`;
            localStorage.setItem(cacheKey, JSON.stringify(parsedQuizzes));
          }
        } else {
          throw new Error('Invalid quiz format received.');
        }
      } catch (err) {
        console.warn("Failed to generate dynamic quiz, falling back to local quiz database:", err);
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
        generatedQuizzes = [
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
        generatedQuizzes = [
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
        generatedQuizzes = [
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
              "The model takes too long to train",
              "The model weights will freeze",
              "The optimization may overshoot the minimum and diverge",
              "The gradient values will automatically become zero"
            ],
            correct: 2,
            explanation: "A high learning rate causes parameter updates to step too far, potentially jumping across the minimum valleys and failing to converge."
          }
        ];
      } else {
        // Default quizzes
        generatedQuizzes = [
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
  }, [segments, session, videoUrl]);

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
        <button className="restart-btn btn-primary" onClick={handleRestart}>
          <RotateCcw size={16} />
          <span>{t('tryAgain')}</span>
        </button>
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
