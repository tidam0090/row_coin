import { Router } from 'express';
import { pool } from '../db';

const router = Router();

const ACTIVE_GAME_SLUGS = [
  'juwa777',
  'gamevault',
  'vegas-sweeps',
  'ultrapanda',
  'bluedragon',
  'cashfrenzy',
  'cashmachine',
  'firekirin',
  'gameroom',
  'juwa2',
  'mafia',
  'milkyway',
  'noble',
  'orionstars',
  'pandamaster',
  'riversweeps',
  'vblink',
  'falcon-royle',
];

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title, genre, description, icon, play_url, download_url
       FROM games
       WHERE slug = ANY($1::text[])
       ORDER BY sort_order ASC, created_at ASC`,
      [ACTIVE_GAME_SLUGS]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load games' });
  }
});

export default router;
