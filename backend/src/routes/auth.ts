import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { signToken } from '../auth';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
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
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3) RETURNING id, email, username`,
      [email.toLowerCase(), username, passwordHash]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, username: user.username });
    res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

router.post('/login', async (req, res) => {
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
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
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
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

export default router;
