import { Router } from 'express';
import { pool } from '../db';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
router.use(adminAuth);

router.get('/payment-methods', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT code, kind, title, description, primary_label, primary_value, secondary_label, secondary_value,
              note_label, note_value, input_label, input_placeholder, qr_code_url, warning_text, sort_order, active,
              created_at, updated_at
       FROM payment_methods
       ORDER BY sort_order ASC, code ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

router.put('/payment-methods/:code', async (req, res) => {
  const code = req.params.code;
  const {
    title,
    description,
    primary_label,
    primary_value,
    secondary_label,
    secondary_value,
    note_label,
    note_value,
    input_label,
    input_placeholder,
    qr_code_url,
    warning_text,
    sort_order,
    active,
  } = req.body as {
    title?: string;
    description?: string;
    primary_label?: string;
    primary_value?: string;
    secondary_label?: string;
    secondary_value?: string;
    note_label?: string;
    note_value?: string;
    input_label?: string;
    input_placeholder?: string;
    qr_code_url?: string;
    warning_text?: string;
    sort_order?: number | string;
    active?: boolean;
  };

  try {
    const result = await pool.query(
      `UPDATE payment_methods
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           primary_label = COALESCE($4, primary_label),
           primary_value = COALESCE($5, primary_value),
           secondary_label = COALESCE($6, secondary_label),
           secondary_value = COALESCE($7, secondary_value),
           note_label = COALESCE($8, note_label),
           note_value = COALESCE($9, note_value),
           input_label = COALESCE($10, input_label),
           input_placeholder = COALESCE($11, input_placeholder),
           qr_code_url = COALESCE($12, qr_code_url),
           warning_text = COALESCE($13, warning_text),
           sort_order = COALESCE($14, sort_order),
           active = COALESCE($15, active),
           updated_at = now()
       WHERE code = $1
       RETURNING code, kind, title, description, primary_label, primary_value, secondary_label, secondary_value,
                 note_label, note_value, input_label, input_placeholder, qr_code_url, warning_text, sort_order,
                 active, created_at, updated_at`,
      [
        code,
        title ?? null,
        description ?? null,
        primary_label ?? null,
        primary_value ?? null,
        secondary_label ?? null,
        secondary_value ?? null,
        note_label ?? null,
        note_value ?? null,
        input_label ?? null,
        input_placeholder ?? null,
        qr_code_url ?? null,
        warning_text ?? null,
        sort_order ?? null,
        typeof active === 'boolean' ? active : null,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Used by the admin login screen to validate the key
router.get('/check', (_req, res) => res.json({ ok: true }));

// List requests, most recent first, optionally filtered by status
// (the admin UI uses this for its Pending / Completed tabs)
router.get('/requests', async (req, res) => {
  const status = req.query.status as string | undefined;
  try {
    const params: unknown[] = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE r.status = $1';
    }
    const result = await pool.query(
      `SELECT r.id, r.status, r.username, r.password, r.created_at, r.fulfilled_at,
              g.title AS game_title,
              u.username AS requester_username,
              u.email AS requester_email
       FROM access_requests r
       JOIN games g ON g.id = r.game_id
       LEFT JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

router.get('/wallet-requests', async (req, res) => {
  const status = req.query.status as string | undefined;
  try {
    const params: unknown[] = [];
    let where = '';
    if (status) {
      params.push(status);
      where = 'WHERE w.status = $1';
    }

    const result = await pool.query(
      `SELECT w.id, w.game_id, w.type, w.amount, w.payment_method, w.details, w.admin_note, w.status, w.created_at, w.processed_at,
              g.title AS game_title,
              u.username AS requester_username,
              u.email AS requester_email
       FROM wallet_requests w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN games g ON g.id = w.game_id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT 200`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load wallet requests' });
  }
});

router.post('/wallet-requests/:id/approve', async (req, res) => {
  const { note } = req.body as { note?: string };
  try {
    const result = await pool.query(
      `UPDATE wallet_requests
       SET status = 'approved', processed_at = now(), admin_note = COALESCE($2, admin_note)
       WHERE id = $1 AND status = 'pending'
       RETURNING id, type, amount, status, processed_at, admin_note`,
      [req.params.id, note?.trim() ? note.trim() : null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pending wallet request not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve wallet request' });
  }
});

router.post('/wallet-requests/:id/cancel', async (req, res) => {
  const { note } = req.body as { note?: string };
  try {
    const result = await pool.query(
      `UPDATE wallet_requests
       SET status = 'cancelled', processed_at = now(), admin_note = COALESCE($2, admin_note)
       WHERE id = $1 AND status = 'pending'
       RETURNING id, type, amount, status, processed_at, admin_note`,
      [req.params.id, note?.trim() ? note.trim() : null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pending wallet request not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel wallet request' });
  }
});

// Issue credentials for a pending request
router.post('/requests/:id/fulfill', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
  try {
    const result = await pool.query(
      `UPDATE access_requests
       SET username = $1, password = $2, status = 'fulfilled', fulfilled_at = now()
       WHERE id = $3
       RETURNING id, status, username, fulfilled_at`,
      [username, password, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fulfill request' });
  }
});

export default router;
