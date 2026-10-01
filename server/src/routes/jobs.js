import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { chunkText } from '../services/parser.service.js';
import { extractJob } from '../services/llm.service.js';
import { storeEmbeddings } from '../services/matcher.service.js';

const router = Router();
const JobInput = z.object({
  title: z.string().min(2).max(200),
  company: z.string().max(200).optional(),
  description: z.string().min(50).max(20000),
});

router.post('/', async (req, res) => {
  const { title, company, description } = JobInput.parse(req.body);
  const parsed = await extractJob(description);
  const { rows } = await query(
    'INSERT INTO jobs(user_id,title,company,description,parsed_json) VALUES($1,$2,$3,$4,$5) RETURNING id,title,company,parsed_json,created_at',
    [req.user.id, title, company || null, description, parsed]);
  await storeEmbeddings('job', rows[0].id, chunkText(description));
  res.status(201).json(rows[0]);
});

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id,title,company,parsed_json,created_at FROM jobs WHERE user_id=$1 ORDER BY id DESC', [req.user.id]);
  res.json(rows);
});

export default router;
