import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { runMatch } from '../services/matcher.service.js';

const router = Router();
const Body = z.object({ resumeId: z.number().int(), jobId: z.number().int() });

router.post('/match', async (req, res) => {
  const { resumeId, jobId } = Body.parse(req.body);
  const [r, j] = await Promise.all([
    query('SELECT * FROM resumes WHERE id=$1 AND user_id=$2', [resumeId, req.user.id]),
    query('SELECT * FROM jobs WHERE id=$1 AND user_id=$2', [jobId, req.user.id]),
  ]);
  if (!r.rows[0] || !j.rows[0]) return res.status(404).json({ error: 'Resume or job not found' });
  const out = await runMatch({ resume: r.rows[0], job: j.rows[0] });
  const { rows } = await query(
    `INSERT INTO match_results(user_id,resume_id,job_id,score,breakdown,matched_skills,missing_skills,recommendations)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,created_at`,
    [req.user.id, resumeId, jobId, out.score, out.breakdown, JSON.stringify(out.matched), out.missing, out.recommendations]);
  res.status(201).json({ id: rows[0].id, ...out });
});

router.get('/matches', async (req, res) => {
  const { rows } = await query(
    `SELECT m.id,m.score,m.created_at,j.title,j.company,r.filename FROM match_results m
     JOIN jobs j ON j.id=m.job_id JOIN resumes r ON r.id=m.resume_id
     WHERE m.user_id=$1 ORDER BY m.id DESC`, [req.user.id]);
  res.json(rows);
});

router.get('/matches/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM match_results WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

export default router;
