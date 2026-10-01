import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { config } from './config.js';
import { requireAuth } from './middleware/auth.js';
import auth from './routes/auth.js';
import resumes from './routes/resumes.js';
import jobs from './routes/jobs.js';
import match from './routes/match.js';

// Express 4 does not catch async errors; wrap handlers.
import 'express-async-errors';

export const app = express();
app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '200kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 60 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 20 }), auth);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/resumes', requireAuth, rateLimit({ windowMs: 60_000, limit: 10 }), resumes);
app.use('/api/jobs', requireAuth, jobs);
app.use('/api', requireAuth, rateLimit({ windowMs: 60_000, limit: 15 }), match);

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
  if (err.name === 'MulterError' || /Only PDF/.test(err.message)) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
