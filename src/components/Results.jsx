import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import '../styles/Results.css';

const labels = ['1st', '2nd', '3rd', '4th', '5th'];

export default function Results({ wpm, highScores, difficulty, accuracy, show, onDismiss }) {
  const containerRef = useRef();
  const wpmValueRef = useRef();
  const wpmAnimationDoneRef = useRef(false);

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

  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e) {
      if (!wpmAnimationDoneRef.current) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        if (onDismiss) onDismiss();
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
        </div>
        <div className="high-scores">
          <h3>High Scores ({difficulty})</h3>
          {highScores.length > 0 ? (
            <ul>
              {highScores.map((score, index) => (
                <li key={index}>{labels[index]}: {score} WPM</li>
              ))}
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