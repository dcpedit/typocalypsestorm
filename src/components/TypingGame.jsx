import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';
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
import PowerBar from './PowerBar';
import { whitespaceToChar, getRelativePosition, getRandomSampleText } from '../utils/gameUtils';
import ScoreDisplay from './ScoreDisplay';

export default function TypingGame({ soundEnabled, difficulty, reloadKey }) {
  const [sampleText, setSampleText] = useState("");
  const [typedChars, setTypedChars] = useState([]); // {char, correct}
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const [showResults, setShowResults] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [rawAccuracy, setRawAccuracy] = useState(null);
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
  const resultsVisible = useRef(false);
  const totalErrorsRef = useRef(0); // Track total errors including corrected ones
  const rawTotalErrorsRef = useRef(0); // Track all mistakes, never decremented
  const letterRefs = useRef([]); // Array of refs for each letter
  const [uncorrectedErrors, setUncorrectedErrors] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [energy, setEnergy] = useState(100); // Add energy state
  const [incorrectTyped, setIncorrectTyped] = useState(false); // Track incorrect keystrokes
  const incorrectTimerRef = useRef(null);
  const everCorrectIndicesRef = useRef(new Set()); // Track indices ever typed correctly

  // Constants for score penalty
  const MAX_ERRORS_FOR_MIN_RATIO = 15; // Number of errors for minimum ratio
  const MIN_CORRECT_RATIO = 0.5; // Minimum ratio when max errors reached
  const NORMALIZED_LENGTH = 500;

  useEffect(() => {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      transparent: true
    });
    pixiContainerRef.current.appendChild(app.view);
    pixiAppRef.current = app;

    // Add window resize handler
    function handleResize() {
      if (pixiAppRef.current) {
        pixiAppRef.current.renderer.resize(window.innerWidth, window.innerHeight);
      }
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
    setStreak(0); // Reset streak
    setScore(0); // Reset score
    setMultiplier(1); // Reset multiplier
    setEnergy(100); // Reset energy to full
    rawTotalErrorsRef.current = 0; // Reset raw error count
    everCorrectIndicesRef.current = new Set(); // Reset unique correct indices
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (incorrectTimerRef.current) {
        clearTimeout(incorrectTimerRef.current);
      }
      everCorrectIndicesRef.current = new Set(); // Clean up on unmount
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
    resetGame();
  }, [difficulty, reloadKey]);

  // Function to calculate correctRatio and energy based on number of incorrect characters
  function calculateEnergyAndRatio(numIncorrect) {
    let correctRatio;
    if (numIncorrect <= 0) {
      correctRatio = 1;
    } else if (numIncorrect >= MAX_ERRORS_FOR_MIN_RATIO) {
      correctRatio = MIN_CORRECT_RATIO;
    } else {
      correctRatio = 1 - (1 - MIN_CORRECT_RATIO) * (numIncorrect / MAX_ERRORS_FOR_MIN_RATIO);
    }
    
    // Calculate energy based on correctRatio
    const calculatedEnergy = Math.round(
      ((correctRatio - MIN_CORRECT_RATIO) / (1 - MIN_CORRECT_RATIO)) * 100
    );
    
    return {
      correctRatio,
      energy: Math.max(0, Math.min(100, calculatedEnergy))
    };
  }

  function calculateScore({ typedChars, multiplier, sampleTextLength, charIndex }) {
    // If this char index has already been used for score, return 0
    if (everCorrectIndicesRef.current.has(charIndex)) {
      return 0;
    }
    // Use the number of unique correct indices for scoring (including this one)
    const numCorrect = everCorrectIndicesRef.current.size + 1; // +1 for this correct char
    const numTyped = typedChars.length + 1; // +1 for this char
    const numIncorrect = numTyped - numCorrect;

    // Get correctRatio and energy from shared function
    const { correctRatio, energy } = calculateEnergyAndRatio(numIncorrect);
    
    // Update energy state
    setEnergy(energy);
    
    const rawScore = 5 * multiplier * correctRatio;
    // Normalize so max possible score is as if sampleTextLength = NORMALIZED_LENGTH
    return rawScore * (NORMALIZED_LENGTH / sampleTextLength);
  }

  // --- Helper Functions for Key Handling ---
  function isResetKey(e) {
    return e.key === 'Enter' || e.key === 'Return' || e.key === 'Escape';
  }

  function isPrintableChar(e) {
    return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  }

  function handleCtrlBackspace() {
    // Find the index to delete to (start of previous word)
    let deleteTo = typedChars.length - 1;
    // Skip any trailing spaces
    while (deleteTo >= 0 && typedChars[deleteTo].char === ' ') {
      deleteTo--;
    }
    // Then skip all non-spaces (the word)
    while (deleteTo >= 0 && typedChars[deleteTo].char !== ' ') {
      deleteTo--;
    }
    // deleteTo now points to the space before the word, or -1
    const newTypedChars = typedChars.slice(0, deleteTo + 1);

    // Cinder effect for each deleted char
    for (let i = typedChars.length - 1; i > deleteTo; i--) {
      const span = letterRefs.current[i];
      if (span) {
        const rect = span.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        cinderTrail(pixiAppRef.current, dotTextureRef.current, x, y);
      }
    }

    setTypedChars(newTypedChars);
    setStreak(0); // Reset streak on backspace

    // Recalculate energy and errors for all deleted chars
    let errorsRemoved = 0;
    for (let i = deleteTo + 1; i < typedChars.length; i++) {
      if (!typedChars[i].correct) errorsRemoved++;
    }
    totalErrorsRef.current = Math.max(0, totalErrorsRef.current - errorsRemoved);

    // Calculate energy based on current total errors
    const { energy } = calculateEnergyAndRatio(totalErrorsRef.current);
    setEnergy(energy);

    if (soundEnabled) playAudioBuffer(audioContextRef.current, backspaceBufferRef.current);
  }

  function handleSingleBackspace() {
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
    setStreak(0); // Reset streak on backspace

    // Recalculate energy when removing a character with backspace
    // If we're removing an incorrect character, the total errors might not change
    const removedChar = typedChars[typedChars.length - 1];
    // Only reduce total errors if we're removing an incorrect character
    if (removedChar && !removedChar.correct) {
      totalErrorsRef.current = Math.max(0, totalErrorsRef.current - 1);
    }
    // Calculate energy based on current total errors
    const { energy } = calculateEnergyAndRatio(totalErrorsRef.current);
    setEnergy(energy);

    if (soundEnabled) playAudioBuffer(audioContextRef.current, backspaceBufferRef.current);
  }

  function handleBackspace(e) {
    if ((e.ctrlKey || e.metaKey) && typedChars.length > 0) {
      handleCtrlBackspace();
      return;
    }
    if (typedChars.length > 0) {
      handleSingleBackspace();
    }
  }

  function handleCharacterInput(e) {
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
      rawTotalErrorsRef.current++; // Increment raw error count (never decremented)
      setStreak(0); // Reset streak on incorrect
      // Calculate energy based on total errors when typing incorrectly
      const numIncorrect = totalErrorsRef.current;
      // Get energy using the shared function
      const { energy } = calculateEnergyAndRatio(numIncorrect);
      setEnergy(energy);
      // Update incorrectTyped state when a key is typed incorrectly
      setIncorrectTyped(true);
      // Clear any existing timer
      if (incorrectTimerRef.current) {
        clearTimeout(incorrectTimerRef.current);
      }
      // Reset the incorrectTyped flag after a short delay
      incorrectTimerRef.current = setTimeout(() => {
        setIncorrectTyped(false);
      }, 300);
    } else {
      setStreak(prev => prev + 1); // Increment streak on correct
      // Only add score if this index hasn't been used before
      const scoreToAdd = calculateScore({ typedChars, multiplier, sampleTextLength: sampleText.length, charIndex: nextIndex });
      if (scoreToAdd > 0) {
        everCorrectIndicesRef.current.add(nextIndex);
      }
      setScore(prev => prev + scoreToAdd);
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
      // Count uncorrected errors (final incorrect chars)
      const uncorrectedErrors = currentTypedChars.reduce(
        (acc, char, idx) => acc + (char.char !== sampleText[idx] ? 1 : 0),
        0
      );
      setUncorrectedErrors(uncorrectedErrors);
      // Only count correct chars in the final result
      const correctChars = currentTypedChars.reduce(
        (acc, char, idx) => acc + (char.char === sampleText[idx] ? 1 : 0),
        0
      );
      const timeInMinutes = (now - currentStartTime) / 1000 / 60;
      // Calculate rawAccuracy (not affected by corrections, only increments)
      const rawAccuracyValue = Math.max(0, ((sampleText.length - rawTotalErrorsRef.current) / sampleText.length));
      setRawAccuracy(rawAccuracyValue * 100);
      // Avoid division by zero or negative values
      if (correctChars <= 0 || timeInMinutes <= 0) {
        setWpm(0);
        setRawAccuracy(null);
      } else {
        // Calculate accuracy based only on uncorrected errors (final incorrect chars)
        const accuracy = Math.max(0, ((sampleText.length - uncorrectedErrors) / sampleText.length));
        // WPM is based on correct, final characters only (uncorrected errors lower the score)
        // Make accuracy a multiplier to encourage correcting mistakes
        const calculatedWpm = Math.round(((correctChars / 5) / timeInMinutes) * accuracy);
        setWpm(calculatedWpm);
        setRawAccuracy(accuracy * 100);
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
          explodeParticles(pixiAppRef.current, dotTextureRef.current, x, yMid, [0xffffff, 0xfffacd, 0xffee99, 0xffdd66]);
          if (soundEnabled) playAudioBuffer(audioContextRef.current, audioBufferRef.current);
        }
        shakeScreen(screenRef.current);
      }
      else {
        explodeParticles(pixiAppRef.current, dotTextureRef.current, x, yMid, [0x990000, 0xaa3300, 0xbb5500, 0xcc6600]);
        if (soundEnabled) playAudioBuffer(audioContextRef.current, errorBufferRef.current);
      }
    }
  }

  // --- Main Keydown Handler ---
  useEffect(() => {
    function handleKeyDown(e) {
      if (showResults) return;
      if (isResetKey(e)) {
        resetGame();
        return;
      }
      if (!sampleText) return;
      handleTypingActivity();
      if (e.key === 'Backspace') {
        handleBackspace(e);
        return;
      }
      if (!isPrintableChar(e)) return;
      handleCharacterInput(e);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [typedChars, sampleText, soundEnabled, showResults, multiplier]);

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
      <ScoreDisplay 
        score={score} 
        showResults={showResults} 
        energy={energy} 
        pixiApp={pixiAppRef.current}
        incorrectTyped={incorrectTyped}
      />
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
        difficulty={difficulty}
        accuracy={rawAccuracy}
        show={showResults}
        onDismiss={resetGame}
        hasUncorrectedErrors={uncorrectedErrors > 0}
        score={score}
        audioContextRef={audioContextRef}
        soundEnabled={soundEnabled}
      />
      <PowerBar pixiAppRef={pixiAppRef} streak={streak} onMultiplierChange={setMultiplier} />
    </>
  );
} 