import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const data = await api.forgotPassword(email);
      setSuccess(data.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process request');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="hero-copy-panel">
          <div className="eyebrow">ACCOUNT RECOVERY</div>
          <h1>Reset your password</h1>
          <p>Enter your email and we'll send you a link to reset your password.</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-header">
          <div className="brand-mark">CR</div>
          <div>
            <div className="brand-name">COIN ROW</div>
            <div className="brand-sub">free-play arcade</div>
          </div>
        </div>

        <h2 className="auth-title">Forgot password</h2>
        <p className="auth-sub">Enter the email associated with your account.</p>

        {success ? (
          <div className="auth-success">
            <p>{success}</p>
            <Link to="/login" className="btn btn-primary auth-submit">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Remember your password? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
