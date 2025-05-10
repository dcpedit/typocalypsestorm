import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import '../styles/ScoreDisplay.css';
import { createRippleEffect } from '../utils/effectsUtils';

export default function ScoreDisplay({ score, showResults, energy = 0, pixiApp, incorrectTyped = false }) {
  const scoreRef = useRef();
  const prevScore = useRef(score);
  const containerRef = useRef();
  const energyBarRef = useRef();
  const lastIncorrectRef = useRef(false);
  const MAX_SECTIONS = 5;
  
  // Calculate number of active sections based on energy percentage
  const activeSections = Math.ceil((energy / 100) * MAX_SECTIONS) || 1;

  // Ripple effect when typing incorrect character
  useEffect(() => {
    if (!pixiApp || !energyBarRef.current) return;
    // Only trigger the effect when incorrectTyped changes from false to true
    if (incorrectTyped && !lastIncorrectRef.current) {
      createRippleEffect(pixiApp, energyBarRef);
    }
    lastIncorrectRef.current = incorrectTyped;
  }, [incorrectTyped, pixiApp]);

  useEffect(() => {
    if (scoreRef.current) {
      gsap.fromTo(
        scoreRef.current,
        { textContent: prevScore.current },
        {
          textContent: score,
          duration: 0.7,
          ease: 'power1.out',
          snap: { textContent: 1 },
          onUpdate: function () {
            scoreRef.current.textContent = Math.floor(this.targets()[0].textContent);
          },
        }
      );
      prevScore.current = score;
    }
  }, [score]);

  // Animate the score display based on showResults state
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (showResults) {
      // Animate away when results are shown
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    } else {
      // Animate back in when results are dismissed
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [showResults]);

  // Generate energy sections
  const renderEnergySections = () => {
    const sections = [];
    for (let i = 0; i < MAX_SECTIONS; i++) {
      // Calculate the color based on position
      const isActive = i < activeSections;
      // Calculate the hue value (0=red to 180=cyan)
      // top (i=0) is red (hue=0), bottom is cyan (hue=180)
      const hue = isActive ? Math.round(180 * (i / (MAX_SECTIONS - 1))) : 0;
      
      // Add a blinking class to the last active section when energy is low
      const isBlinking = energy <= (100 / MAX_SECTIONS) && i === activeSections - 1;
      
      sections.push(
        <div 
          key={i}
          className={`energy-section ${isActive ? 'active' : ''} ${isBlinking ? 'blinking' : ''}`}
          style={isActive ? { backgroundColor: `hsl(${hue}, 100%, 50%)` } : {}}
        />
      );
    }
    return sections;
  };

  return (
    <div className="score-display" ref={containerRef}>
      <div className="score-content">
        <div className="score-label">SCORE</div>
        <span ref={scoreRef} className="score-value">{score}</span>
      </div>
      <div className="energy-bar" ref={energyBarRef}>
        <div className="energy-sections">
          {renderEnergySections()}
        </div>
      </div>
    </div>
  );
} 