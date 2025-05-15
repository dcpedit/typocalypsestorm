import React, { useState, useEffect } from 'react';
import TypingGame from './components/TypingGame';
import Header from './components/Header';
import Admin from './components/Admin';

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('soundEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [difficulty, setDifficulty] = useState(() => {
    const stored = localStorage.getItem('difficulty');
    return stored === null ? 'Easy' : stored;
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      localStorage.setItem('soundEnabled', !prev);
      return !prev;
    });
  };
  const toggleDifficulty = () => {
    setDifficulty(prev => {
      const newDiff = prev === 'Easy' ? 'Hard' : 'Easy';
      localStorage.setItem('difficulty', newDiff);
      return newDiff;
    });
  };
  const handleReload = () => setReloadKey(k => k + 1);

  return (
    <div className="layout">
      {hash === '#admin' ? (
        <Admin />
      ) : (
        <>
          <Header soundEnabled={soundEnabled} onToggleSound={toggleSound} difficulty={difficulty} onToggleDifficulty={toggleDifficulty} onReload={handleReload} />
          <main>
            <TypingGame soundEnabled={soundEnabled} difficulty={difficulty} reloadKey={reloadKey} />
          </main>
        </>
      )}
    </div>
  );
}