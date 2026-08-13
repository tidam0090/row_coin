import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import type { Game } from '../types';

export default function Lobby() {
  const { user, token, logout } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getGames()
      .then(setGames)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function requestAccess(game: Game) {
    if (!token) return;
    setBusyGameId(game.id);
    try {
      const existing = await api.getMyRequestForGame(token, game.id);
      if (existing) {
        navigate(`/request/${existing.id}`);
        return;
      }
      const { id } = await api.createRequest(token, game.id);
      navigate(`/request/${id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create request');
    } finally {
      setBusyGameId(null);
    }
  }

  return (
    <div className="lobby-page">
      <header className="topbar">
        <div className="brand-panel">
          <div className="brand-mark">CR</div>
          <div>
            <div className="brand-name">Jackpot Entry</div>
            <div className="brand-sub">Your free-play arcade vault</div>
          </div>
        </div>
        <div className="topbar-actions">
          {user && <div className="user-pill">{user.username.toUpperCase()}</div>}
          <button className="btn btn-secondary nav-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="hero-banner">
        <div className="hero-copy">
          <div className="eyebrow">WELCOME TO</div>
          <h1>Coin Row Gaming</h1>
          <p>Play premium free arcade titles with instant access and no deposits required.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Explore games
            </button>
            <button className="btn btn-secondary" onClick={() => alert('Coming soon!')}>
              Refer & Earn
            </button>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-title">$3 Free Play on Signup</div>
          <div className="hero-panel-sub">Choose a game and start playing instantly.</div>
          <div className="hero-stat-row">
            <div>
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Secure</div>
            </div>
            <div>
              <div className="hero-stat-value">24/7</div>
              <div className="hero-stat-label">Support</div>
            </div>
            <div>
              <div className="hero-stat-value">Fast</div>
              <div className="hero-stat-label">Payouts</div>
            </div>
          </div>
        </div>
      </section>

      <section className="game-section">
        <div className="section-header">
          <div>
            <div className="eyebrow">OUR GAMES</div>
            <h2>Tap a title to request access</h2>
          </div>
          <div className="game-count">{games.length} titles live</div>
        </div>

        {loading && <div className="empty">loading games…</div>}
        {error && <div className="empty">{error}</div>}

        <div className="game-grid">
          {games.map((g) => (
            <div className="game-card" key={g.id} onClick={() => requestAccess(g)}>
              <div className="game-card-icon">{g.icon}</div>
              <div className="game-card-meta">{g.genre}</div>
              <div className="game-card-title">{g.title}</div>
              <div className="game-card-desc">{g.description}</div>
              <button className="btn btn-tertiary" disabled={busyGameId === g.id}>
                {busyGameId === g.id ? 'Requesting…' : 'Request access'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="info-strip">
        Free-play only — no purchases, no cash value. Access is granted through staff-approved game tickets.
      </div>
    </div>
  );
}
