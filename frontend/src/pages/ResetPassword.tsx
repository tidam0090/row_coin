import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      const data = await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-hero">
          <div className="hero-copy-panel">
            <div className="eyebrow">ACCOUNT RECOVERY</div>
            <h1>Request a new reset link</h1>
            <p>For your account's security, reset links are valid for a limited time.</p>
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
          <h2 className="auth-title">Link expired</h2>
          <div className="form-error">Invalid or missing reset token</div>
          <Link to="/forgot-password" className="btn btn-primary auth-submit">Request new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="hero-copy-panel">
          <div className="eyebrow">ACCOUNT RECOVERY</div>
          <h1>Set a new password</h1>
          <p>Create a strong password for your account.</p>
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

        <h2 className="auth-title">Reset password</h2>
        <p className="auth-sub">Enter your new password below.</p>

        {success ? (
          <div className="auth-success">
            <p>Password reset successful! Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
              {busy ? 'Resetting…' : 'Reset password'}
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
