import { Router } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title, genre, description, icon, play_url, download_url
       FROM games
       ORDER BY sort_order ASC, created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load games' });
  }
});

export default router;
