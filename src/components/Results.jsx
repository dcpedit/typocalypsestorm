import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import '../styles/Results.css';

const labels = ['1st', '2nd', '3rd', '4th', '5th'];

export default function Results({ wpm, difficulty, accuracy, show, onDismiss, hasUncorrectedErrors }) {
  const containerRef = useRef();
  const wpmValueRef = useRef();
  const wpmAnimationDoneRef = useRef(false);
  const [highScores, setHighScores] = useState([]);

  // Load high scores from localStorage when difficulty changes or on mount
  useEffect(() => {
    const key = `typing-high-scores-${difficulty}`;
    const storedScores = localStorage.getItem(key);
    if (storedScores) {
      setHighScores(JSON.parse(storedScores));
    } else {
      setHighScores([]);
    }
  }, [difficulty]);

  // Save high score when a new WPM is shown
  useEffect(() => {
    if (!show || typeof wpm !== 'number' || wpm <= 0) return;
    const key = `typing-high-scores-${difficulty}`;
    setHighScores(prevScores => {
      const updatedScores = [...prevScores, wpm]
        .sort((a, b) => b - a)
        .slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updatedScores));
      return updatedScores;
    });
    // eslint-disable-next-line
  }, [show, wpm, difficulty]);

  // Track when results are shown
  useEffect(() => {
    if (show && typeof wpm === 'number' && wpm > 0) {
      // Send Google Analytics event when results are displayed
      if (window.gtag) {
        window.gtag('event', 'results_displayed', {
          'difficulty': difficulty,
          'wpm': wpm,
          'accuracy': accuracy
        });
      }
    }
  }, [show, wpm, difficulty, accuracy]);

  useEffect(() => {
    if (show && containerRef.current) {
      wpmAnimationDoneRef.current = false;
      // Animate the results container
      gsap.fromTo(
        containerRef.current,
        { y: -50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
      // Animate the WPM number counting up
      gsap.fromTo(
        wpmValueRef.current,
        { textContent: '0' },
        {
          textContent: wpm.toString(),
          duration: 1.5,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onComplete: () => { wpmAnimationDoneRef.current = true; },
        }
      );
    }
  }, [show, wpm]);

  // Handle dismiss and send analytics event
  const handleDismiss = () => {
    if (!wpmAnimationDoneRef.current) return;
    
    // Send Google Analytics event when results are dismissed
    if (window.gtag) {
      window.gtag('event', 'results_dismissed', {
        'difficulty': difficulty,
        'wpm': wpm
      });
    }
    
    if (onDismiss) onDismiss();
  };

  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e) {
      if (!wpmAnimationDoneRef.current) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleDismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onDismiss]);

  return (
    <div
      className={`results-overlay${show ? '' : ' hidden'}`}
      style={{ pointerEvents: show ? 'auto' : 'none', opacity: show ? 1 : 0 }}
    >
      <div className="results-container" ref={containerRef}>
        <h2>Typing Results</h2>
        <div className="wpm-display">
          <span className="wpm-value" ref={wpmValueRef}>{wpm}</span>
          <span className="wpm-label">WPM</span>
          {typeof accuracy === 'number' && (
            <div className="accuracy-text">
              Accuracy: {Math.floor(accuracy)}%
            </div>
          )}
          {hasUncorrectedErrors && (
            <div className="uncorrected-warning">
              Uncorrected mistakes reduce your WPM. <strong>Use backspace to fix errors!</strong>
            </div>
          )}
        </div>
        <div className="high-scores">
          <h3>High Scores ({difficulty})</h3>
          {highScores.length > 0 ? (
            <ul>
              {highScores.map((score, index) => {
                // Highlight if this score matches the user's WPM and is the first such occurrence
                let isUserScore = false;
                if (wpm === score) {
                  // Only highlight the first occurrence of the user's score
                  if (
                    highScores.findIndex(s => s === wpm) === index
                  ) {
                    isUserScore = true;
                  }
                }
                return (
                  <li
                    key={index}
                    className={isUserScore ? 'user-score' : undefined}
                  >
                    {labels[index]}: {score} WPM
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No high scores yet</p>
          )}
        </div>
        <div className="results-footer">
          <p>Press <kbd>Enter</kbd> or <kbd>Esc</kbd> to continue</p>
        </div>
      </div>
    </div>
  );
} 