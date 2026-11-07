import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db';
import { resolveUserRoleByEmail } from '../userRoles';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const role = resolveUserRoleByEmail(result.rows[0].email);
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not verify admin access' });
  }
}
