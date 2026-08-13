import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import gamesRouter from './routes/games';
import requestsRouter from './routes/requests';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/admin', adminRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Coin Row API listening on port ${PORT}`);
});
