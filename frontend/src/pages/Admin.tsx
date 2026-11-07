import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import type { AdminRequestRow, PaymentMethodConfig, WalletRequestRow } from '../types';

type AccessTab = 'pending' | 'fulfilled';
type WalletTab = 'pending' | 'approved' | 'cancelled';
type AdminTab = 'payment-methods' | 'wallet' | 'access';

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accessTab, setAccessTab] = useState<AccessTab>('pending');
  const [walletTab, setWalletTab] = useState<WalletTab>('pending');
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [walletRows, setWalletRows] = useState<WalletRequestRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { username: string; password: string }>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, Partial<PaymentMethodConfig>>>({});
  const [walletNotes, setWalletNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [savingMethods, setSavingMethods] = useState<Set<string>>(new Set());
  const [adminTab, setAdminTab] = useState<AdminTab>('payment-methods');

  async function loadPaymentMethods() {
    try {
      const data = await api.adminListPaymentMethods();
      setPaymentMethods(data);
      setPaymentDrafts(
        data.reduce<Record<string, Partial<PaymentMethodConfig>>>((acc, method) => {
          acc[method.code] = { ...method };
          return acc;
        }, {})
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payment methods');
    }
  }

  async function loadRows(status: AccessTab) {
    try {
      const data = await api.adminListRequests(status);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests');
    }
  }

  async function loadWalletRows(status: WalletTab) {
    try {
      const data = await api.adminListWalletRequests(status);
      setWalletRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load wallet requests');
    }
  }

  useEffect(() => {
    async function loadInitial() {
      try {
        await api.adminCheck();
        await Promise.all([loadRows(accessTab), loadWalletRows(walletTab), loadPaymentMethods()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not verify admin access');
      }
    }

    loadInitial();
  }, []);

  useEffect(() => {
    loadRows(accessTab);
  }, [accessTab]);

  useEffect(() => {
    loadWalletRows(walletTab);
  }, [walletTab]);

  useEffect(() => {
    const accessTimer = window.setInterval(() => {
      loadRows(accessTab);
    }, 3000);
    const walletTimer = window.setInterval(() => {
      loadWalletRows(walletTab);
    }, 3000);
    return () => {
      window.clearInterval(accessTimer);
      window.clearInterval(walletTimer);
    };
  }, [accessTab, walletTab]);

  async function submit(id: string) {
    if (submitting.has(id)) return;

    const draft = drafts[id];
    if (!draft?.username || !draft?.password) {
      alert('Enter both a username and password to issue.');
      return;
    }

    setSubmitting(new Set([...submitting, id]));
    try {
      await api.adminFulfill(id, draft.username, draft.password);
      await loadRows(accessTab);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not send credentials');
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleWalletAction(id: string, action: 'approve' | 'cancel') {
    if (submitting.has(id)) return;

    setSubmitting(new Set([...submitting, id]));
    try {
      const note = walletNotes[id]?.trim() || undefined;
      if (action === 'approve') {
        await api.adminApproveWalletRequest(id, note);
      } else {
        await api.adminCancelWalletRequest(id, note);
      }
      setWalletNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await loadWalletRows(walletTab);
    } catch (e) {
      alert(e instanceof Error ? e.message : `Could not ${action} wallet request`);
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function savePaymentMethod(code: string) {
    if (savingMethods.has(code)) return;

    const draft = paymentDrafts[code];
    if (!draft) return;

    setSavingMethods(new Set([...savingMethods, code]));
    try {
      const updated = await api.adminUpdatePaymentMethod(code, draft);
      setPaymentMethods((current) => current.map((method) => (method.code === code ? updated : method)));
      setPaymentDrafts((current) => ({ ...current, [code]: { ...updated } }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not update payment method');
    } finally {
      setSavingMethods((current) => {
        const next = new Set(current);
        next.delete(code);
        return next;
      });
    }
  }

  function updatePaymentDraft(code: string, field: keyof PaymentMethodConfig, value: string | number | boolean) {
    setPaymentDrafts((current) => ({
      ...current,
      [code]: {
        ...current[code],
        [field]: value,
      },
    }));
  }

  async function handlePaymentQrUpload(code: string, file: File | null) {
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read image file'));
      reader.readAsDataURL(file);
    });

    updatePaymentDraft(code, 'qr_code_url', dataUrl);
  }

  function formatWalletDetails(details: Record<string, unknown>) {
    const entries = Object.entries(details || {});
    if (entries.length === 0) return '—';

    return (
      <div className="wallet-detail-list">
        {entries.map(([key, value]) => (
          <div key={key} className="wallet-detail-row">
            <span>{key}</span>
            <strong>{typeof value === 'string' || typeof value === 'number' ? String(value) : JSON.stringify(value)}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (!user) return null;

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
          <div className="user-pill">{user.username.toUpperCase()}</div>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Exit lobby</button>
        </div>
      </header>

      <div className="wrap admin-wrap">
        {error ? <div className="form-error">{error}</div> : null}

        <div className="tab-row admin-tab-row">
          <button className={`tab-btn ${adminTab === 'payment-methods' ? 'active' : ''}`} onClick={() => setAdminTab('payment-methods')}>
            Payment methods
          </button>
          <button className={`tab-btn ${adminTab === 'wallet' ? 'active' : ''}`} onClick={() => setAdminTab('wallet')}>
            Wallet requests
          </button>
          <button className={`tab-btn ${adminTab === 'access' ? 'active' : ''}`} onClick={() => setAdminTab('access')}>
            Account requests
          </button>
        </div>

        {adminTab === 'payment-methods' && (
          <div className="section-block payment-methods-section">
            <div className="section-head">
              <div className="section-title">Payment methods</div>
              <div className="section-sub">Edit the crypto and Chime details shown to players, including QR code images and note text.</div>
            </div>

            <div className="payment-methods-grid">
              {paymentMethods.map((method) => {
                const draft = paymentDrafts[method.code] || method;

                return (
                  <div className="ticket payment-method-card" key={method.code}>
                    <div className="ticket-top">
                      <div className="ticket-game">
                        {method.code.toUpperCase()}
                        <span className="ticket-meta">· {method.kind}</span>
                      </div>
                      <div className={`status-pill ${method.active ? 'active' : 'inactive'}`}>
                        {method.active ? 'active' : 'disabled'}
                      </div>
                    </div>

                    <div className="payment-method-fields">
                      <label>
                        <span>Title</span>
                        <input value={draft.title || ''} onChange={(e) => updatePaymentDraft(method.code, 'title', e.target.value)} />
                      </label>
                      <label>
                        <span>Description</span>
                        <input value={draft.description || ''} onChange={(e) => updatePaymentDraft(method.code, 'description', e.target.value)} />
                      </label>
                      <label>
                        <span>Primary label</span>
                        <input value={draft.primary_label || ''} onChange={(e) => updatePaymentDraft(method.code, 'primary_label', e.target.value)} />
                      </label>
                      <label>
                        <span>Primary value</span>
                        <input value={draft.primary_value || ''} onChange={(e) => updatePaymentDraft(method.code, 'primary_value', e.target.value)} />
                      </label>
                      <label>
                        <span>Secondary label</span>
                        <input value={draft.secondary_label || ''} onChange={(e) => updatePaymentDraft(method.code, 'secondary_label', e.target.value)} />
                      </label>
                      <label>
                        <span>Secondary value</span>
                        <input value={draft.secondary_value || ''} onChange={(e) => updatePaymentDraft(method.code, 'secondary_value', e.target.value)} />
                      </label>
                      <label>
                        <span>Note label</span>
                        <input value={draft.note_label || ''} onChange={(e) => updatePaymentDraft(method.code, 'note_label', e.target.value)} />
                      </label>
                      <label>
                        <span>Note value</span>
                        <input value={draft.note_value || ''} onChange={(e) => updatePaymentDraft(method.code, 'note_value', e.target.value)} />
                      </label>
                      <label>
                        <span>Input label</span>
                        <input value={draft.input_label || ''} onChange={(e) => updatePaymentDraft(method.code, 'input_label', e.target.value)} />
                      </label>
                      <label>
                        <span>Input placeholder</span>
                        <input value={draft.input_placeholder || ''} onChange={(e) => updatePaymentDraft(method.code, 'input_placeholder', e.target.value)} />
                      </label>
                      <label>
                        <span>QR code image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            void handlePaymentQrUpload(method.code, e.target.files?.[0] || null);
                          }}
                        />
                      </label>
                      <label>
                        <span>Warning text</span>
                        <input value={draft.warning_text || ''} onChange={(e) => updatePaymentDraft(method.code, 'warning_text', e.target.value)} />
                      </label>
                      <label>
                        <span>Sort order</span>
                        <input
                          type="number"
                          value={draft.sort_order ?? 0}
                          onChange={(e) => updatePaymentDraft(method.code, 'sort_order', Number(e.target.value))}
                        />
                      </label>
                      <label className="payment-active-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.active)}
                          onChange={(e) => updatePaymentDraft(method.code, 'active', e.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                    </div>

                    <div className="payment-method-actions">
                      <button className="btn btn-primary" onClick={() => savePaymentMethod(method.code)} disabled={savingMethods.has(method.code)}>
                        {savingMethods.has(method.code) ? 'Saving…' : 'Save method'}
                      </button>
                      {draft.qr_code_url ? <img className="payment-method-qr-preview" src={draft.qr_code_url} alt={`${method.code} QR preview`} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adminTab === 'wallet' && (
          <div className="section-block wallet-section">
            <div className="tab-row admin-tab-row">
              <button className={`tab-btn ${walletTab === 'pending' ? 'active' : ''}`} onClick={() => setWalletTab('pending')}>
                Wallet pending
              </button>
              <button className={`tab-btn ${walletTab === 'approved' ? 'active' : ''}`} onClick={() => setWalletTab('approved')}>
                Wallet approved
              </button>
              <button className={`tab-btn ${walletTab === 'cancelled' ? 'active' : ''}`} onClick={() => setWalletTab('cancelled')}>
                Wallet cancelled
              </button>
            </div>

            {walletRows.length === 0 && <div className="empty">no {walletTab} wallet requests</div>}

            <div className="admin-list">
              {walletRows.map((entry) => {
                const when = new Date(entry.created_at).toLocaleString();
                const requester = entry.requester_username
                  ? `${entry.requester_username} (${entry.requester_email})`
                  : 'unknown player';

                return (
                  <div className="ticket wallet-ticket" key={entry.id}>
                    <div className="ticket-top">
                      <div className="ticket-game">
                        {entry.game_title || 'Unknown game'}
                        <span className="ticket-meta">· {entry.type === 'deposit' ? 'Deposit' : 'Withdrawal'} · {entry.id.slice(0, 8).toUpperCase()} · {when}</span>
                        <div className="ticket-requester">requested by {requester}</div>
                      </div>
                      <div className="status-pill">{entry.status}</div>
                    </div>

                    <div className="wallet-request-body">
                      <div className="wallet-request-grid">
                        <div className="wallet-request-field">
                          <span className="wallet-request-label">Game</span>
                          <strong>{entry.game_title || 'Unknown game'}</strong>
                        </div>
                        <div className="wallet-request-field">
                          <span className="wallet-request-label">Amount</span>
                          <strong>${Number(entry.amount).toFixed(2)}</strong>
                        </div>
                        <div className="wallet-request-field">
                          <span className="wallet-request-label">Type</span>
                          <strong>{entry.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</strong>
                        </div>
                        <div className="wallet-request-field">
                          <span className="wallet-request-label">Method</span>
                          <strong>{entry.payment_method}</strong>
                        </div>
                      </div>

                      <div className="wallet-request-detail-block">
                        <span className="wallet-request-label">Details</span>
                        {formatWalletDetails(entry.details)}
                      </div>

                      <div className="wallet-request-detail-block">
                        <span className="wallet-request-label">Admin note</span>
                        {entry.status === 'pending' ? (
                          <textarea
                            className="wallet-note-input"
                            placeholder="Optional note or cancellation reason"
                            value={walletNotes[entry.id] || entry.admin_note || ''}
                            onChange={(e) => setWalletNotes((current) => ({ ...current, [entry.id]: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <div className="wallet-admin-note">{entry.admin_note || '—'}</div>
                        )}
                      </div>
                    </div>

                    {entry.status === 'pending' ? (
                      <div className="wallet-actions-row admin-wallet-actions">
                        <button className="btn btn-success" onClick={() => handleWalletAction(entry.id, 'approve')} disabled={submitting.has(entry.id)}>
                          {submitting.has(entry.id) ? 'Processing…' : 'Approve'}
                        </button>
                        <button className="btn btn-danger" onClick={() => handleWalletAction(entry.id, 'cancel')} disabled={submitting.has(entry.id)}>
                          {submitting.has(entry.id) ? 'Processing…' : 'Cancel'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adminTab === 'access' && (
          <div className="section-block">
            <div className="tab-row admin-tab-row">
              <button className={`tab-btn ${accessTab === 'pending' ? 'active' : ''}`} onClick={() => setAccessTab('pending')}>
                Pending
              </button>
              <button className={`tab-btn ${accessTab === 'fulfilled' ? 'active' : ''}`} onClick={() => setAccessTab('fulfilled')}>
                Completed
              </button>
            </div>

            {rows.length === 0 && <div className="empty">no {accessTab} requests</div>}

            <div className="admin-list">
              {rows.map((rec) => {
                const when = new Date(rec.created_at).toLocaleString();
                const requester = rec.requester_username
                  ? `${rec.requester_username} (${rec.requester_email})`
                  : 'unknown player';

                if (rec.status === 'fulfilled') {
                  return (
                    <div className="ticket ticket-complete" key={rec.id}>
                      <div className="ticket-complete-main">
                        <div className="ticket-complete-game">{rec.game_title}</div>
                        <div className="ticket-complete-meta">· {rec.id.slice(0, 8).toUpperCase()} · {when}</div>
                        <div className="ticket-requester">requested by {requester}</div>
                      </div>
                      <div className="ticket-complete-status">sent → {rec.username}</div>
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
                        disabled={submitting.has(rec.id)}
                      />
                      <input
                        type="text"
                        placeholder="password to issue"
                        value={draft.password}
                        onChange={(e) => setDrafts((d) => ({ ...d, [rec.id]: { ...draft, password: e.target.value } }))}
                        disabled={submitting.has(rec.id)}
                      />
                      <button className="btn btn-primary" onClick={() => submit(rec.id)} disabled={submitting.has(rec.id)}>
                        {submitting.has(rec.id) ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
