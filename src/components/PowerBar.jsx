import React, { useEffect, useRef, useState } from 'react';
import './PowerBar.css';
import * as PIXI from 'pixi.js';
import { absorbEnergyParticles } from '../utils/effectsUtils';
import { getLevelFill, getMultiplier, brightenHexColor } from '../utils/gameUtils';
import { gsap } from 'gsap';
import { LEVEL_COLORS } from '../styles/colors';

const MAX_LEVELS = 4;
const MAX_PROGRESS = 400;
const LEVEL_SIZE = 100;
const PROGRESS_INCREMENTS = [15, 10, 8, 7];

export default function PowerBar({ pixiAppRef, streak, onMultiplierChange }) {
  const [progress, setProgress] = useState(0); // 0 to 300
  const prevStreakRef = useRef(streak);
  const dotTextureRef = useRef();
  const prevProgressRef = useRef(0);
  const prevLabelRef = useRef(0);
  const labelRef = useRef();

  // Handle progress increment and reset on streak changes
  useEffect(() => {
    setProgress(prev => {
      if (streak <= 0) {
        return 0;
      } else {
        const progressIncrement = PROGRESS_INCREMENTS[getMultiplier(progress) - 1];
        return Math.min(MAX_PROGRESS, prev + progressIncrement);
      }
    });
    prevStreakRef.current = streak;
  }, [streak]);

  // Decay progress by 1 per second, only if streak > 0 and progress > 0
  useEffect(() => {
    if (progress <= 0 || streak === 0) return;
    const DECAY_PER_SEC = 70;
    //const DECAY_PER_SEC = 1;
    const INTERVAL_MS = 33; // ~30fps
    const decayPerTick = (DECAY_PER_SEC * INTERVAL_MS) / 1000;
    const intervalId = setInterval(() => {
      setProgress(prev => Math.max(0, prev - decayPerTick));
    }, INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [progress, streak]);

  // Preload the particle texture
  useEffect(() => {
    const texture = PIXI.Texture.from('/images/particle.png');
    if (texture.baseTexture.valid) {
      dotTextureRef.current = texture;
    } else {
      texture.baseTexture.on('loaded', () => {
        dotTextureRef.current = texture;
      });
    }
  }, []);

  // Emit energy particles when progress increases
  useEffect(() => {
    if (!pixiAppRef?.current || !dotTextureRef.current) return;
    if (progress > prevProgressRef.current) {
      const MAX_PARTICLES = 8;
      const targetParticles = progress >= (LEVEL_SIZE * 3) ? (MAX_PARTICLES / 2) : (progress - prevProgressRef.current);
      let numParticles = Math.min(MAX_PARTICLES, Math.ceil(targetParticles));
      // Use LEVEL_COLORS for particle colors
      const levelColors = [
        brightenHexColor(LEVEL_COLORS['level-1'].start),
        brightenHexColor(LEVEL_COLORS['level-2'].start),
        brightenHexColor(LEVEL_COLORS['level-3'].start),
        brightenHexColor(LEVEL_COLORS['level-4'].start),
      ];
      for (let i = 0; i < numParticles; i++) {
        absorbEnergyParticles(pixiAppRef.current, dotTextureRef.current, progress, levelColors);
      }
    }
    prevProgressRef.current = progress;
  }, [progress, pixiAppRef]);

  // Bounce animation when label changes (GSAP version)
  useEffect(() => {
    const currentLabel = getMultiplier(progress);
    const prevLabel = prevLabelRef.current;

    if (
      currentLabel &&
      prevLabel !== currentLabel
    ) {
      if (labelRef.current) {
        gsap.killTweensOf(labelRef.current);

        gsap.fromTo(
          labelRef.current,
          {
            scale: prevLabel,
            y: -5 * prevLabel
          },
          {
            scale: currentLabel,
            y: -5 * currentLabel,
            duration: 0.5,
            ease: 'bounce.out',
          }
        );
      }
      if (onMultiplierChange) {
        onMultiplierChange(currentLabel);
      }
    }
    prevLabelRef.current = currentLabel;
  }, [progress]);

  useEffect(() => {
    Object.entries(LEVEL_COLORS).forEach(([level, { start, end, shadow, label }]) => {
      document.documentElement.style.setProperty(`--${level}-start`, start);
      document.documentElement.style.setProperty(`--${level}-end`, end);
      document.documentElement.style.setProperty(`--${level}-shadow`, shadow);
      document.documentElement.style.setProperty(`--${level}-label`, label);
    });
  }, []);

  // Helper: get glow color for current level
  const getGlowBoxShadow = (progress) => {
    const level = getMultiplier(progress);
    const colorKey = `level-${level}`;
    const color = LEVEL_COLORS[colorKey] || LEVEL_COLORS['level-1'];
    return `0 0 32px 12px ${color.shadow}88, 0 0 64px 24px ${color.shadow}44`;
  };

  return (
    <div className="power-bar-container">
      {/* Multiplier label above the bar */}
      {progress >= 100 && (
        <div
          ref={labelRef}
          className={`power-bar__multiplier-label level-${getMultiplier(progress)}`}
        >
          x{getMultiplier(progress)}
        </div>
      )}
      <div
        className="power-bar__glow"
        style={{
          opacity: progress > 0 ? 0.7 : 0,
          boxShadow: getGlowBoxShadow(progress),
        }}
      />
      <svg
        className="power-bar-outline"
        viewBox="0 0 345.61 26"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          opacity: progress > 0 ? 1 : 0,
          // Set outline color based on current level
          '--power-bar-outline-fill': LEVEL_COLORS[`level-${getMultiplier(progress)}`]?.start || 'aqua',
        }}
        aria-hidden="true"
        focusable="false"
      >
        <g>
          <path className="power-bar-outline__path" d="M308.05,0H37.56L0,26h345.61L308.05,0ZM38.18,2h269.25l31.78,22H6.4L38.18,2Z" />
        </g>
      </svg>
      <div className="power-bar">
        {(() => {
          const bars = [];
          for (let i = 0; i < MAX_LEVELS; i++) {
            const fill = getLevelFill(progress, i); // 0 to 100
            const capWidth = 16;
            bars.push(
              <div
                key={i}
                className={`power-bar__window power-bar__window--level-${i + 1}`}
                style={{ zIndex: i + 1 }}
              >
                <div
                  className={`power-bar__fill power-bar__fill--level-${i + 1}`}
                  style={{
                    width: '100%',
                    transform: `translateX(-${100 - fill}%)`,
                  }}
                >
                  <div
                    className="power-bar__fill-bar"
                    style={{
                      width: `calc(100% - 16px)`
                    }}
                  />
                  <div
                    className={`power-bar__fill-cap power-bar__fill-cap--level-${i + 1}`}
                  />
                </div>
              </div>
            );
          }
          return bars;
        })()}
      </div>
    </div>
  );
} 