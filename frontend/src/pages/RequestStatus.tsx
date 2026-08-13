import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import type { AccessRequest } from '../types';

export default function RequestStatus() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AccessRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;

    async function poll() {
      try {
        const rec = await api.getRequest(token as string, id as string);
        if (cancelled) return;
        setRecord(rec);
        if (rec.status === 'fulfilled' && timer.current) {
          window.clearInterval(timer.current);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load request');
      }
    }

    poll();
    timer.current = window.setInterval(poll, 2500);
    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [id, token]);

  function copy(text: string, which: 'username' | 'password') {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(which);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => alert('Copy failed — select and copy manually: ' + text));
  }

  if (error) {
    return (
      <div className="wrap">
        <div className="console">
          <div className="back-link" onClick={() => navigate('/')}>
            ← back to lobby
          </div>
          <div className="empty">{error}</div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="wrap">
        <div className="console">
          <div className="empty">loading…</div>
        </div>
      </div>
    );
  }

  const ready = record.status === 'fulfilled';
  const gameDownloadLinks: Record<string, string> = {
    juwa777: 'https://dl.juwa777.com/',
    gamevault: 'https://download.gamevault999.com/',
  };

  const downloadUrl =
    record.download_url ||
    gameDownloadLinks[record.game_slug] ||
    record.play_url;

  return (
    <div className="request-page">
      <div className="request-panel">
        <div className="request-header">
          <div className="request-heading">
            <div className="request-icon">{record.game_icon}</div>
            <div>
              <div className="request-name">{record.game_title} Panel</div>
              <div className="request-sub">Deposits · Withdrawals · Game access</div>
            </div>
          </div>
          {downloadUrl ? (
            <a className="btn btn-primary request-download" href={downloadUrl} target="_blank" rel="noreferrer">
              Download
            </a>
          ) : null}
        </div>

        <div className="request-notice">
          {ready
            ? `Your ${record.game_title} account is ready.`
            : `You don't have a ${record.game_title} account yet. Request one below.`}
        </div>

        <div className="request-action-row">
          <button className="btn btn-primary request-action" disabled>
            {ready ? 'Account ready' : 'Requesting…'}
          </button>
        </div>

        <div className="request-state-box">
          <div className="request-state-label">Status</div>
          <div className="request-state-value">
            {ready ? 'Ready' : 'Provisioning — an admin is generating your login automatically'}
          </div>
        </div>
      </div>

      {ready ? (
        <div className="request-details">
          <div className="request-details-card">
            <div className="request-details-title">Account details</div>
            <div className="request-info-grid">
              <div className="request-info-item">
                <div className="request-info-label">Email</div>
                <div className="request-info-value">{user?.email || 'N/A'}</div>
              </div>
              <div className="request-info-item">
                <div className="request-info-label">Username</div>
                <div className="request-info-value">{record.username || user?.username || 'N/A'}</div>
              </div>
              <div className="request-info-item">
                <div className="request-info-label">Password</div>
                <div className="request-info-value">{record.password}</div>
              </div>
            </div>
          </div>

          <div className="request-details-card request-rules-card">
            <div className="request-details-title">New cashout rules</div>
            <ul className="rules-list">
              <li>For deposits of $5 to $50: Minimum cashout = 5× deposited amount. Maximum cashout = $500.</li>
              <li>For deposits of $51 and up: Minimum cashout = 3× deposited amount. Maximum cashout = $1000.</li>
            </ul>
          </div>

          <div className="request-details-card request-wallet-card">
            <div className="request-details-title">Wallet actions</div>
            <div className="wallet-grid">
              <div className="wallet-card wallet-deposit">
                <div className="wallet-card-title">Deposit</div>
                <div className="wallet-card-copy">Add funds to your {record.game_title} account.</div>
                <button className="btn btn-tertiary" disabled>Deposit</button>
              </div>
              <div className="wallet-card wallet-withdraw">
                <div className="wallet-card-title">Withdraw</div>
                <div className="wallet-card-copy">Request payout to your preferred tag.</div>
                <button className="btn btn-tertiary" disabled>Withdraw</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
