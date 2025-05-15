// Utility functions for the typing game
import samplesHard from '../data/samples_hard.json';
import samplesEasy from '../data/samples_easy.json';

// Convert whitespace characters to visible symbols
export function whitespaceToChar(char) {
  switch(char) {
    case ' ': return '␣'; // Space
    case '\t': return '→'; // Tab
    case '\n': return '⏎'; // Newline
    default: return char;
  }
}

export function getRelativePosition(element) {
  if (!element) return { top: 0, left: 0 };
  return {
    top: element.offsetTop || 0,
    left: element.offsetLeft || 0
  };
}

// Helper to get a random sample text based on difficulty
export function getRandomSampleText(difficulty) {
  const source = difficulty === 'Easy' ? samplesEasy : samplesHard;
  if (Array.isArray(source) && source.length > 0) {
    const random = source[Math.floor(Math.random() * source.length)];
    return random.text;
  }
  return '';
}

// PowerBar helpers
export function getCurrentLevel(progress) {
  if (progress >= 200) return 2;
  if (progress >= 100) return 1;
  return 0;
}

export function getLevelFill(progress, levelIdx) {
  const LEVEL_SIZE = 100;
  const lower = levelIdx * LEVEL_SIZE;
  const upper = (levelIdx + 1) * LEVEL_SIZE;
  if (progress <= lower) return 0;
  if (progress >= upper) return 100;
  return ((progress - lower) / LEVEL_SIZE) * 100;
}

export function getMultiplier(progress) {
  if (progress >= 300) return 4;
  if (progress >= 200) return 3;
  if (progress >= 100) return 2;
  return 1;
}

// Helper to brighten a hex color by increasing its lightness
export function brightenHexColor(hex, amount = 0.3) {
  // Remove '#' if present
  hex = hex.replace('#', '');
  // Parse r, g, b
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Convert to HSL
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  // Increase lightness
  l = Math.min(1, l + amount);

  // Convert back to RGB
  let r1, g1, b1;
  if (s === 0) {
    r1 = g1 = b1 = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r1 = hue2rgb(p, q, h + 1/3);
    g1 = hue2rgb(p, q, h);
    b1 = hue2rgb(p, q, h - 1/3);
  }
  // Convert to hex
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return parseInt(toHex(r1) + toHex(g1) + toHex(b1), 16);
}

// Helper to get the base URL for Firebase Functions (Vite: use import.meta.env)
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || window.location.origin;

// Post a new game score to the server
export async function postGameScore({ name, difficulty, score, wpm, accuracy }) {
  // Use the base URL for the function endpoint
  const res = await fetch(`${FUNCTIONS_BASE_URL}/addGameScore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      difficulty: difficulty.toLowerCase(),
      score: Math.round(score),
      wpm: Math.round(wpm),
      accuracy: Math.floor(accuracy)
    })
  });
  if (!res.ok) throw new Error('Failed to save score');
  return res.json();
}

// Update the name for a game score on the server
export async function updateGameScoreName({ id, newName }) {
  // Use the base URL for the function endpoint
  const res = await fetch(`${FUNCTIONS_BASE_URL}/updateGameScoreName`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      newName
    })
  });
  if (!res.ok) throw new Error('Failed to update name');
  return res.json();
}

// Admin: Get game scores with secret key (paginated)
export async function getGameScoresAdmin({ apiSecretKey, pageSize = 100, pageToken } = {}) {
  const res = await fetch(`${FUNCTIONS_BASE_URL}/getGameScoresAdmin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiSecretKey, pageSize, pageToken })
  });
  if (!res.ok) throw new Error('Failed to fetch admin scores');
  return res.json();
}

// Local storage helpers for high scores
export const DEFAULT_NAME = 'AAA';

export function getHighScores(difficulty) {
  const key = `typing-scores-${difficulty}`;
  const storedScores = localStorage.getItem(key);
  return storedScores ? JSON.parse(storedScores) : [];
}

export function saveHighScore(difficulty, score, wpm, accuracy, maxEntries = 5) {
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

export function updateHighScore(id, name) {
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