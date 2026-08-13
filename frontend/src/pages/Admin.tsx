import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AdminRequestRow } from '../types';

type Tab = 'pending' | 'fulfilled';

export default function Admin() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { username: string; password: string }>>({});

  async function loadRows(k: string, status: Tab) {
    try {
      const data = await api.adminListRequests(k, status);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests');
    }
  }

  async function tryLogin(k: string) {
    setChecking(true);
    setError(null);
    try {
      await api.adminCheck(k);
      localStorage.setItem('coinrow_admin_key', k);
      setAuthed(true);
      await loadRows(k, tab);
    } catch {
      setError('Invalid admin key');
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    loadRows(key, tab);
    const t = window.setInterval(() => loadRows(key, tab), 4000);
    return () => window.clearInterval(t);
  }, [authed, key, tab]);

  async function submit(id: string) {
    const draft = drafts[id];
    if (!draft?.username || !draft?.password) {
      alert('Enter both a username and password to issue.');
      return;
    }
    try {
      await api.adminFulfill(key, id, draft.username, draft.password);
      await loadRows(key, tab);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not send credentials');
    }
  }

  if (!authed) {
    return (
      <div className="auth-page">
        <div className="auth-frame auth-sm">
          <div className="auth-header">
            <div className="brand-mark">CR</div>
            <div>
              <div className="brand-name">STAFF ACCESS</div>
              <div className="brand-sub">admin login</div>
            </div>
          </div>
          <p className="auth-note">Provide your admin secret to manage requests.</p>
          <div className="auth-form">
            <input
              type="password"
              placeholder="admin key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryLogin(key)}
            />
            <button className="btn btn-primary auth-submit" onClick={() => tryLogin(key)} disabled={checking}>
              {checking ? 'Checking…' : 'Enter'}
            </button>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-secondary auth-back" onClick={() => navigate('/')}>Back to lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="topbar admin-topbar">
        <div className="brand-panel">
          <div className="brand-mark">CR</div>
          <div>
            <div className="brand-name">Staff Panel</div>
            <div className="brand-sub">manage requests</div>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Exit lobby</button>
        </div>
      </header>

      <div className="wrap admin-wrap">
        <div className="tab-row admin-tab-row">
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending
          </button>
          <button className={`tab-btn ${tab === 'fulfilled' ? 'active' : ''}`} onClick={() => setTab('fulfilled')}>
            Completed
          </button>
        </div>

        {rows.length === 0 && <div className="empty">no {tab} requests</div>}

        <div className="admin-list">
          {rows.map((rec) => {
            const when = new Date(rec.created_at).toLocaleString();
            const requester = rec.requester_username
              ? `${rec.requester_username} (${rec.requester_email})`
              : 'unknown player';

            if (rec.status === 'fulfilled') {
              return (
                <div className="ticket" key={rec.id}>
                  <div className="ticket-top">
                    <div className="ticket-game">
                      {rec.game_title}
                      <span className="ticket-meta">· {rec.id.slice(0, 8).toUpperCase()} · {when}</span>
                      <div className="ticket-requester">requested by {requester}</div>
                    </div>
                    <div className="ticket-sent">sent → {rec.username}</div>
                  </div>
                </div>
              );
            }

            const draft = drafts[rec.id] || { username: '', password: '' };
            return (
              <div className="ticket" key={rec.id}>
                <div className="ticket-top">
                  <div className="ticket-game">
                    {rec.game_title}
                    <span className="ticket-meta">· {rec.id.slice(0, 8).toUpperCase()} · {when}</span>
                    <div className="ticket-requester">requested by {requester}</div>
                  </div>
                  <div className="status-pill">pending</div>
                </div>
                <div className="ticket-form">
                  <input
                    type="text"
                    placeholder="username to issue"
                    value={draft.username}
                    onChange={(e) => setDrafts((d) => ({ ...d, [rec.id]: { ...draft, username: e.target.value } }))}
                  />
                  <input
                    type="text"
                    placeholder="password to issue"
                    value={draft.password}
                    onChange={(e) => setDrafts((d) => ({ ...d, [rec.id]: { ...draft, password: e.target.value } }))}
                  />
                  <button className="btn btn-primary" onClick={() => submit(rec.id)}>Send</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
