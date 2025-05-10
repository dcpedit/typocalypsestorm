import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import '../styles/Results.css';

const labels = ['1st', '2nd', '3rd', '4th', '5th'];
const DEFAULT_NAME = 'AAA';

function getHighScores(difficulty) {
  const key = `typing-scores-${difficulty}`;
  const storedScores = localStorage.getItem(key);
  return storedScores ? JSON.parse(storedScores) : [];
}

function saveHighScore(difficulty, score, wpm, accuracy, maxEntries = 5) {
  const key = `typing-scores-${difficulty}`;
  const prevScores = getHighScores(difficulty);
  const newScoreEntry = {
    id: Date.now(),
    score,
    wpm,
    accuracy,
    name: DEFAULT_NAME
  };
  const updatedScores = [...prevScores, newScoreEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries);
  localStorage.setItem(key, JSON.stringify(updatedScores));
  const currentEntry = updatedScores.find(entry =>
    entry.score === score && entry.wpm === wpm && entry.accuracy === accuracy
  );
  if (currentEntry) {
    currentEntry.isCurrent = true;
  }
  return updatedScores;
}

function updateHighScore(id, name) {
  const prefix = 'typing-scores-';
  // Iterate through localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const scores = JSON.parse(stored);
      const index = scores.findIndex(entry => entry.id === id);
      if (index !== -1) {
        // Update the name and save back
        scores[index].name = name;
        localStorage.setItem(key, JSON.stringify(scores));
        return scores;
      }
    }
  }
  return null;
}

export default function Results({ wpm, difficulty, accuracy, show, onDismiss, hasUncorrectedErrors, score }) {
  const containerRef = useRef();
  const wpmValueRef = useRef();
  const wpmAnimationDoneRef = useRef(false);
  const accuracyValueRef = useRef();
  const [highScores, setHighScores] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const leaderboardRef = useRef();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [editingScoreIndex, setEditingScoreIndex] = useState(-1);
  const [nameInput, setNameInput] = useState(['A', 'A', 'A']); 
  const [cursorPosition, setCursorPosition] = useState(-1);

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
      fetch('http://127.0.0.1:5001/typocalypsestorm/us-central1/addGameScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: DEFAULT_NAME,
          difficulty: difficulty.toLowerCase(),
          score: Math.round(score),
          wpm: Math.round(wpm),
          accuracy: Math.floor(accuracy)
        })
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to save score');
          return res.json();
        })
        .then(data => {
          console.log('Score saved:', data);
          // If the response contains topScores, update the high scores
          if (data.topScores && Array.isArray(data.topScores)) {
            setHighScores(data.topScores);
          }
        })
        .catch(err => console.error('Error saving score:', err));
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
      if (!wpmAnimationDoneRef.current) return;
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleDismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onDismiss]);

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

    function handleKeyPress(e) {
      // Check if cursor is active
      if (cursorPosition === -1) return;
      
      // Allow only alphabet characters
      if (/^[a-zA-Z]$/.test(e.key)) {
        // Create a new copy of the name input array
        const newNameInput = [...nameInput];
        // Update the character at the cursor position with uppercase version
        newNameInput[cursorPosition] = e.key.toUpperCase();
        setNameInput(newNameInput);
        
        // Move cursor to next position or finish editing if at the last position
        if (cursorPosition < 2) {
          setCursorPosition(cursorPosition + 1);
        } else {
          // Keep the name editable but hide the cursor after third character
          setCursorPosition(-1);
        }
      }
    }
    
    function handleKeyDown(e) {
      // Handle backspace
      if (e.key === 'Backspace') {
        // Only handle backspace if we're editing (either with cursor or after completion)
        if (cursorPosition === -1) {
          // If cursor is hidden (after completing entry), move it back to the last character
          setCursorPosition(2);
        } else if (cursorPosition > 0) {
          // Move cursor to previous character
          setCursorPosition(cursorPosition - 1);
        }
      }
      
      // Handle Enter key to submit the name
      if (e.key === 'Enter') {
        // Only process if we've entered at least one character
        if (editingScoreIndex !== -1) {
          // Update the name in the high scores
          const updatedScores = [...highScores];
          updatedScores[editingScoreIndex].name = nameInput.join('');
          setHighScores(updatedScores);
          console.log(updatedScores,editingScoreIndex);
          
          // Send updated name to server - always use the current nameInput
          updateNameOnServer(updatedScores[editingScoreIndex].id, nameInput.join(''));
          
          // Finish editing
          setCursorPosition(-1);
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cursorPosition, nameInput, editingScoreIndex, highScores]);

  // Function to update the name on the server
  const updateNameOnServer = (id, name) => {
    if (isOnline) {
      fetch('http://127.0.0.1:5001/typocalypsestorm/us-central1/updateGameScoreName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          newName: name
        })
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to update name');
          return res.json();
        })
        .then(data => {
          console.log('Name updated:', data);
        })
        .catch(err => console.error('Error updating name:', err));
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
            <h3>High Scores ({difficulty})</h3>
            {highScores.length > 0 ? (
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