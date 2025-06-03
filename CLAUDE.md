# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` (or `npm run dev`) - Start development server on http://localhost:5173
- `pnpm build` (or `npm run build`) - Build for production
- `pnpm preview` (or `npm run preview`) - Preview production build

## Architecture

This is a React-based typing practice application called "Typocalypse Storm" that combines typing mechanics with dynamic visual effects.

### Core Technologies
- **React 18** - Component framework
- **PIXI.js** - WebGL-based graphics engine for particle effects, lightning animations, and visual feedback
- **GSAP** - Animation library for DOM-based animations and tweening
- **Vite** - Build tool and development server

### Key Components Structure
- `App.jsx` - Root component handling routing (#admin hash), sound/difficulty settings, and localStorage persistence
- `TypingGame.jsx` - Main game logic with PIXI.js canvas integration, keystroke handling, and effects coordination
- `Header.jsx` - Settings controls (sound toggle, difficulty toggle, reload)
- `Results.jsx` - Post-game statistics display
- `PowerBar.jsx` & `ScoreDisplay.jsx` - Real-time game state indicators

### Effects System
The visual effects are split between two utility modules:
- `effectsUtils.js` - PIXI.js-based effects (particles, lightning, screen shake, audio management)
- `gameUtils.js` - Game logic utilities (text processing, sample selection, positioning)

### Data Flow
1. Sample text loaded from JSON files in `/data/` based on difficulty
2. Keystroke events trigger both game state updates and visual effects
3. PIXI.js renders effects on a canvas overlay
4. Game metrics (WPM, accuracy, streak) calculated in real-time
5. Results component displays final statistics

### Audio System
- Pre-loads audio buffers for different sound types (correct, error, backspace, lightning)
- Uses Web Audio API for low-latency playback
- Caches audio buffers to prevent repeated network requests

### Performance Optimizations
- Manual chunk splitting in Vite config separates React, GSAP, and PIXI.js bundles
- Low-end device detection for reduced particle counts
- Bundle analyzer via rollup-plugin-visualizer
- PWA configuration for offline support