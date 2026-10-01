import { Router } from 'express';
import { query } from '../db/pool.js';
import { upload } from '../middleware/upload.js';
import { extractText, chunkText } from '../services/parser.service.js';
import { extractResume } from '../services/llm.service.js';
import { storeEmbeddings } from '../services/matcher.service.js';

const router = Router();

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const text = await extractText(req.file);
  const parsed = await extractResume(text);
  const { rows } = await query(
    'INSERT INTO resumes(user_id,filename,raw_text,parsed_json) VALUES($1,$2,$3,$4) RETURNING id,filename,parsed_json,created_at',
    [req.user.id, req.file.originalname, text, parsed]);
  await storeEmbeddings('resume', rows[0].id, chunkText(text));
  res.status(201).json(rows[0]);
});

router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id,filename,parsed_json,created_at FROM resumes WHERE user_id=$1 ORDER BY id DESC', [req.user.id]);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT id,filename,parsed_json,created_at FROM resumes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM resumes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (rowCount) await query(`DELETE FROM embeddings WHERE owner_type='resume' AND owner_id=$1`, [req.params.id]);
  res.status(204).end();
});

export default router;
