import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// Create a new access request for a game — must be signed in
router.post('/', requireAuth, async (req, res) => {
  const { gameId } = req.body as { gameId?: string };
  if (!gameId) return res.status(400).json({ error: 'gameId is required' });

  try {
    const game = await pool.query('SELECT id FROM games WHERE id = $1', [gameId]);
    if (game.rowCount === 0) return res.status(404).json({ error: 'Game not found' });

    const result = await pool.query(
      `INSERT INTO access_requests (game_id, user_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [gameId, req.user!.userId]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// A signed-in player's own open/most recent request for a given game, if any.
// Lets the lobby show "you already have a request in for this game" instead
// of letting them queue duplicates.
router.get('/mine/:gameId', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status FROM access_requests
       WHERE user_id = $1 AND game_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.user!.userId, req.params.gameId]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check existing requests' });
  }
});

// Poll a request's status — used by the player's status page.
// Scoped to the signed-in owner so one player can't read another's ticket.
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.status, r.username, r.password, r.created_at, r.fulfilled_at,
              g.title AS game_title, g.slug AS game_slug, g.icon AS game_icon, g.genre AS game_genre,
              g.play_url, g.download_url
       FROM access_requests r
       JOIN games g ON g.id = r.game_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

export default router;
