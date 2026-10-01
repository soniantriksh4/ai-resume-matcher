import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { config } from '../config.js';

const router = Router();
const Creds = z.object({ email: z.string().email(), password: z.string().min(8).max(100) });
const sign = (u) => jwt.sign({ id: u.id, email: u.email }, config.jwtSecret, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  const { email, password } = Creds.parse(req.body);
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email', [email.toLowerCase(), hash]);
    res.status(201).json({ token: sign(rows[0]), user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw e;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = Creds.parse(req.body);
  const { rows } = await query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(rows[0]), user: { id: rows[0].id, email: rows[0].email } });
});

export default router;
