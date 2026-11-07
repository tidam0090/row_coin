import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { pool } from '../db';
import { signToken } from '../auth';
import { requireAuth } from '../middleware/requireAuth';
import { sendPasswordResetEmail } from '../email';
import { resolveUserRoleByEmail } from '../userRoles';

const router = Router();

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // The frontend may run on localhost while the API is hosted on Render.
  // Cross-site fetches need SameSite=None, and browsers require Secure with it.
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
} as const;

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublicUser(user: { id: string; email: string; username: string }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: resolveUserRoleByEmail(user.email),
  };
}

router.post('/register', authAttemptLimiter, async (req, res) => {
  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password?: string;
  };

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: 'This email or username is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3) RETURNING id, email, username`,
      [email.toLowerCase(), username, passwordHash]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });
    
    // Set httpOnly cookie (more secure than localStorage)
    res.cookie('token', token, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

router.post('/login', authAttemptLimiter, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const token = signToken({ userId: user.id, username: user.username });
    
    // Set httpOnly cookie (more secure than localStorage)
    res.cookie('token', token, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not sign in' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [
      req.user!.userId,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

router.post('/logout', (_req, res) => {
  // Clear the httpOnly cookie
  res.clearCookie('token', authCookieOptions);
  res.json({ success: true });
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests, please try again later.',
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts, please try again later.',
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
      [rawToken, expiresAt.toISOString(), user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

    try {
      console.log(`[PASSWORD RESET] Attempting to send email to ${email}...`);
      const info = await sendPasswordResetEmail(email, resetLink);
      console.log(`[PASSWORD RESET] Success. Reset link: ${resetLink}`);
      console.log(`[PASSWORD RESET] Nodemailer info:`, {
        messageId: info.messageId,
        response: info.response,
        envelopeFrom: info.envelope.from,
        envelopeTo: info.envelope.to,
      });
    } catch (emailErr) {
      console.error('[PASSWORD RESET] Failed to send email:', emailErr);
      console.error('[PASSWORD RESET] Check SMTP settings in .env file');
      console.error('[PASSWORD RESET] Reset link (fallback):', resetLink);
    }

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not process password reset request' });
  }
});

router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const result = await pool.query(
      'SELECT id, reset_token_expires_at FROM users WHERE reset_token = $1',
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = result.rows[0];
    const expiresAt = new Date(user.reset_token_expires_at);

    if (expiresAt < new Date()) {
      await pool.query('UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE id = $1', [user.id]);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

export default router;
