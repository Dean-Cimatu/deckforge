import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { connectDB } from './db.js';
import { authRouter } from './routes/auth.js';
import { sourcesRouter } from './routes/sources.js';
import { dueRouter } from './routes/due.js';
import { reviewRouter } from './routes/review.js';
import { cardsRouter } from './routes/cards.js';
import { decksRouter } from './routes/decks.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/due', dueRouter);
app.use('/api/review', reviewRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/decks', decksRouter);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
