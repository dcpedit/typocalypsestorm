import { gsap } from 'gsap';
import * as PIXI from 'pixi.js';
import { GlowFilter } from '@pixi/filter-glow';

// Detect low-end hardware
//const isLowEnd = typeof window !== 'undefined' && window.navigator.hardwareConcurrency && window.navigator.hardwareConcurrency <= 4;
const isLowEnd = false;

// Audio buffer cache
const audioBufferCache = new Map();

export function explodeParticles(app, dotTexture, x, y, colors) {
  colors = colors || [0xffffff, 0xf8f8ff, 0xf0f0f0, 0xe0e0e0];
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