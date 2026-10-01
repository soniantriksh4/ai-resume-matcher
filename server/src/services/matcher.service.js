import { query } from '../db/pool.js';
import { embed, toPgVector } from './embedding.service.js';
import { normalizeSkills } from './skills.js';
import { recommend } from './llm.service.js';

export const WEIGHTS = { semantic: 0.5, skills: 0.35, experience: 0.15 };

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export function skillOverlap(resumeSkills, requiredSkills, niceToHave = []) {
  const have = new Set(normalizeSkills(resumeSkills));
  const req = normalizeSkills(requiredSkills);
  const nice = normalizeSkills(niceToHave);
  const matched = req.filter((s) => have.has(s));
  const missing = req.filter((s) => !have.has(s));
  const niceMatched = nice.filter((s) => have.has(s));
  const niceMissing = nice.filter((s) => !have.has(s));
  // Required skills count fully, nice-to-have count at 30% weight.
  const denom = req.length + nice.length * 0.3;
  const num = matched.length + niceMatched.length * 0.3;
  return { ratio: denom ? num / denom : 1, matched: [...matched, ...niceMatched], missing, niceMissing };
}

export function experienceFit(resumeYears, requiredYears) {
  if (!requiredYears) return 1;
  return clamp(resumeYears / requiredYears);
}

// Raw cosine similarity of text embeddings is usually 0.3-0.8; rescale to 0-1.
export const normalizeSemantic = (cos) => clamp((cos - 0.3) / 0.5);

export function combineScore({ semantic, skills, experience }) {
  const total = semantic * WEIGHTS.semantic + skills * WEIGHTS.skills + experience * WEIGHTS.experience;
  return Math.round(total * 1000) / 10;
}

export async function semanticSimilarity(resumeId, jobId) {
  const { rows: jobChunks } = await query(
    `SELECT vector::text AS v FROM embeddings WHERE owner_type='job' AND owner_id=$1`, [jobId]);
  if (!jobChunks.length) return 0;
  const sims = [];
  for (const { v } of jobChunks) {
    const { rows } = await query(
      `SELECT 1 - (vector <=> $1::vector) AS sim FROM embeddings
       WHERE owner_type='resume' AND owner_id=$2 ORDER BY vector <=> $1::vector LIMIT 1`, [v, resumeId]);
    if (rows[0]) sims.push(Number(rows[0].sim));
  }
  return sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : 0;
}

export async function runMatch({ resume, job }) {
  const rp = resume.parsed_json;
  const jp = job.parsed_json;
  const cos = await semanticSimilarity(resume.id, job.id);
  const overlap = skillOverlap(rp.skills, jp.required_skills, jp.nice_to_have_skills);
  const components = {
    semantic: normalizeSemantic(cos),
    skills: overlap.ratio,
    experience: experienceFit(rp.experience_years, jp.min_experience_years),
  };
  const score = combineScore(components);
  const recommendations = await recommend({
    resume: rp, job: jp, matched: overlap.matched, missing: [...overlap.missing, ...overlap.niceMissing], score,
  });
  return {
    score,
    breakdown: { ...components, raw_cosine: cos, weights: WEIGHTS },
    matched: overlap.matched,
    missing: { required: overlap.missing, nice_to_have: overlap.niceMissing },
    recommendations,
  };
}

export async function storeEmbeddings(ownerType, ownerId, chunks) {
  const vectors = await embed(chunks);
  for (let i = 0; i < chunks.length; i++) {
    await query(
      `INSERT INTO embeddings(owner_type, owner_id, chunk_text, vector) VALUES ($1,$2,$3,$4::vector)`,
      [ownerType, ownerId, chunks[i], toPgVector(vectors[i])]);
  }
}
