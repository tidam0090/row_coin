import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import type { AccessRequest, PaymentMethodConfig, WalletHistoryRow } from '../types';

type WalletMode = 'deposit' | 'withdraw' | null;
type DepositMethod = 'cashapp' | 'crypto' | 'chime';

export default function RequestStatus() {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AccessRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const [walletMode, setWalletMode] = useState<WalletMode>(null);
  const [depositAmount, setDepositAmount] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('cashapp');
  const [withdrawMethod, setWithdrawMethod] = useState('chime');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletHistory, setWalletHistory] = useState<WalletHistoryRow[]>([]);
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawTag, setWithdrawTag] = useState('');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceReady, setInvoiceReady] = useState(false);
  const [invoiceCode, setInvoiceCode] = useState('star7411');
  const [txid, setTxid] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [chimeNoteCode, setChimeNoteCode] = useState('');
  const requestTimer = useRef<number | null>(null);
  const walletTimer = useRef<number | null>(null);
  const paymentMethodsTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getPaymentMethods()
      .then((methods) => {
        if (!cancelled) setPaymentMethods(methods);
      })
      .catch(() => {
        if (!cancelled) setPaymentMethods([]);
      });

    const interval = window.setInterval(() => {
      if (cancelled) return;
      api.getPaymentMethods()
        .then((methods) => {
          if (!cancelled) setPaymentMethods(methods);
        })
        .catch(() => {
          if (!cancelled) setPaymentMethods([]);
        });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!gameSlug) return;
    let cancelled = false;
    let currentGameId: string | null = null;

    async function loadWalletHistory(gameId: string) {
      try {
        currentGameId = gameId;
        const history = await api.getMyWalletRequests(gameId);
        if (!cancelled) {
          setWalletHistory(history);
          const total = history.reduce((sum, item) => {
            if (item.type === 'deposit' && item.status === 'approved') return sum + Number(item.amount);
            if (item.type === 'withdrawal' && item.status === 'approved') return sum - Number(item.amount);
            return sum;
          }, 0);
          setWalletBalance(total);
        }
      } catch {
        if (!cancelled) {
          setWalletHistory([]);
          setWalletBalance(0);
        }
      }
    }

    async function poll() {
      try {
        const rec = await api.getRequestByGameSlug(gameSlug as string);
        if (cancelled) return;
        setRecord(rec);
        await loadWalletHistory(rec.game_id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load request');
      }
    }

    const handleVisibility = () => {
      if (!document.hidden) {
        void poll();
        if (currentGameId) {
          void loadWalletHistory(currentGameId);
        }
      }
    };

    void poll();

    if (requestTimer.current) window.clearInterval(requestTimer.current);
    if (walletTimer.current) window.clearInterval(walletTimer.current);

    requestTimer.current = window.setInterval(() => {
      void poll();
    }, 3000);

    walletTimer.current = window.setInterval(() => {
      if (currentGameId) {
        void loadWalletHistory(currentGameId);
      }
    }, 3000);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (requestTimer.current) window.clearInterval(requestTimer.current);
      if (walletTimer.current) window.clearInterval(walletTimer.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [gameSlug]);

  function copy(text: string, which: 'username' | 'password') {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(which);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => alert('Copy failed — select and copy manually: ' + text));
  }

  function closeWalletModal() {
    setWalletMode(null);
    setIsCreatingInvoice(false);
    setInvoiceReady(false);
    setTxid('');
  }

  function resetInvoiceCode() {
    setInvoiceCode(`star${Math.floor(Math.random() * 9000 + 1000)}`);
  }

  function generateChimeNoteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setChimeNoteCode(code);
  }

  function beginDepositFlow() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid deposit amount.');
      return;
    }

    if (depositMethod === 'cashapp') {
      setIsCreatingInvoice(true);
      resetInvoiceCode();
      window.setTimeout(() => {
        setIsCreatingInvoice(false);
        setInvoiceReady(true);
      }, 900);
      return;
    }

    if (depositMethod === 'chime') {
      generateChimeNoteCode();
    }

    setIsCreatingInvoice(false);
    setInvoiceReady(true);
  }

  async function confirmDeposit() {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid deposit amount.');
      return;
    }

    if (depositMethod === 'crypto' && !txid.trim()) {
      alert('Paste your TXID before confirming.');
      return;
    }

    const paymentDetails: Record<string, unknown> = {};
    if (depositMethod === 'cashapp') {
      paymentDetails.invoiceCode = invoiceCode;
    }
    if (depositMethod === 'crypto') {
      paymentDetails.txid = txid.trim();
    }
    if (depositMethod === 'chime') {
      paymentDetails.noteCode = chimeNoteCode || selectedDepositMethod?.note_value;
    }

    try {
      const response = await api.createWalletRequest({
        gameId: record!.game_id,
        type: 'deposit',
        amount,
        paymentMethod: depositMethod,
        details: paymentDetails,
      });

      setWalletHistory((prev) => [
        {
          id: response.id,
          type: 'deposit',
          amount: String(amount),
          payment_method: depositMethod,
          details: paymentDetails,
          admin_note: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (record?.game_id) {
        void api.getMyWalletRequests(record.game_id)
          .then((history) => {
            setWalletHistory(history);
            const total = history.reduce((sum, item) => {
              if (item.type === 'deposit' && item.status === 'approved') return sum + Number(item.amount);
              if (item.type === 'withdrawal' && item.status === 'approved') return sum - Number(item.amount);
              return sum;
            }, 0);
            setWalletBalance(total);
          })
          .catch(() => undefined);
      }

      closeWalletModal();
      alert('Deposit request created. An admin will review it.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create deposit request');
    }
  }

  async function confirmWithdraw() {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid withdrawal amount.');
      return;
    }

    if (!withdrawName || !withdrawTag || !withdrawNumber) {
      alert('Please fill in all withdrawal fields.');
      return;
    }

    try {
      const response = await api.createWalletRequest({
        gameId: record!.game_id,
        type: 'withdrawal',
        amount,
        paymentMethod: withdrawMethod,
        details: {
          name: withdrawName,
          tag: withdrawTag,
          number: withdrawNumber,
        },
      });

      setWalletHistory((prev) => [
        {
          id: response.id,
          type: 'withdrawal',
          amount: String(amount),
          payment_method: withdrawMethod,
          details: {
            name: withdrawName,
            tag: withdrawTag,
            number: withdrawNumber,
          },
          admin_note: null,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (record?.game_id) {
        void api.getMyWalletRequests(record.game_id)
          .then((history) => {
            setWalletHistory(history);
            const total = history.reduce((sum, item) => {
              if (item.type === 'deposit' && item.status === 'approved') return sum + Number(item.amount);
              if (item.type === 'withdrawal' && item.status === 'approved') return sum - Number(item.amount);
              return sum;
            }, 0);
            setWalletBalance(total);
          })
          .catch(() => undefined);
      }

      closeWalletModal();
      alert('Withdrawal request created. An admin will review it.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not create withdrawal request');
    }
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

  const selectedDepositMethod = paymentMethods.find((method) => method.code === depositMethod) || null;
  const cashAppMethod = paymentMethods.find((method) => method.code === 'cashapp') || null;
  const paymentTitle = depositMethod === 'cashapp'
    ? cashAppMethod?.title || 'Cash App'
    : selectedDepositMethod?.title || (depositMethod === 'crypto' ? 'Bitcoin (BTC)' : 'Chime');
  const paymentDescription = depositMethod === 'cashapp'
    ? cashAppMethod?.description || 'Pay using your Cash App'
    : selectedDepositMethod?.description || '';

  return (
    <div className="request-page">
      <div className="request-panel">
        <div className="request-header">
          <div className="request-heading">
            <div className="request-icon">{record.game_icon}</div>
            <div>
              <div className="request-name">{record.game_title} Panel</div>
              <div className="request-sub">Deposits · Withdrawals · Game access</div>
              <div className={`request-status-chip ${ready ? 'ready' : 'pending'}`}>Status: {ready ? 'Ready' : 'Pending'}</div>
            </div>
          </div>
          <div className="request-header-actions">
            <button className="btn btn-secondary request-back" onClick={() => navigate('/')}>Back to lobby</button>
            {downloadUrl ? (
              <a className="btn btn-primary request-download" href={downloadUrl} target="_blank" rel="noreferrer">
                Play now
              </a>
            ) : null}
          </div>
        </div>

        {!ready ? (
          <>
            <div className="request-notice">You don't have a {record.game_title} account yet. Request one below.</div>

            <div className="request-action-row">
              <button className="btn btn-primary request-action" disabled>Requesting…</button>
            </div>

            <div className="request-state-box">
              <div className="request-state-label">Status</div>
              <div className="request-state-value">Provisioning — an admin is generating your login automatically</div>
            </div>
          </>
        ) : null}
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
            <div className="wallet-balance-row">
              <span>Wallet balance</span>
              <strong>${walletBalance.toFixed(2)}</strong>
            </div>
            <div className="wallet-grid">
              <div className="wallet-card wallet-deposit">
                <div className="wallet-card-title">Deposit</div>
                <div className="wallet-card-copy">Add funds to your {record.game_title} account.</div>
                <button className="btn btn-tertiary" onClick={() => setWalletMode('deposit')}>
                  Deposit
                </button>
              </div>
              <div className="wallet-card wallet-withdraw">
                <div className="wallet-card-title">Withdraw</div>
                <div className="wallet-card-copy">Request payout to your preferred tag.</div>
                <button className="btn btn-tertiary" onClick={() => setWalletMode('withdraw')}>
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          <div className="request-details-card request-transactions-card">
            <div className="request-details-title">Recent transactions</div>
            <div className="transactions-table-wrap">
              {walletHistory.length === 0 ? (
                <div className="empty transaction-empty">no transactions yet</div>
              ) : (
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Amount in game</th>
                      <th>Status</th>
                      <th>Note</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletHistory.slice(0, 20).map((item, index) => {
                      const amount = Number(item.amount);
                      const status = item.status.toUpperCase();
                      const noteText = item.admin_note || '';

                      return (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>
                            <span className={`txn-pill ${item.type === 'deposit' ? 'deposit' : 'withdraw'}`}>
                              {item.type === 'deposit' ? 'DEPOSIT' : 'WITHDRAW'}
                            </span>
                          </td>
                          <td>{`$${amount.toFixed(2)}`}</td>
                          <td>—</td>
                          <td>
                            <span className={`txn-status ${item.status}`}>
                              {status}
                            </span>
                          </td>
                          <td>{noteText}</td>
                          <td>{new Date(item.created_at).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {walletMode ? (
        <div className="wallet-modal-backdrop" onClick={closeWalletModal}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            {walletMode === 'deposit' && (
              <>
                {!isCreatingInvoice && !invoiceReady ? (
                  <>
                    <div className="wallet-modal-header">
                      <div className="wallet-modal-title">Choose payment method</div>
                      <button className="wallet-close" onClick={closeWalletModal} aria-label="Close">
                        ×
                      </button>
                    </div>

                    <div className="wallet-deposit-amount">Deposit amount</div>
                    <div className="wallet-amount-row">${Number(depositAmount).toFixed(2)}</div>

                    <div className="wallet-payment-list">
                      {[
                        { id: 'cashapp', label: 'Cash App', desc: 'Pay using your Cash App', icon: '$' },
                        { id: 'crypto', label: 'Crypto', desc: 'Pay using USDT / crypto wallet', icon: '◈' },
                        { id: 'chime', label: 'Chime', desc: 'Fast bank transfer', icon: '◌' },
                      ].map((option) => (
                        <label key={option.id} className={`payment-option ${depositMethod === option.id ? 'selected' : ''}`}>
                          <div className="payment-main">
                            <span className="payment-icon">{option.icon}</span>
                            <div>
                              <div className="payment-label">{option.label}</div>
                              <div className="payment-desc">{option.desc}</div>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="depositMethod"
                            checked={depositMethod === option.id}
                            onChange={() => {
                              setDepositMethod(option.id as DepositMethod);
                              setInvoiceReady(false);
                              setIsCreatingInvoice(false);
                              setTxid('');
                              if (option.id === 'chime') {
                                generateChimeNoteCode();
                              }
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    <div className="wallet-input-wrap">
                      <label htmlFor="deposit-amount">Amount</label>
                      <input
                        id="deposit-amount"
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </div>

                    <button className="btn btn-gold wallet-submit-btn" onClick={beginDepositFlow}>
                      Continue with {depositMethod === 'cashapp' ? 'Cash App' : depositMethod === 'crypto' ? 'Crypto' : 'Chime'}
                    </button>
                  </>
                ) : null}

                {isCreatingInvoice ? (
                  <div className="wallet-invoice-loader">
                    <div className="wallet-spinner" />
                    <div className="wallet-modal-title">Creating invoice</div>
                    <p>Please wait while we prepare your Cash App payment invoice. Do not refresh or press back.</p>
                  </div>
                ) : null}

                {invoiceReady ? (
                  depositMethod === 'cashapp' ? (
                    <>
                      <div className="wallet-modal-header">
                        <div>
                          <div className="wallet-modal-title">Pay with {paymentTitle}</div>
                          {paymentDescription ? <div className="wallet-payment-subtitle">{paymentDescription}</div> : null}
                        </div>
                        <button className="wallet-close" onClick={closeWalletModal} aria-label="Close">
                          ×
                        </button>
                      </div>

                      <div className="wallet-invoice-box">
                        <div className="wallet-invoice-label">Game</div>
                        <div className="wallet-invoice-value">{record.game_title}</div>
                        <div className="wallet-invoice-label">Username</div>
                        <div className="wallet-invoice-value">{record.username || user?.username || 'N/A'}</div>
                        <div className="wallet-invoice-label">Amount USD</div>
                        <div className="wallet-invoice-value amount-value">${Number(depositAmount).toFixed(2)}</div>
                        <div className="wallet-invoice-label">Status</div>
                        <div className="wallet-invoice-value status-pending">UNPAID</div>
                      </div>

                      <div className="wallet-copy-box">
                        <label>{cashAppMethod?.input_label || 'Unique Code / Memo'}</label>
                        <div className="wallet-code">{invoiceCode}</div>
                      </div>

                      <button className="btn btn-secondary wallet-copy-btn" onClick={() => navigator.clipboard.writeText(invoiceCode)}>
                        Copy Invoice
                      </button>

                      <div className="wallet-payment-status">Waiting for payment confirmation...</div>

                      <div className="wallet-actions-row">
                        <button className="btn btn-danger" onClick={closeWalletModal}>Cancel</button>
                        <button className="btn btn-success" onClick={confirmDeposit}>✓ I Paid</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="wallet-modal-header">
                        <div>
                          <div className="wallet-modal-title">Pay with {paymentTitle}</div>
                          {paymentDescription ? <div className="wallet-payment-subtitle">{paymentDescription}</div> : null}
                        </div>
                        <button className="wallet-close" onClick={closeWalletModal} aria-label="Close">
                          ×
                        </button>
                      </div>

                      <div className="payment-details-shell">
                        <div className="payment-details-grid">
                          {selectedDepositMethod?.primary_label ? (
                            <div className="payment-detail-box">
                              <span>{selectedDepositMethod.primary_label}</span>
                              <strong>{selectedDepositMethod.primary_value}</strong>
                            </div>
                          ) : null}
                          {selectedDepositMethod?.secondary_label ? (
                            <div className="payment-detail-box">
                              <span>{selectedDepositMethod.secondary_label}</span>
                              <strong>{selectedDepositMethod.secondary_value}</strong>
                            </div>
                          ) : null}
                          {depositMethod !== 'crypto' && selectedDepositMethod?.note_label ? (
                            <div className="payment-detail-box payment-detail-box-accent">
                              <span>{selectedDepositMethod.note_label}</span>
                              <strong>
                                {depositMethod === 'chime'
                                  ? chimeNoteCode || selectedDepositMethod.note_value
                                  : selectedDepositMethod.note_value}
                              </strong>
                            </div>
                          ) : null}
                        </div>

                        {depositMethod === 'crypto' && selectedDepositMethod?.note_label ? (
                          <div className="wallet-input-wrap">
                            <label htmlFor="deposit-reference">{selectedDepositMethod.note_label}</label>
                            <input
                              id="deposit-reference"
                              type="text"
                              placeholder={selectedDepositMethod.note_value || 'Enter the reference here'}
                              value={txid}
                              onChange={(e) => setTxid(e.target.value)}
                            />
                          </div>
                        ) : null}

                        <div className="payment-qr-frame">
                          {selectedDepositMethod?.qr_code_url ? (
                            <img src={selectedDepositMethod.qr_code_url} alt={`${paymentTitle} QR code`} />
                          ) : null}
                        </div>
                      </div>

                      <div className="wallet-payment-status">Waiting for payment confirmation...</div>

                      <div className="wallet-actions-row">
                        <button className="btn btn-danger" onClick={closeWalletModal}>Cancel</button>
                        <button className="btn btn-success" onClick={confirmDeposit}>✓ I Have Paid</button>
                      </div>
                    </>
                  )
                ) : null}
              </>
            )}

            {walletMode === 'withdraw' ? (
              <>
                <div className="wallet-modal-header">
                  <div className="wallet-modal-title">Withdraw details</div>
                  <button className="wallet-close" onClick={closeWalletModal} aria-label="Close">
                    ×
                  </button>
                </div>

                <div className="wallet-amount-row">${Number(withdrawAmount).toFixed(2)}</div>

                <div className="wallet-section-title">Choose payment method</div>
                <label className={`withdraw-option ${withdrawMethod === 'chime' ? 'selected' : ''}`}>
                  <span>Chime</span>
                  <span>Withdraw to your Chime tag</span>
                  <input type="radio" name="withdrawMethod" checked={withdrawMethod === 'chime'} onChange={() => setWithdrawMethod('chime')} />
                </label>

                <div className="wallet-input-wrap">
                  <label htmlFor="withdraw-name">Name on Tag</label>
                  <input id="withdraw-name" type="text" placeholder="e.g. John Doe" value={withdrawName} onChange={(e) => setWithdrawName(e.target.value)} />
                </div>

                <div className="wallet-input-wrap">
                  <label htmlFor="withdraw-tag">Tag</label>
                  <input id="withdraw-tag" type="text" placeholder="e.g. $john777 or @john" value={withdrawTag} onChange={(e) => setWithdrawTag(e.target.value)} />
                </div>

                <div className="wallet-input-wrap">
                  <label htmlFor="withdraw-number">Linked number on Tag</label>
                  <input id="withdraw-number" type="text" placeholder="e.g. +1 555 123 4567" value={withdrawNumber} onChange={(e) => setWithdrawNumber(e.target.value)} />
                </div>

                <div className="wallet-input-wrap">
                  <label htmlFor="withdraw-amount">Withdrawal amount</label>
                  <input
                    id="withdraw-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>

                <button className="btn btn-danger wallet-submit-btn" onClick={confirmWithdraw}>Confirm withdraw</button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
