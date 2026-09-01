import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import type { Game } from '../types';

export default function Lobby() {
  const { user, logout } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [requestByGameSlug, setRequestByGameSlug] = useState<Record<string, { id: string; status: 'pending' | 'fulfilled' }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadGames() {
      try {
        const loadedGames = await api.getGames();
        setGames(loadedGames);
        const requests = await api.getMyRequests();
        setRequestByGameSlug(Object.fromEntries(requests.map((request) => [request.game_slug, { id: request.id, status: request.status }] as const)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load games');
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, []);

  async function requestAccess(game: Game) {
    setBusyGameId(game.id);
    try {
      const existing = requestByGameSlug[game.slug];
      if (existing) {
        navigate(`/games/${game.slug}`);
        return;
      }
      const { id } = await api.createRequest(game.id);
      navigate(`/games/${game.slug}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create request');
    } finally {
      setBusyGameId(null);
    }
  }

  return (
    <div className="lobby-page">
      <header className="topbar lobby-topbar">
        <div className="brand-panel">
          <div className="brand-mark">CR</div>
          <div>
            <div className="brand-name">Coin Row</div>
            <div className="brand-sub">Free-play arcade vault</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="lobby-header-btn" onClick={() => alert('Coming soon!')}>Refer &amp; earn</button>
          {user && <div className="user-pill">{user.username.toUpperCase()}</div>}
          <button className="btn btn-secondary nav-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="hero-banner lobby-hero-banner">
        <div className="hero-copy">
          <div className="eyebrow">NEW PLAYER BONUS</div>
          <h1>Get <span>$3 free play</span> on signup</h1>
          <p>Choose a premium arcade title, request access, and start playing when your ticket is approved.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' })}>
              Play now
            </button>
            <button className="btn btn-secondary" onClick={() => alert('Coming soon!')}>
              Refer &amp; Earn
            </button>
          </div>
        </div>
      </section>

      <section className="lobby-benefits" aria-label="Player benefits">
        <div><span>▣</span><strong>$3 free play</strong><small>On signup</small></div>
        <div><span>⚡</span><strong>Quick requests</strong><small>Track every ticket</small></div>
        <div><span>⌁</span><strong>Free-play only</strong><small>No cash value</small></div>
        <div><span>◉</span><strong>24/7 access</strong><small>Lobby always open</small></div>
      </section>

      <section className="lobby-referral">
        <div className="lobby-referral-icon">✦</div>
        <div>
          <strong>Share Coin Row with friends</strong>
          <p>Invite your crew to discover the arcade and keep the good times rolling.</p>
        </div>
        <button className="lobby-gold-link" onClick={() => alert('Coming soon!')}>Share now</button>
      </section>

      <section className="game-section" id="games">
        <div className="section-header">
          <div>
            <div className="eyebrow">OUR GAMES</div>
            <h2>Choose your game</h2>
          </div>
          <div className="game-count">{games.length} games live</div>
        </div>

        {loading && <div className="empty">loading games…</div>}
        {error && <div className="empty">{error}</div>}

        <div className="game-grid">
          {games.map((g) => (
            <div className="game-card" key={g.id} onClick={() => requestAccess(g)}>
              <div className="game-card-icon"><span>{g.icon}</span><em>Live</em></div>
              <div className="game-card-meta">{g.genre}</div>
              <div className="game-card-title">{g.title}</div>
              <button className="btn btn-tertiary" disabled={busyGameId === g.id}>
                {busyGameId === g.id
                  ? 'Loading…'
                  : requestByGameSlug[g.slug]?.status === 'fulfilled'
                    ? 'Access granted'
                    : requestByGameSlug[g.slug]?.status === 'pending'
                      ? 'Request pending'
                      : 'Request access'}
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
