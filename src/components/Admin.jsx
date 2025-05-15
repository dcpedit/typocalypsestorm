import React, { useEffect, useState } from 'react';
import { getGameScoresAdmin } from '../utils/gameUtils';
import '../styles/Admin.css';

export default function Admin() {
  const [secret, setSecret] = useState(() => localStorage.getItem('adminSecretKey') || '');
  const [input, setInput] = useState('');
  const [scores, setScores] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchScores = async (pageToken = null, append = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await getGameScoresAdmin({ apiSecretKey: secret, pageSize: 50, pageToken });
      if (append) {
        setScores(prev => [...prev, ...(data.scores || [])]);
      } else {
        setScores(data.scores || []);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError('Failed to fetch scores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!secret) return;
    fetchScores();
    // eslint-disable-next-line
  }, [secret]);

  const handleSubmit = e => {
    e.preventDefault();
    if (input.trim()) {
      localStorage.setItem('adminSecretKey', input.trim());
      setSecret(input.trim());
    }
  };

  if (!secret) {
    return (
      <div className="admin-form-container">
        <h2>Admin Access</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter secret key"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="admin-input"
          />
          <br />
          <button type="submit" className="admin-submit-btn">Submit</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h2>Admin High Scores</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="admin-error">{error}</p>}
      {scores && Array.isArray(scores) && scores.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Score</th>
              <th>WPM</th>
              <th>Accuracy</th>
              <th>Difficulty</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(score => (
              <tr key={score.id}>
                <td>{score.name}</td>
                <td>{score.score}</td>
                <td>{score.wpm}</td>
                <td>{score.accuracy}</td>
                <td>{score.difficulty}</td>
                <td>{score.createdDts
                  ? new Date(
                      score.createdDts._seconds * 1000 +
                      Math.floor((score.createdDts._nanoseconds || 0) / 1e6)
                    ).toLocaleDateString()
                  : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {nextPageToken && !loading && (
        <button className="admin-load-more-btn" onClick={() => fetchScores(nextPageToken, true)}>
          Load More
        </button>
      )}
    </div>
  );
} 