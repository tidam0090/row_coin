import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import gamesRouter from './routes/games';
import requestsRouter from './routes/requests';
import walletRouter from './routes/wallet';
import adminRouter from './routes/admin';
import { requestIdMiddleware, securityHeadersMiddleware, enforceHttps } from './middleware/security';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_KEY', 'CORS_ORIGIN'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ ERROR: Required environment variable "${envVar}" is not set`);
    process.exit(1);
  }
}

const app = express();

// Security middleware - apply early
app.use(enforceHttps);
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// CORS - explicitly validate origin
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
app.use(cors({ 
  origin: corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200 
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser()); // Parse cookies

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
});
app.use(limiter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/admin', adminRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const server = app.listen(PORT, () => {
  console.log(`✅ Coin Row API listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
