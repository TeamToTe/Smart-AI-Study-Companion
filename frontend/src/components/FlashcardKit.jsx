import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, HelpCircle, Award } from 'lucide-react';
import './FlashcardKit.css';

export default function FlashcardKit({ segments, t }) {
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Generate flashcards based on video content
  useEffect(() => {
    if (!segments || segments.length === 0) return;
    
    const text = segments.map(s => s.text).join(' ').toLowerCase();
    let generatedCards = [];

    if (text.includes("list") || text.includes("node") || text.includes("pointer")) {
      generatedCards = [
        {
          front: "What is a Linked List?",
          back: "A linear data structure where elements (nodes) are stored non-contiguously. Each node points to the next node using a pointer."
        },
        {
          front: "What does a Node in a Linked List consist of?",
          back: "It consists of two parts: 1) Data (holds the value) and 2) Next Pointer (holds the address of the next node)."
        },
        {
          front: "What is the time complexity to insert a node at the head of a Linked List?",
          back: "O(1) - Constant time, because it only requires changing the pointer of the new node to point to the current head, and updating the head pointer."
        },
        {
          front: "What is the time complexity to search for a value in a singly Linked List?",
          back: "O(n) - Linear time, because you may need to traverse the entire list from head to tail to locate the value."
        }
      ];
    } else if (text.includes("fastapi") || text.includes("framework") || text.includes("endpoint")) {
      generatedCards = [
        {
          front: "What is FastAPI?",
          back: "A modern, high-performance web framework for building APIs with Python, based on standard Python type hints."
        },
        {
          front: "What library does FastAPI use for data validation?",
          back: "Pydantic. It enforces type hints at runtime and generates helpful, structured error messages for invalid requests."
        },
        {
          front: "Why does FastAPI offer high performance?",
          back: "It is built on Starlette (for web parts) and Uvicorn (ASGI server), and supports asynchronous programming natively using async/await."
        },
        {
          front: "What endpoint decorator creates a new resource in REST?",
          back: "@app.post() - Maps to the HTTP POST method which is used to submit data and create resources."
        }
      ];
    } else if (text.includes("gradient") || text.includes("loss") || text.includes("network") || text.includes("neural")) {
      generatedCards = [
        {
          front: "What is Gradient Descent?",
          back: "An optimization algorithm used to minimize a model's loss function by iteratively moving parameters in the direction of the steepest decrease."
        },
        {
          front: "What is a Loss Function?",
          back: "A mathematical function that evaluates how well a machine learning algorithm models the given dataset by measuring predictions against targets."
        },
        {
          front: "What is a Learning Rate?",
          back: "A hyperparameter in gradient descent that controls the step size taken towards the minimum of the loss function during optimization."
        },
        {
          front: "What is Backpropagation?",
          back: "An algorithm used in training neural networks where gradients of the loss function with respect to weights are calculated using the chain rule, propagating errors backward."
        }
      ];
    } else {
      // Default general flashcards
      generatedCards = [
        {
          front: "What is the primary benefit of Active Learning?",
          back: "It increases comprehension and memory retention by engaging learners in the material through tasks like quizzes and flashcards rather than passive watching."
        },
        {
          front: "How does 'Academic Entity Protection' help learners?",
          back: "It prevents translation engines from corrupting technical terms (e.g. keeping 'Linked List' instead of translating it literally) to maintain learning context."
        },
        {
          front: "What is a RAG pipeline?",
          back: "Retrieval-Augmented Generation: It retrieves relevant facts from a local dataset (like transcripts) to guide an LLM to generate precise, grounded answers."
        }
      ];
    }

    setCards(generatedCards);
    setCurrentIdx(0);
    setFlipped(false);
  }, [segments]);

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

  if (cards.length === 0) {
    return <div className="flashcards-empty">Generating Flashcards...</div>;
  }

  const currentCard = cards[currentIdx];

  return (
    <div className="flashcards-panel animate-fade-in">
      <div className="flashcard-container">
        <div 
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped(!flipped)}
        >
          <div className="card-face card-front glass">
            <div className="card-type">
              <HelpCircle size={14} />
              <span>QUESTION</span>
            </div>
            <p className="card-text">{currentCard.front}</p>
            <div className="card-hint">
              <RotateCw size={12} />
              <span>Click to Reveal Answer</span>
            </div>
          </div>
          
          <div className="card-face card-back glass">
            <div className="card-type success">
              <Award size={14} />
              <span>EXPLANATION</span>
            </div>
            <p className="card-text">{currentCard.back}</p>
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
