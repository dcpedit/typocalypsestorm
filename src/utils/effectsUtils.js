import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

// Detect low-end hardware
//const isLowEnd = typeof window !== 'undefined' && window.navigator.hardwareConcurrency && window.navigator.hardwareConcurrency <= 4;
const isLowEnd = false;

// Audio buffer cache
const audioBufferCache = new Map();

export function explodeParticles(app, dotTexture, x, y, colors) {
  colors = colors || [0xffffff];
  const PARTICLE_COUNT = isLowEnd ? 15 : 20;
  const PARTICLE_INITIAL_MAX = 0.05;
  const PARTICLE_INITIAL_DELTA = 0.5;
  const PARTICLE_MIN_SCALE = 0.2;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const sprite = new PIXI.Sprite(dotTexture);
    const tint = colors[Math.floor(Math.random() * colors.length)];
    const initialScale = PARTICLE_INITIAL_MAX - Math.random() * PARTICLE_INITIAL_DELTA;
    sprite.tint = tint;
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.alpha = 0.5;
    sprite.scale.set(initialScale + PARTICLE_MIN_SCALE);
    app.stage.addChild(sprite);
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 10;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let lifetime = 0;
    const duration = isLowEnd ? 0.5 : 0.7;
    const maxDistance = 10;
    const ticker = (delta) => {
      const dt = delta / 60;
      lifetime += dt;
      sprite.x += vx * dt * maxDistance;
      sprite.y += vy * dt * maxDistance;
      const progress = lifetime / duration;
      sprite.alpha = 1 - progress;
      sprite.scale.set(initialScale * (1 - progress) + PARTICLE_MIN_SCALE);
      if (progress >= 1) {
        app.ticker.remove(ticker);
        app.stage.removeChild(sprite);
        sprite.destroy();
      }
    };
    app.ticker.add(ticker);
  }
  app.renderer.render(app.stage);
}

export function explodeSparks(app, dotTexture, x, y) {
  const PARTICLE_COLOR = 0x99ccff;
  const FAN_ANGLE = (80 * Math.PI) / 180;
  const CENTER_ANGLE = -Math.PI / 2;
  const PARTICLE_COUNT = isLowEnd ? 15 : 20;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const sprite = new PIXI.Sprite(dotTexture);
    sprite.tint = PARTICLE_COLOR;
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.alpha = 1;
    sprite.scale.set(0.35 + Math.random() * 0.18);
    app.stage.addChild(sprite);
    const angle = CENTER_ANGLE + (Math.random() - 0.5) * FAN_ANGLE;
    const speed = Math.random() * 10 + 8;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let lifetime = 0;
    const duration = isLowEnd ? 0.8 : 1.2;
    const ticker = (delta) => {
      const dt = delta / 60;
      lifetime += dt;
      sprite.x += vx * dt * 10;
      sprite.y += vy * dt * 10 + 0.5;
      const progress = lifetime / duration;
      sprite.alpha = 1 - progress;
      sprite.scale.set(0.22 * (1 - progress) + 0.12);
      if (progress >= 1) {
        PIXI.Ticker.shared.remove(ticker);
        app.stage.removeChild(sprite);
        sprite.destroy();
      }
    };
    PIXI.Ticker.shared.add(ticker);
  }
}

export function cinderTrail(app, dotTexture, x, y) {
  const PARTICLE_COUNT = isLowEnd ? 10 : 15;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const sprite = new PIXI.Sprite(dotTexture);
    const colors = [0xff6b00, 0xff9d00, 0xffcc00];
    sprite.tint = colors[Math.floor(Math.random() * colors.length)];
    sprite.anchor.set(0.5);
    sprite.x = x + (Math.random() * 20 - 10);
    sprite.y = y + (Math.random() * 30 - 15);
    sprite.alpha = 0.8 + Math.random() * 0.2;
    sprite.scale.set(0.2 + Math.random() * 0.15);
    app.stage.addChild(sprite);
    const angle = -Math.PI/2 + (Math.random() * Math.PI/4 - Math.PI/8);
    const speed = Math.random() * 2 + 1;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    let lifetime = 0;
    const duration = 0.8 + Math.random() * 0.4;
    const ticker = (delta) => {
      const dt = delta / 60;
      lifetime += dt;
      const progress = lifetime / duration;
      sprite.alpha = (1 - progress) * 0.8;
      sprite.scale.set((0.2 * (1 - progress) + 0.05) * (1 + Math.sin(lifetime * 3) * 0.1));
      if (progress >= 1) {
        PIXI.Ticker.shared.remove(ticker);
        app.stage.removeChild(sprite);
        sprite.destroy();
      }
    };
    PIXI.Ticker.shared.add(ticker);
  }
}

