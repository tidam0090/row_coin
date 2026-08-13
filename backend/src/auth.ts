import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  username: string;
}

export function signToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.verify(token, secret) as TokenPayload;
}
