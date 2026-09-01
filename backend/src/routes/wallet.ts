import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/payment-methods', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, kind, title, description, primary_label, primary_value, secondary_label, secondary_value,
              note_label, note_value, input_label, input_placeholder, qr_code_url, warning_text, sort_order, active,
              created_at, updated_at
       FROM payment_methods
       WHERE active = TRUE AND kind = 'deposit'
       ORDER BY sort_order ASC, code ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

router.post('/requests', requireAuth, async (req, res) => {
  const { type, amount, paymentMethod, details, gameId } = req.body as {
    type?: 'deposit' | 'withdrawal';
    amount?: number | string;
    paymentMethod?: string;
    details?: Record<string, unknown>;
    gameId?: string;
  };

  if (!type || !['deposit', 'withdrawal'].includes(type)) {
    return res.status(400).json({ error: 'type must be deposit or withdrawal' });
  }

  if (!gameId || typeof gameId !== 'string' || gameId.trim().length === 0) {
    return res.status(400).json({ error: 'gameId is required and must be a valid string' });
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  // Validate amount is not unreasonably large
  if (numericAmount > 1000000) {
    return res.status(400).json({ error: 'amount exceeds maximum limit' });
  }

  // Validate payment method
  if (!paymentMethod || typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
    return res.status(400).json({ error: 'paymentMethod is required' });
  }

  if (paymentMethod.length > 100) {
    return res.status(400).json({ error: 'paymentMethod is too long' });
  }

  // Validate details object (keep it reasonable size)
  if (details) {
    const detailsJson = JSON.stringify(details);
    if (detailsJson.length > 5000) {
      return res.status(400).json({ error: 'details object is too large' });
    }
  }

  try {
    const methodResult = await pool.query(
      `SELECT code FROM payment_methods
       WHERE code = $1 AND active = TRUE AND kind = 'deposit'`,
      [paymentMethod.trim()]
    );
    if (methodResult.rowCount === 0) {
      return res.status(400).json({ error: 'paymentMethod is not available' });
    }

    const game = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
    if (game.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const result = await pool.query(
      `INSERT INTO wallet_requests (user_id, game_id, type, amount, payment_method, details, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, type, amount, payment_method, status, created_at, admin_note`,
      [req.user!.userId, gameId, type, numericAmount.toFixed(2), paymentMethod.trim(), JSON.stringify(details || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create wallet request' });
  }
});

router.get('/requests/mine', requireAuth, async (req, res) => {
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : null;

  try {
    const params: unknown[] = [req.user!.userId];
    const where = gameId ? 'AND game_id = $2' : '';
    if (gameId) params.push(gameId);

    const result = await pool.query(
      `SELECT id, game_id, type, amount, payment_method, status, details, admin_note, created_at
       FROM wallet_requests
       WHERE user_id = $1 ${where}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load wallet requests' });
  }
});

export default router;