// Throttle shake to once every 100ms
let lastShake = 0;
export function shakeScreen(screen, maxX = 6, maxY = 6) {
  if (!screen) return;
  const now = performance.now();
  if (now - lastShake < 100) return;
  lastShake = now;
  gsap.fromTo(
    screen,
    { x: -maxX + Math.random() * (2 * maxX), y: -maxY + Math.random() * (2 * maxY) },
    { x: 0, y: 0, duration: 0.2, ease: "power2.out" }
  );
}

export function strikeLightning(app, dotTexture, targetX, targetY) {
  const boltCount = isLowEnd ? 2 : 2;
  const bolts = [];
  const duration = 0.3;
  const redrawInterval = isLowEnd ? 75 : 50;
  let lastDrawTime = 0;
  const startTime = performance.now();
  for (let b = 0; b < boltCount; b++) {
    const bolt = new PIXI.Graphics();
    app.stage.addChild(bolt);
    bolts.push(bolt);
  }
  const drawBolt = (bolt, offsetIndex) => {
    const thicknesses = [2.2, 1.1, 1.7, 0.7];
    const boltThickness = thicknesses[offsetIndex] || (1 + Math.random() * 2);
    const segments = isLowEnd ? 6 : 10;
    const variance = 40;
    bolt.clear();
    bolt.lineStyle(boltThickness, 0x99ccff, 1);
    const height = targetY;
    let x = targetX + (offsetIndex - (boltCount-1)/2) * 8 + Math.random() * 4;
    let y = 0;
    bolt.moveTo(x, y);
    const points = [{ x, y }];
    for (let i = 1; i < segments; i++) {
      const segY = (i / segments) * height;
      const segX = x + (Math.random() * variance - variance / 2);
      points.push({ x: segX, y: segY });
    }
    points.push({ x: targetX, y: height });
    for (let i = 1; i < points.length; i++) {
      bolt.lineTo(points[i].x, points[i].y);
    }
    if (!bolt.filters) {
      bolt.filters = [
        new GlowFilter({
          distance: 10,
          outerStrength: 4,
          innerStrength: 0,
          color: 0x66ccff,
          quality: isLowEnd ? 0.3 : 0.5
        })
      ];
    }
  };
  const ticker = () => {
    const now = performance.now();
    const elapsed = now - startTime;
    if (elapsed >= duration * 1000) {
      PIXI.Ticker.shared.remove(ticker);
      for (const bolt of bolts) {
        app.stage.removeChild(bolt);
        bolt.destroy();
      }
    } else if (now - lastDrawTime >= redrawInterval) {
      bolts.forEach((bolt, i) => drawBolt(bolt, i));
      lastDrawTime = now;
    }
  };
  PIXI.Ticker.shared.add(ticker);
}

export async function fetchAndDecodeAudioBuffer(url, audioContext) {
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url);
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);
  audioBufferCache.set(url, buffer);
  return buffer;
}

// Throttle audio to 1 every 50ms
let lastAudio = 0;
export function playAudioBuffer(audioContext, audioBuffer) {
  if (!audioContext || !audioBuffer) return;
  const now = performance.now();
  if (now - lastAudio < 50) return;
  lastAudio = now;
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
}

