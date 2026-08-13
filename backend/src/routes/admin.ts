import { Router } from 'express';
import { pool } from '../db';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();
router.use(adminAuth);

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
              u.username AS requester_username, u.email AS requester_email
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
