import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';
import samplesHard from '../data/samples_hard.json';
import samplesEasy from '../data/samples_easy.json';
import '../styles/TypingGame.css';
import { 
  explodeParticles, 
  strikeLightning, 
  explodeSparks, 
  cinderTrail, 
  shakeScreen, 
  fetchAndDecodeAudioBuffer, 
  playAudioBuffer 
} from '../utils/effectsUtils';
import Results from './Results';

// Convert whitespace characters to visible symbols
function whitespaceToChar(char) {
  switch(char) {
    case ' ': return '␣'; // Space
    case '\t': return '→'; // Tab
    case '\n': return '⏎'; // Newline
    default: return char;
  }
}

function getRelativePosition(element) {
  if (!element) return { top: 0, left: 0 };
  return {
    top: element.offsetTop || 0,
    left: element.offsetLeft || 0
  };
}

// Helper to get a random sample text based on difficulty
function getRandomSampleText(difficulty) {
  const source = difficulty === 'Easy' ? samplesEasy : samplesHard;
  if (Array.isArray(source) && source.length > 0) {
    const random = source[Math.floor(Math.random() * source.length)];
    return random.text;
  }
  return '';
}

export default function TypingGame({ soundEnabled, difficulty, reloadKey }) {
  const [sampleText, setSampleText] = useState("");
  const [typedChars, setTypedChars] = useState([]); // {char, correct}
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const [showResults, setShowResults] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [highScores, setHighScores] = useState([]);
  const [gameScreenHidden, setGameScreenHidden] = useState(false);
  const typingTimeoutRef = useRef(null);
  const containerRef = useRef();
  const pixiContainerRef = useRef();
  const pixiAppRef = useRef();
  const screenRef = useRef();
  const dotTextureRef = useRef();
  const audioBufferRef = useRef(null);
  const backspaceBufferRef = useRef(null);
  const errorBufferRef = useRef(null);
  const boltBufferRef = useRef(null);
  const audioContextRef = useRef(null);
  const prevCursorYRef = useRef(0);
  const resultsRef = useRef(null);
  const resultsVisible = useRef(false);
  const totalErrorsRef = useRef(0); // Track total errors including corrected ones
  const letterRefs = useRef([]); // Array of refs for each letter

  useEffect(() => {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true
    });
    pixiContainerRef.current.appendChild(app.view);
    pixiAppRef.current = app;

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  // Effect to handle header animation based on typing activity
  useEffect(() => {
    const header = document.querySelector('.header');
    if (!header) return;

    if (isTyping) {
      // Hide header when typing starts
      gsap.to(header, {
        y: -100,
        duration: 0.5,
        ease: 'power2.out'
      });
    } else {
      // Show header when typing stops
      gsap.to(header, {
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  }, [isTyping]);

  // Function to handle typing activity tracking
  const handleTypingActivity = () => {
    const PAUSE_THRESHOLD = 2000;
    // User is typing
    setIsTyping(true);
    
    // Start timer if not already started - moved to keydown handler
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a new timeout to detect pause in typing
    typingTimeoutRef.current = setTimeout(() => {
      // If displaying results, keep nav hidden as if still typing
      if (!resultsVisible.current) {
        setIsTyping(false);
      }
    }, PAUSE_THRESHOLD); // pause to consider typing stopped
  };

  // Load high scores from localStorage
  useEffect(() => {
    const key = `typing-high-scores-${difficulty}`;
    const storedScores = localStorage.getItem(key);
    if (storedScores) {
      setHighScores(JSON.parse(storedScores));
    } else {
      setHighScores([]);
    }
  }, [difficulty]);

  // Save high score to localStorage
  const saveHighScore = (newWpm) => {
    const key = `typing-high-scores-${difficulty}`;
    const updatedScores = [...highScores, newWpm]
      .sort((a, b) => b - a) // Sort in descending order
      .slice(0, 5); // Keep only top 5 scores
    
    localStorage.setItem(key, JSON.stringify(updatedScores));
    setHighScores(updatedScores);
  };

  // Reset game for a new round
  const resetGame = () => {
    // Animate game screen in, then reset state
    setShowResults(false); // triggers useEffect above
    resultsVisible.current = false;
    setSampleText(getRandomSampleText(difficulty));
    setTypedChars([]);
    startTimeRef.current = null;
    endTimeRef.current = null;
    setIsTyping(false);
    totalErrorsRef.current = 0; // Reset the total errors count
    letterRefs.current = []; // Reset letter refs
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Preload dot.png texture
    const texture = PIXI.Texture.from("/images/particle.png");
    if (texture.baseTexture.valid) {
      dotTextureRef.current = texture;
    } else {
      texture.baseTexture.on('loaded', () => {
        dotTextureRef.current = texture;
      });
    }
  }, []);

  useEffect(() => {
    // Initialize AudioContext and load the sound buffer
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    async function loadAudio() {
      try {
        const [type, backspace, error, bolt] = await Promise.all([
          fetchAndDecodeAudioBuffer('/sound/laser-major.wav', audioContext),
          fetchAndDecodeAudioBuffer('/sound/laser-absorb.wav', audioContext),
          fetchAndDecodeAudioBuffer('/sound/error.wav', audioContext),
          fetchAndDecodeAudioBuffer('/sound/zap.mp3', audioContext),
        ]);
        audioBufferRef.current = type;
        backspaceBufferRef.current = backspace;
        errorBufferRef.current = error;
        boltBufferRef.current = bolt;
      } catch (err) {
        // Optionally handle error
        console.error('Error loading audio:', err);
      }
    }
    loadAudio();

    return () => {
      audioContext.close();
    };
  }, []);

  // Set a random sample on mount and when difficulty or reloadKey changes
  useEffect(() => {
    setSampleText(getRandomSampleText(difficulty));
  }, [difficulty, reloadKey]);

  // Reset typedChars when sampleText changes
  useEffect(() => {
    setTypedChars([]);
    startTimeRef.current = null;
    endTimeRef.current = null;
    setShowResults(false);
    resultsVisible.current = false;
    totalErrorsRef.current = 0; // Reset the total errors count
    letterRefs.current = []; // Reset letter refs
  }, [sampleText]);

  // Handle keyboard events for typing and results dismissal
  useEffect(() => {
    function handleKeyDown(e) {
      if (showResults) {
        // Don't process any keys when showing results
        return;
      }
      
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!sampleText) return;
      
      // Track typing activity for header animation
      handleTypingActivity();
      
      // Handle backspace
      if (e.key === 'Backspace') {
        if (typedChars.length > 0) {
          // Get the position of the last character for the cinder effect
          const lastCharIndex = typedChars.length - 1;
          const lastCharSpan = letterRefs.current[lastCharIndex];
          if (lastCharSpan) {
            const rect = lastCharSpan.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            cinderTrail(pixiAppRef.current, dotTextureRef.current, x, y);
          }
          setTypedChars(typedChars.slice(0, -1));
          if (soundEnabled) playAudioBuffer(audioContextRef.current, backspaceBufferRef.current);
        }
        return;
      }
      // Only process printable characters
      if (e.key.length !== 1) return;
      
      // Start timer on first keypress if not already started
      if (!startTimeRef.current) {
        startTimeRef.current = new Date();
      }
      
      const nextIndex = typedChars.length;
      const expectedChar = sampleText[nextIndex];
      if (nextIndex >= sampleText.length) return;
      const isCorrect = e.key === expectedChar;
      
      // Track errors
      if (!isCorrect) {
        totalErrorsRef.current++;
      }
      
      // Add the new character
      const newTypedChars = [...typedChars, { char: e.key, correct: isCorrect }];
      setTypedChars(newTypedChars);
      
      // Check if we've completed the sample
      if (newTypedChars.length === sampleText.length) {
        resultsVisible.current = true;
        const now = new Date();
        endTimeRef.current = now;
        
        // Calculate WPM and show results after state is updated
        const currentTypedChars = [...newTypedChars];
        const currentStartTime = startTimeRef.current;
        const correctChars = currentTypedChars.filter(char => char.correct).length;
        const uncorrectedErrors = currentTypedChars.filter(char => !char.correct).length;
        const totalErrors = totalErrorsRef.current; // Use the total errors including corrected ones
        const timeInMinutes = (now - currentStartTime) / 1000 / 60;
          
        // Avoid division by zero or negative values
        if (correctChars <= 0 || timeInMinutes <= 0) {
          setWpm(0);
          setAccuracy(null);
        } else {
          // Calculate accuracy based on all errors, not just uncorrected ones
          const totalKeystrokes = sampleText.length + (totalErrors - uncorrectedErrors);
          const accuracy = Math.max(0, ((totalKeystrokes - totalErrors) / totalKeystrokes) * 100);
          const calculatedWpm = Math.round((correctChars / 5) / timeInMinutes);
          
          setWpm(calculatedWpm);
          setAccuracy(accuracy);
          saveHighScore(calculatedWpm);
        }
        setShowResults(true);
      }
      
      // Find the span for the character being typed
      const span = letterRefs.current[nextIndex];
      if (span) {
        const rect = span.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height;
        const yMid = rect.top + rect.height / 2;
        if (isCorrect) {
          if (e.key === " ") {
            strikeLightning(pixiAppRef.current, dotTextureRef.current, x, y);
            explodeSparks(pixiAppRef.current, dotTextureRef.current, x, y);
            if (soundEnabled) playAudioBuffer(audioContextRef.current, boltBufferRef.current); // Play bolt sound at the start
          }
          else {
            explodeParticles(pixiAppRef.current, dotTextureRef.current, x, yMid);
            if (soundEnabled) playAudioBuffer(audioContextRef.current, audioBufferRef.current);
          }
          shakeScreen(screenRef.current);
        }
        else {
          explodeParticles(pixiAppRef.current, dotTextureRef.current, x, yMid, [0xff3333, 0xff0000, 0xcc0000]);
          if (soundEnabled) playAudioBuffer(audioContextRef.current, errorBufferRef.current);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [typedChars, sampleText, soundEnabled, showResults]);

  // Move cursor to first character when sampleText changes
  useEffect(() => {
    if (!containerRef.current || !sampleText) return;
    // Move cursor to the first character
    const firstSpan = letterRefs.current[0];
    if (firstSpan) {
      const rect = firstSpan.getBoundingClientRect();
      const relativeOffset = getRelativePosition(firstSpan);
      setCursorPosition({
        x: relativeOffset.left,
        y: relativeOffset.top + rect.height / 2
      });
    }
  }, [sampleText]);

  // Update cursor position as user types (but not on sampleText change)
  useEffect(() => {
    if (!containerRef.current || !sampleText) return;
    // Update cursor position based on next character to type
    const nextCharIndex = typedChars.length;
    if (nextCharIndex < sampleText.length) {
      const nextSpan = letterRefs.current[nextCharIndex];
      if (nextSpan) {
        const rect = nextSpan.getBoundingClientRect();
        const relativeOffset = getRelativePosition(nextSpan);
        setCursorPosition({
          x: relativeOffset.left,
          y: relativeOffset.top + rect.height / 2
        });
      }
    } else {
      // Move cursor to the right of the last character
      const lastSpan = letterRefs.current[nextCharIndex - 1];
      if (lastSpan) {
        const rect = lastSpan.getBoundingClientRect();
        const relativeOffset = getRelativePosition(lastSpan);
        setCursorPosition({
          x: relativeOffset.left + rect.width,
          y: relativeOffset.top + rect.height / 2
        });
      }
    }
  }, [typedChars]);

  // NEW: Animate .text vertical shift when cursor Y changes
  useEffect(() => {
    const currentY = cursorPosition.y;
    const prevY = prevCursorYRef.current;
    if (currentY !== prevY) {
      // Animate the .text container so the current line is always at the same spot
      // We'll keep the first line at its original position, and shift up by the difference
      const offset = -currentY;
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          y: offset,
          duration: 0.35,
          ease: 'power2.out',
        });
      }
      prevCursorYRef.current = currentY;
    }
  }, [cursorPosition.y]);

  // Clear the localStorage high scores for testing (REMOVE THIS IN PRODUCTION)
  // For debugging only
  const clearHighScores = () => {
    localStorage.removeItem(`typing-high-scores-${difficulty}`);
    setHighScores([]);
  };

  // Animate game screen out/in when showResults changes
  useEffect(() => {
    if (!screenRef.current) return;
    if (showResults) {
      // Animate out with 1s delay
      setTimeout(() => {
        gsap.to(screenRef.current, {
          opacity: 0,
          scale: 0.98,
          duration: 0.5,
          ease: 'power2.in',
          onComplete: () => setGameScreenHidden(true)
        });
      }, 10);
    } else {
      // Animate in
      setGameScreenHidden(false); // show immediately for animation
      gsap.fromTo(screenRef.current,
        {
          opacity: 0,
          scale: 0.98
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [showResults]);

  return (
    <>
      <div
        className={`screen${gameScreenHidden ? ' screen--hidden' : ''}`}
        ref={screenRef}
      >
        <div className="app">
          <div className="text" ref={containerRef}>
            {(() => {
              let globalIndex = 0;
              return sampleText && sampleText.match(/\S+\s*/g)?.map((word, wordIdx) => (
                <span className="word" key={wordIdx}>
                  {word.split("").map((char, charIdx) => {
                    const thisIndex = globalIndex++;
                    const typed = typedChars[thisIndex];
                    return (
                      <span
                        key={thisIndex}
                        ref={el => letterRefs.current[thisIndex] = el}
                        className={`letter ${typed ? (typed.correct ? 'active' : 'incorrect') : 'inactive'}`}
                        data-index={thisIndex}
                        style={{position: 'relative'}}
                      >
                        {/* If correct, show as before. If incorrect, show expected char in gray and typed char in red. */}
                        {typed ? (
                          typed.correct ? (
                            char === ' ' ? '\u00A0' : char
                          ) : (
                            <>
                              <span className="expected-char" data-char={whitespaceToChar(char)}>{whitespaceToChar(char)}</span>
                              <div className="incorrect-overlay" data-char={whitespaceToChar(typed.char)}>{whitespaceToChar(typed.char)}</div>
                            </>
                          )
                        ) : (
                          char === ' ' ? '\u00A0' : char
                        )}
                      </span>
                    );
                  })}
                </span>
              ));
            })()}
            <div 
              className="cursor"
              style={{
                left: `${cursorPosition.x}px`,
                top: `${cursorPosition.y}px`
              }}
            />
          </div>
          <div ref={pixiContainerRef} className="pixi-layer" />
        </div>
      </div>
      <Results
        wpm={wpm}
        highScores={highScores}
        difficulty={difficulty}
        accuracy={accuracy}
        show={showResults}
        onDismiss={resetGame}
      />
    </>
  );
} 