export function absorbEnergyParticles(app, dotTexture, progress, levelColors) {
  // Bar is centered horizontally, 320px wide, 18px tall, bottom of screen
  const barWidth = 320;
  const barHeight = 18;
  const barX = window.innerWidth / 2 - barWidth / 2;
  const barY = window.innerHeight - 16 - barHeight; // 16px margin from bottom

  // Helper: get current level (0, 1, 2)
  const getCurrentLevel = (progress) => {
    if (progress >= 200) return 2;
    if (progress >= 100) return 1;
    return 0;
  };

  // Helper: get fill % for each level
  const getLevelFill = (progress, levelIdx) => {
    const lower = levelIdx * 100;
    const upper = (levelIdx + 1) * 100;
    if (progress <= lower) return 0;
    if (progress >= upper) return 100;
    return ((progress - lower) / 100) * 100;
  };

  // Calculate the end of the progress bar (right edge of the currently filling level)
  const fillPercent = getLevelFill(progress, getCurrentLevel(progress));
  const fillPx = (fillPercent / 100) * barWidth;
  const endX = barX + fillPx;
  const endY = barY + barHeight / 2;

  // Start from a random point in a ring around the bar, biased above and to the sides
  let angle;
  if (Math.random() < 0.75) {
    // 75% chance: above and sides (-π/2 to +π/2)
    angle = (-Math.PI / 2) + Math.random() * Math.PI;
  } else {
    // 25% chance: below (+π/2 to +3π/2)
    angle = (Math.PI / 2) + Math.random() * Math.PI;
  }
  const radius = 90 + Math.random() * 40;
  const startX = endX + Math.cos(angle) * radius;
  const startY = endY + Math.sin(angle) * radius;

  const sprite = new PIXI.Sprite(dotTexture);
  sprite.anchor.set(0.5);
  sprite.x = startX;
  sprite.y = startY;
  sprite.alpha = 0.7;
  // For growing effect, set initial scale small
  const endScale = 0.32 + Math.random() * 0.18;
  const startScale = 0.08;
  sprite.scale.set(startScale);
  // Set tint based on current level color
  const currentLevel = getCurrentLevel(progress);
  sprite.tint = levelColors[currentLevel];
  app.stage.addChild(sprite);

  // Animate toward the end of the bar
  const duration = 0.7 + Math.random() * 0.2;
  let elapsed = 0;
  const startAlpha = sprite.alpha;
  const ticker = (delta) => {
    const dt = delta / 60;
    elapsed += dt;
    const t = Math.min(1, elapsed / duration);
    // Ease in
    sprite.x = startX + (endX - startX) * t * t;
    sprite.y = startY + (endY - startY) * t * t;
    sprite.alpha = startAlpha * (1 - t);
    // Grow as t increases
    sprite.scale.set(startScale + (endScale - startScale) * t);
    if (t >= 1) {
      app.ticker.remove(ticker);
      app.stage.removeChild(sprite);
      sprite.destroy();
    }
  };
  app.ticker.add(ticker);
}

export function createRippleEffect(app, energyBarRef) {
  if (!energyBarRef.current) return;
  // Constants for ripple effect
  const RIPPLE_COLOR = 0xff1744;
  const NUM_RIPPLES = 2;
  const RIPPLE_DURATION = 1;
  const RIPPLE_MAX_SIZE = 8;
  const RIPPLE_WIDTH = 2;
  const INITIAL_CORNER_RADIUS = 3;

  // Get the position and dimensions of the energy bar
  const barRect = energyBarRef.current.getBoundingClientRect();
  const barWidth = barRect.width;
  const barHeight = barRect.height;
  const barX = barRect.left + barWidth / 2; // Center X
  const barY = barRect.top + barHeight / 2; // Center Y

  // Create ripples
  for (let i = 0; i < NUM_RIPPLES; i++) {
    const ripple = new PIXI.Graphics();
    ripple.lineStyle(RIPPLE_WIDTH, RIPPLE_COLOR, 1);
    const initialCornerRadius = INITIAL_CORNER_RADIUS;
    ripple.drawRoundedRect(-barWidth/2, -barHeight/2, barWidth, barHeight, initialCornerRadius);
    ripple.x = barX;
    ripple.y = barY;
    ripple.alpha = 0.8;
    // Add neon glow filter
    ripple.filters = [new GlowFilter({ distance: 15, outerStrength: 3, color: RIPPLE_COLOR })];
    app.stage.addChild(ripple);
    const initialWidth = barWidth;
    const initialHeight = barHeight;
    const maxWidth = barWidth * (1 + RIPPLE_MAX_SIZE);
    const maxCornerRadius = initialCornerRadius * (maxWidth / initialWidth);
    const delay = i * 0.15;
    const startTime = performance.now() + delay * 1000;
    const duration = RIPPLE_DURATION;
    const ticker = (delta) => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      if (elapsed < 0) return;
      if (elapsed >= duration) {
        app.ticker.remove(ticker);
        app.stage.removeChild(ripple);
        ripple.destroy();
        return;
      }
      const progress = elapsed / duration;
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const sizeDelta = (maxWidth - initialWidth) * easeProgress;
      const currentWidth = initialWidth + sizeDelta;
      const currentHeight = initialHeight + sizeDelta;
      const currentCornerRadius = initialCornerRadius + (maxCornerRadius - initialCornerRadius) * easeProgress;
      ripple.clear();
      ripple.lineStyle(RIPPLE_WIDTH, RIPPLE_COLOR, 0.8 * (1 - easeProgress));
      ripple.drawRoundedRect(-currentWidth / 2, -currentHeight / 2, currentWidth, currentHeight, currentCornerRadius);
    };
    app.ticker.add(ticker);
  }
} 