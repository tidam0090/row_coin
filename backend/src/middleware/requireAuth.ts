import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try to get token from Authorization header first (for backward compatibility)
  let token = null;
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  }
  
  // If no Authorization header, try to get token from cookie
  if (!token && req.cookies) {
    token = req.cookies.token;
  }
  
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}
