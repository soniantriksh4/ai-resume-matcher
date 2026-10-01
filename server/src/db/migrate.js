import fs from 'node:fs';
import { pool } from './pool.js';

const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Migration complete');
await pool.end();
