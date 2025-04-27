import React from 'react';
import '../styles/Header.css';

export default function Header({ soundEnabled, onToggleSound, difficulty, onToggleDifficulty, onReload }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          <img src="/images/ts_logo_large.png" alt="TypeScript Logo" className="logo" />
        </div>
        <nav className="nav-links">
          <button onClick={e => { e.currentTarget.blur(); onReload(); }} className="nav-link">
            Reload
          </button>
          <button onClick={e => { e.currentTarget.blur(); onToggleSound(); }} className="nav-link sound-toggle">
            Sound: {soundEnabled ? 'On\u00A0' : 'Off'}
          </button>
          <button onClick={e => { e.currentTarget.blur(); onToggleDifficulty(); }} className="nav-link difficulty-toggle">
            Level: {difficulty}
          </button>
          <a
            className="nav-link"
            href="https://github.com/dcpedit/typocalypsestorm"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
} 