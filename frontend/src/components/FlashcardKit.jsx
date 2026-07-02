import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, HelpCircle, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './FlashcardKit.css';

const normalizeLevel = (levelStr) => {
  if (!levelStr) return 'Remember';
  const norm = levelStr.toLowerCase().trim();
  if (norm.includes('remember') || norm.includes('nhớ') || norm.includes('ghi nhớ') || norm.includes('recall')) {
    return 'Remember';
  }
  if (norm.includes('understand') || norm.includes('hiểu') || norm.includes('thông hiểu') || norm.includes('comprehend')) {
    return 'Understand';
  }
  if (norm.includes('apply') || norm.includes('vận dụng') || norm.includes('thực hành')) {
    return 'Apply';
  }
  if (norm.includes('analyze') || norm.includes('phân tích') || norm.includes('suy luận')) {
    return 'Analyze';
  }
  return 'Remember';
};

export default function FlashcardKit({ segments, t, videoUrl, lang }) {
  const { session } = useAuth();
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate flashcards based on video content
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    const fetchCards = async () => {
      // Check cache first
      if (videoUrl) {
        const cacheKey = `studymind_cache_flashcard_${lang}_${videoUrl.toLowerCase()}`;
        const cachedCardsStr = localStorage.getItem(cacheKey);
        if (cachedCardsStr) {
          try {
            const cachedCards = JSON.parse(cachedCardsStr);
            if (cachedCards && cachedCards.length > 0) {
              const normalized = cachedCards.map(card => ({
                ...card,
                level: normalizeLevel(card.level)
              }));
              setCards(normalized);
              setLoading(false);
              setError(null);
              return; // Skip fetching from API
            }
          } catch (e) {
            console.error("Failed to parse cached flashcards:", e);
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
        const numCards = Math.max(5, Math.min(10, Math.floor(5 + durationMinutes / 3)));

        const queryPrompt = lang === 'vi'
          ? `Hãy tạo ra đúng ${numCards} thẻ flashcard học tập kiểm tra kiến thức của bài học này dưới dạng JSON. ` +
            "Thẻ flashcard có hai mặt: mặt trước (front) chứa câu hỏi hoặc thuật ngữ, mặt sau (back) chứa câu trả lời hoặc định nghĩa chi tiết. " +
            "Thêm một trường 'level' chỉ định cấp độ nhận thức của câu hỏi theo Thang đo Bloom. Chỉ nhận một trong các giá trị sau: 'Remember' (cho câu hỏi định nghĩa, ghi nhớ dữ kiện), 'Understand' (cho câu hỏi giải thích khái niệm), 'Apply' (cho câu hỏi vận dụng thực tế), hoặc 'Analyze' (cho câu hỏi phân tích, suy luận sâu). " +
            "Hãy đảm bảo phân bố tỷ lệ tương ứng cho các cấp độ câu hỏi này để tăng hiệu quả học tập. " +
            "Nội dung thẻ flashcard phải viết bằng tiếng Việt, các thuật ngữ kỹ thuật tiếng Anh gốc giữ nguyên. " +
            "Nếu có công thức toán học, biến số (như x, f(x), dx, x_0), hoặc phương trình, hãy bọc chúng trong dấu đô la đơn (ví dụ: $x$, $f(x)$) hoặc dấu đô la kép cho phương trình lớn. " +
            "Trả về DUY NHẤT một mảng JSON hợp lệ chứa các đối tượng có cấu trúc chính xác với các ví dụ phân bố cấp độ như sau: " +
            "[{\"front\": \"câu hỏi ghi nhớ khái niệm\", \"back\": \"câu trả lời\", \"level\": \"Remember\"}, {\"front\": \"câu hỏi yêu cầu giải thích\", \"back\": \"câu trả lời chi tiết\", \"level\": \"Understand\"}, {\"front\": \"câu hỏi tình huống áp dụng\", \"back\": \"câu trả lời vận dụng\", \"level\": \"Apply\"}, {\"front\": \"câu hỏi phân tích bản chất\", \"back\": \"câu trả lời phân tích sâu\", \"level\": \"Analyze\"}]. " +
            "Không bao gồm bất kỳ lời dẫn nào, không bọc trong khối code block markdown, chỉ trả về chuỗi JSON thô."
          : `Create exactly ${numCards} study flashcards testing the knowledge of this lesson in JSON format. ` +
            "A flashcard has two sides: the front contains a question or term, and the back contains the detailed answer or definition. " +
            "Include a 'level' field specifying the cognitive level of the card based on Bloom's Taxonomy. It must be exactly one of: 'Remember' (for recall/definitions), 'Understand' (for conceptual explanations), 'Apply' (for practical applications), or 'Analyze' (for deep reasoning/analysis). " +
            "Ensure a balanced distribution among these levels to maximize active learning. " +
            "If there are math formulas, variables (like x, f(x), dx, x_0), or equations, wrap them in single dollar signs (e.g. $x$, $f(x)$) or double dollar signs for equations. " +
            "All content must be written in English. " +
            "Return ONLY a valid JSON array containing objects matching this exact structure with diverse levels: " +
            "[{\"front\": \"recall question\", \"back\": \"recall answer\", \"level\": \"Remember\"}, {\"front\": \"explain concept\", \"back\": \"explanation\", \"level\": \"Understand\"}, {\"front\": \"apply concept\", \"back\": \"application answer\", \"level\": \"Apply\"}, {\"front\": \"analyze concept\", \"back\": \"deep analysis\", \"level\": \"Analyze\"}]. " +
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
          throw new Error('Failed to fetch flashcards from backend.');
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

        const parsedCards = JSON.parse(cleanedJson);
        if (Array.isArray(parsedCards) && parsedCards.length > 0) {
          const normalized = parsedCards.map(card => ({
            ...card,
            level: normalizeLevel(card.level)
          }));
          setCards(normalized);
          // Save to cache
          if (videoUrl) {
            const cacheKey = `studymind_cache_flashcard_${lang}_${videoUrl.toLowerCase()}`;
            localStorage.setItem(cacheKey, JSON.stringify(normalized));
          }
        } else {
          throw new Error('Invalid flashcard format received.');
        }
      } catch (err) {
        console.warn("Failed to generate dynamic flashcards, falling back to local flashcard database:", err);
        setError(err.message || 'Failed to generate flashcards.');
        fallbackOfflineFlashcards();
      } finally {
        setLoading(false);
      }
    };

    const fallbackOfflineFlashcards = () => {
      const text = segments.map(s => s.text).join(' ').toLowerCase();
      let generatedCards = [];

      if (text.includes("list") || text.includes("node") || text.includes("pointer")) {
        generatedCards = lang === 'vi' ? [
          {
            front: "Linked List (Danh sách liên kết) là gì?",
            back: "Một cấu trúc dữ liệu tuyến tính trong đó các phần tử (nút) được lưu trữ không liên tục. Mỗi nút trỏ đến nút tiếp theo bằng con trỏ.",
            level: "Remember"
          },
          {
            front: "Một Nút (Node) trong Linked List gồm những thành phần nào?",
            back: "Gồm hai phần: 1) Dữ liệu (chứa giá trị) và 2) Con trỏ tiếp theo (chứa địa chỉ của nút tiếp theo).",
            level: "Understand"
          },
          {
            front: "Độ phức tạp thời gian để chèn một nút ở đầu Linked List là bao nhiêu?",
            back: "$O(1)$ - Thời gian hằng số, vì chỉ cần đổi con trỏ của nút mới trỏ vào đầu hiện tại và cập nhật con trỏ đầu.",
            level: "Apply"
          },
          {
            front: "Độ phức tạp thời gian để tìm kiếm một giá trị trong singly Linked List là bao nhiêu?",
            back: "$O(n)$ - Thời gian tuyến tính, vì bạn có thể phải duyệt qua toàn bộ danh sách từ đầu đến cuối để tìm giá trị.",
            level: "Analyze"
          }
        ] : [
          {
            front: "What is a Linked List?",
            back: "A linear data structure where elements (nodes) are stored non-contiguously. Each node points to the next node using a pointer.",
            level: "Remember"
          },
          {
            front: "What does a Node in a Linked List consist of?",
            back: "It consists of two parts: 1) Data (holds the value) and 2) Next Pointer (holds the address of the next node).",
            level: "Understand"
          },
          {
            front: "What is the time complexity to insert a node at the head of a Linked List?",
            back: "$O(1)$ - Constant time, because it only requires changing the pointer of the new node to point to the current head, and updating the head pointer.",
            level: "Apply"
          },
          {
            front: "What is the time complexity to search for a value in a singly Linked List?",
            back: "$O(n)$ - Linear time, because you may need to traverse the entire list from head to tail to locate the value.",
            level: "Analyze"
          }
        ];
      } else if (text.includes("fastapi") || text.includes("framework") || text.includes("endpoint")) {
        generatedCards = lang === 'vi' ? [
          {
            front: "FastAPI là gì?",
            back: "Một web framework hiện đại, hiệu năng cao để xây dựng API với Python, dựa trên gợi ý kiểu (type hints) tiêu chuẩn.",
            level: "Remember"
          },
          {
            front: "FastAPI sử dụng thư viện nào để kiểm định dữ liệu?",
            back: "Pydantic. Nó thực thi kiểm định kiểu ở thời gian chạy và tạo ra thông báo lỗi cấu trúc chi tiết cho các yêu cầu không hợp lệ.",
            level: "Understand"
          },
          {
            front: "Tại sao FastAPI lại có hiệu năng cao?",
            back: "Nó được xây dựng trên Starlette (phần web) và Uvicorn (máy chủ ASGI), đồng thời hỗ trợ lập trình bất đồng bộ nguyên bản qua async/await.",
            level: "Analyze"
          },
          {
            front: "Decorator endpoint nào tạo ra tài nguyên mới trong REST?",
            back: "@app.post() - Ánh xạ tới phương thức HTTP POST được dùng để gửi dữ liệu và tạo tài nguyên.",
            level: "Apply"
          }
        ] : [
          {
            front: "What is FastAPI?",
            back: "A modern, high-performance web framework for building APIs with Python, based on standard Python type hints.",
            level: "Remember"
          },
          {
            front: "What library does FastAPI use for data validation?",
            back: "Pydantic. It enforces type hints at runtime and generates helpful, structured error messages for invalid requests.",
            level: "Understand"
          },
          {
            front: "Why does FastAPI offer high performance?",
            back: "It is built on Starlette (for web parts) and Uvicorn (ASGI server), and supports asynchronous programming natively using async/await.",
            level: "Analyze"
          },
          {
            front: "What endpoint decorator creates a new resource in REST?",
            back: "@app.post() - Maps to the HTTP POST method which is used to submit data and create resources.",
            level: "Apply"
          }
        ];
      } else if (text.includes("gradient") || text.includes("loss") || text.includes("network") || text.includes("neural")) {
        generatedCards = lang === 'vi' ? [
          {
            front: "Gradient Descent là gì?",
            back: "Một thuật toán tối ưu hóa dùng để giảm thiểu hàm mất mát của mô hình bằng cách cập nhật lặp lại các tham số theo hướng giảm mạnh nhất.",
            level: "Remember"
          },
          {
            front: "Hàm mất mát (Loss Function) là gì?",
            back: "Một hàm toán học đánh giá mức độ mô hình hóa tập dữ liệu của thuật toán máy học bằng cách đo lường các dự đoán so với mục tiêu thực tế.",
            level: "Understand"
          },
          {
            front: "Tỷ lệ học (Learning Rate) là gì?",
            back: "Một siêu tham số trong gradient descent điều khiển kích thước bước thực hiện để đi về phía cực tiểu của hàm mất mát trong quá trình tối ưu.",
            level: "Apply"
          },
          {
            front: "Lan truyền ngược (Backpropagation) là gì?",
            back: "Một thuật toán huấn luyện mạng neural tính toán đạo hàm của hàm mất mát đối với trọng số bằng quy tắc chuỗi (chain rule), lan truyền sai số ngược từ đầu ra về đầu vào.",
            level: "Analyze"
          }
        ] : [
          {
            front: "What is Gradient Descent?",
            back: "An optimization algorithm used to minimize a model's loss function by iteratively moving parameters in the direction of the steepest decrease.",
            level: "Remember"
          },
          {
            front: "What is a Loss Function?",
            back: "A mathematical function that evaluates how well a machine learning algorithm models the given dataset by measuring predictions against targets.",
            level: "Understand"
          },
          {
            front: "What is a Learning Rate?",
            back: "A hyperparameter in gradient descent that controls the step size taken towards the minimum of the loss function during optimization.",
            level: "Apply"
          },
          {
            front: "What is Backpropagation?",
            back: "An algorithm used in training neural networks where gradients of the loss function with respect to weights are calculated using the chain rule, propagating errors backward.",
            level: "Analyze"
          }
        ];
      } else {
        generatedCards = lang === 'vi' ? [
          {
            front: "Lợi ích chính của Học chủ động (Active Learning) là gì?",
            back: "Nó tăng cường hiểu biết và khả năng ghi nhớ bằng cách lôi cuốn người học tương tác với học liệu qua các hoạt động như trắc nghiệm và flashcards thay vì chỉ xem thụ động.",
            level: "Understand"
          },
          {
            front: "Tính năng 'Bảo vệ Thuật ngữ Chuyên ngành' giúp ích gì cho người học?",
            back: "Nó ngăn chặn các công cụ dịch thuật làm biến dạng thuật ngữ kỹ thuật (ví dụ: giữ nguyên 'Linked List' thay vì dịch thô thiển là 'Danh sách liên kết'), giúp giữ ngữ cảnh học tập.",
            level: "Apply"
          },
          {
            front: "Đường ống RAG (RAG Pipeline) là gì?",
            back: "Retrieval-Augmented Generation: Nó truy xuất các thông tin liên quan từ một cơ sở dữ liệu cục bộ (như transcript) để hướng dẫn LLM tạo câu trả lời chính xác, đáng tin cậy.",
            level: "Analyze"
          }
        ] : [
          {
            front: "What is the primary benefit of Active Learning?",
            back: "It increases comprehension and memory retention by engaging learners in the material through tasks like quizzes and flashcards rather than passive watching.",
            level: "Understand"
          },
          {
            front: "How does 'Academic Entity Protection' help learners?",
            back: "It prevents translation engines from corrupting technical terms (e.g. keeping 'Linked List' instead of translating it literally) to maintain learning context.",
            level: "Apply"
          },
          {
            front: "What is a RAG pipeline?",
            back: "Retrieval-Augmented Generation: It retrieves relevant facts from a local dataset (like transcripts) to guide an LLM to generate precise, grounded answers.",
            level: "Analyze"
          }
        ];
      }

      setCards(generatedCards);
    };

    fetchCards();
    setCurrentIdx(0);
    setFlipped(false);
  }, [segments, session, videoUrl, lang]);

  // Listen to keyboard shortcut flip event
  useEffect(() => {
    const handleFlipEvent = () => {
      setFlipped(f => !f);
    };
    window.addEventListener('studymind-flip-card', handleFlipEvent);
    return () => {
      window.removeEventListener('studymind-flip-card', handleFlipEvent);
    };
  }, []);

  const handleNext = () => {
    if (currentIdx < cards.length - 1) {
      setFlipped(false);
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setFlipped(false);
      setTimeout(() => {
        setCurrentIdx(prev => prev - 0 - 1);
      }, 150);
    }
  };

  if (loading) {
    return <div className="flashcards-empty animate-pulse-glow">Generating AI Flashcards...</div>;
  }

  if (cards.length === 0) {
    return <div className="flashcards-empty">No flashcards available.</div>;
  }

  const currentCard = cards[currentIdx];

  const getLevelLabel = (level) => {
    const map = {
      Remember: lang === 'vi' ? 'Ghi nhớ' : 'Remember',
      Understand: lang === 'vi' ? 'Thông hiểu' : 'Understand',
      Apply: lang === 'vi' ? 'Vận dụng' : 'Apply',
      Analyze: lang === 'vi' ? 'Phân tích' : 'Analyze'
    };
    return map[level] || (lang === 'vi' ? 'Khái niệm' : 'Concept');
  };

  const renderCardText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      const lineKey = `card-line-${i}`;

      if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) {
        return (
          <div key={lineKey} className="card-math-block">
            {trimmedLine.slice(2, -2)}
          </div>
        );
      }

      const regex = /(\*\*.*?\*\*|`.*?`|\$[^\s$]+?\$)/g;
      const parts = line.split(regex);
      
      const elements = parts.map((part, index) => {
        const key = `${lineKey}-${index}`;
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={key} className="card-inline-code">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return <span key={key} className="card-math-inline">{part.slice(1, -1)}</span>;
        }
        return part;
      });

      return (
        <span key={lineKey} style={{ display: 'block', marginBottom: '8px' }}>
          {elements}
        </span>
      );
    });
  };

  return (
    <div className="flashcards-panel animate-fade-in">
      <div className="flashcard-container">
        <div 
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped(!flipped)}
        >
          <div className="card-face card-front glass">
            <div className="card-type">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={14} />
                <span>QUESTION</span>
              </div>
              {currentCard.level && (
                <span className={`taxonomy-badge ${currentCard.level.toLowerCase()}`}>
                  {getLevelLabel(currentCard.level)}
                </span>
              )}
            </div>
            <div className="card-text">{renderCardText(currentCard.front)}</div>
            <div className="card-hint">
              <RotateCw size={12} />
              <span>Click to Reveal Answer</span>
            </div>
          </div>
          
          <div className="card-face card-back glass">
            <div className="card-type success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={14} />
                <span>EXPLANATION</span>
              </div>
              {currentCard.level && (
                <span className={`taxonomy-badge ${currentCard.level.toLowerCase()}`}>
                  {getLevelLabel(currentCard.level)}
                </span>
              )}
            </div>
            <div className="card-text">{renderCardText(currentCard.back)}</div>
            <div className="card-hint">
              <RotateCw size={12} />
              <span>Click to View Question</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button 
          className="btn-secondary ctrl-btn" 
          onClick={handlePrev}
          disabled={currentIdx === 0}
        >
          <ArrowLeft size={16} />
          <span>{t('prev')}</span>
        </button>
        <span className="flashcard-progress">
          {currentIdx + 1} / {cards.length}
        </span>
        <button 
          className="btn-secondary ctrl-btn" 
          onClick={handleNext}
          disabled={currentIdx === cards.length - 1}
        >
          <span>{t('next')}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
