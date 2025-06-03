import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import '../styles/Results.css';
import { postGameScore, updateGameScoreName, saveHighScore, updateHighScore, DEFAULT_NAME } from '../utils/gameUtils';
import { fetchAndDecodeAudioBuffer, playAudioBuffer } from '../utils/effectsUtils';

const labels = ['1st', '2nd', '3rd', '4th', '5th'];

export default function Results({ wpm, difficulty, accuracy, show, onDismiss, hasUncorrectedErrors, score, audioContextRef, soundEnabled }) {
  const containerRef = useRef();
  const wpmValueRef = useRef();
  const wpmAnimationDoneRef = useRef(false);
  const accuracyValueRef = useRef();
  const [highScores, setHighScores] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const leaderboardRef = useRef();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [editingScoreIndex, setEditingScoreIndex] = useState(-1);
  const [nameInput, setNameInput] = useState(['A', 'A', 'A']); 
  const [cursorPosition, setCursorPosition] = useState(-1);
  const correctBufferRef = useRef(null);
  const incorrectBufferRef = useRef(null);

  // Track online status
  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Track when results are shown
  useEffect(() => {
    if (show && typeof score === 'number' && score > 0) {
      // Send Google Analytics event when results are displayed
      if (window.gtag) {
        window.gtag('event', 'results_displayed', {
          'difficulty': difficulty,
          'wpm': wpm,
          'accuracy': accuracy,
          'score': score
        });
      }
    }
  }, [show, wpm, difficulty, accuracy, score]);

  // Add effect to send score to server when results are shown and online
  useEffect(() => {
    if (!show) return;

    const updatedScores = saveHighScore(difficulty, score, wpm, accuracy);

    if (isOnline) {
      setLoadingScores(true);
      postGameScore({
        name: DEFAULT_NAME,
        difficulty,
        score,
        wpm,
        accuracy
      })
        .then(data => {
          // If the response contains topScores, update the high scores
          if (data.topScores && Array.isArray(data.topScores)) {
            // score.isCurrent is set on the server-side
            setHighScores(data.topScores);
          }
          setLoadingScores(false);
        })
        .catch(err => {
          console.error('Error saving score:', err);
          setHighScores(updatedScores);
          setLoadingScores(false);
        });
    }
    else {
      setHighScores(updatedScores);
    }
  }, [show, score, wpm, accuracy, difficulty, isOnline]);

  useEffect(() => {
    const DURATION = 1.5;
    if (show && containerRef.current) {
      wpmAnimationDoneRef.current = false;
      setShowLeaderboard(false);
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
          duration: DURATION,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onComplete: () => {
            wpmAnimationDoneRef.current = true;
            setShowLeaderboard(true);
          },
        }
      );
      // Animate the accuracy percentage counting up
      if (accuracyValueRef.current) {
        gsap.fromTo(
          accuracyValueRef.current,
          { textContent: '0%' },
          {
            textContent: Math.floor(accuracy).toString() + '%',
            duration: DURATION,
            ease: 'power1.out',
            snap: { textContent: 1 },
          }
        );
      }
    }
  }, [show, wpm, accuracy]);

  useEffect(() => {
    if (showLeaderboard && leaderboardRef.current) {
      gsap.fromTo(
        leaderboardRef.current,
        { y: 30, opacity: 0, height: 0, overflow: 'hidden' },
        { y: 0, opacity: 1, height: 'auto', duration: 0.7, ease: 'power2.out', onComplete: () => {
          // Remove overflow hidden after animation completes to ensure content is visible
          if (leaderboardRef.current) {
            leaderboardRef.current.style.overflow = 'visible';
          }
        }}
      );
    }
  }, [showLeaderboard]);

  // Handle dismiss and send analytics event
  const handleDismiss = () => {
    if (!wpmAnimationDoneRef.current) return;
    
    // Send Google Analytics event when results are dismissed
    if (window.gtag) {
      window.gtag('event', 'results_dismissed', {
        'difficulty': difficulty,
        'wpm': wpm,
        'score': score
      });
    }
    
    if (onDismiss) onDismiss();
  };

  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e) {
      // If currently editing a score name, prevent dismiss on Enter
      if (editingScoreIndex !== -1 && e.key === 'Enter') {
        return;
      }

      if (!wpmAnimationDoneRef.current) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleDismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onDismiss, editingScoreIndex]);

  // Handle name editing functionality
  useEffect(() => {
    if (!show || !showLeaderboard) return;
    
    // Find the current user score in the highScores array
    const currentScoreIndex = highScores.findIndex(score => score.isCurrent === true);
    if (currentScoreIndex >= 0) {
      setEditingScoreIndex(currentScoreIndex);
      setCursorPosition(0); // Start with cursor on first character
      // Initialize name from the current score or use DEFAULT_NAME as default
      const currentName = highScores[currentScoreIndex].name || DEFAULT_NAME;
      setNameInput(Array.from(currentName.slice(0, 3).padEnd(3, 'A').toUpperCase()));
    }
  }, [highScores, show, showLeaderboard]);

  // Handle key presses for name editing
  useEffect(() => {
    if (editingScoreIndex === -1) return;

    function handleKeyDown(e) {
      // Don't process any keys when not showing results
      if (!show) return;
      // Handle alphabetic character input
      if (/^[a-zA-Z]$/.test(e.key) && cursorPosition !== -1) {
        // Play correct sound using AudioBuffer
        if (soundEnabled) {
          playAudioBuffer(audioContextRef.current, correctBufferRef.current);
        }
        const newNameInput = [...nameInput];
        newNameInput[cursorPosition] = e.key.toUpperCase();
        setNameInput(newNameInput);

        if (cursorPosition < 2) {
          setCursorPosition(cursorPosition + 1);
        } else {
          setCursorPosition(-1);
        }
        return; // Prevent further handling for this key
      }

      // Handle backspace
      if (e.key === 'Backspace') {
        if (cursorPosition === -1) {
          // Play incorrect sound using AudioBuffer
          if (soundEnabled) {
            playAudioBuffer(audioContextRef.current, incorrectBufferRef.current);
          }
          setCursorPosition(2);
        } else if (cursorPosition > 0) {
          // Play incorrect sound using AudioBuffer
          if (soundEnabled) {
            playAudioBuffer(audioContextRef.current, incorrectBufferRef.current);
          }
          setCursorPosition(cursorPosition - 1);
        }
      }

      // Handle Enter key to submit the name
      if (e.key === 'Enter') {
        if (editingScoreIndex !== -1) {
          const updatedScores = [...highScores];
          updatedScores[editingScoreIndex].name = nameInput.join('');
          setHighScores(updatedScores);
          updateNameOnServer(updatedScores[editingScoreIndex].id, nameInput.join(''));
          setCursorPosition(-1);
          handleDismiss();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cursorPosition, nameInput, editingScoreIndex, highScores, show, soundEnabled]);

  // Function to update the name on the server
  const updateNameOnServer = (id, name) => {
    if (isOnline) {
      updateGameScoreName({ id, newName: name })
        .catch(err => {
          console.error('Error updating name:', err);
          updateHighScore(id, name);
        });
    }
    else {
      updateHighScore(id, name);
    }
  }

  // Render an editable name with cursor
  const renderEditableName = (name, isUserScore) => {
    // Disable editing if not the user's score
    if (!isUserScore) {
      const display = Array.from((name || DEFAULT_NAME).slice(0, 3).padEnd(3, 'A').toUpperCase());
      return <span className="high-score-name">{display.join('')}</span>;
    }
    
    return (
      <span className="high-score-name editable-name">
        {nameInput.map((letter, i) => (
          <span 
            key={i} 
            className={`name-letter ${cursorPosition === -1 || i < cursorPosition ? 'active' : 'inactive'}`}
          >
            {i === cursorPosition && <span className="name-cursor"></span>}
            {letter}
          </span>
        ))}
      </span>
    );
  };

  // Preload correct.mp3 and incorrect.mp3 buffer on mount, using shared audioContextRef
  useEffect(() => {
    if (!show || !audioContextRef?.current) {
      return;
    }

    Promise.all([
      fetchAndDecodeAudioBuffer('/sound/correct.mp3', audioContextRef.current),
      fetchAndDecodeAudioBuffer('/sound/incorrect.mp3', audioContextRef.current)
    ])
      .then(([correctBuffer, incorrectBuffer]) => {
        correctBufferRef.current = correctBuffer;
        incorrectBufferRef.current = incorrectBuffer;
      })
      .catch(err => console.error('Error loading audio:', err));
  }, [show, audioContextRef]);

  return (
    <div
      className={`results-overlay${show ? '' : ' hidden'}`}
      style={{ pointerEvents: show ? 'auto' : 'none', opacity: show ? 1 : 0 }}
    >
      <div className="results-container" ref={containerRef}>
        <h2>Typing Results</h2>
        {/* Score prominently displayed */}
        <div className="score-prominent">
          {typeof score === 'number' ? Math.floor(score) : score}
        </div>
        <div className="wpm-display">
          <div className="stats-row">
            <div className="stat-column">
              <span className="stat-value" ref={wpmValueRef}>{wpm}</span>
              <span className="stat-label">WPM</span>
            </div>
            {typeof accuracy === 'number' && (
              <div className="stat-column">
                <span className="stat-value" ref={accuracyValueRef}>{Math.floor(accuracy)}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
            )}
          </div>
        </div>
        {hasUncorrectedErrors && (
          <div className="uncorrected-warning">
            Uncorrected mistakes reduce your score. <strong>Use backspace to fix errors!</strong>
          </div>
        )}
        {/* High Scores Leaderboard - hidden until WPM animation is done */}
        {showLeaderboard && (
          <div className="high-scores" ref={leaderboardRef}>
            <h3>Today's High Scores ({difficulty})</h3>
            {loadingScores ? (
              <ul>
                {Array(5).fill(0).map((_, index) => (
                  <li key={index} className="skeleton-score-row">&nbsp;</li>
                ))}
              </ul>
            ) : highScores.length > 0 ? (
              <ul>
                {highScores.map((scoreEntry, index) => {
                  // Use the isCurrent property to determine if this is the user's score
                  const isUserScore = scoreEntry.isCurrent === true;
                  
                  return (
                    <li
                      key={index}
                      className={isUserScore ? 'user-score' : undefined}
                    >
                      <span className="high-score-rank">{labels[index]}</span>
                      {renderEditableName(scoreEntry.name, isUserScore)}
                      <span className="high-score-points">{Math.floor(scoreEntry.score)}</span>
                      <span className="high-score-stats">{scoreEntry.wpm} WPM | {Math.floor(scoreEntry.accuracy)}%</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No high scores yet</p>
            )}
            <div className="results-footer">
              <p>Press <kbd>Enter</kbd> to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
