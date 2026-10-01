import { describe, it, expect } from 'vitest';
import { skillOverlap, experienceFit, combineScore, normalizeSemantic } from '../src/services/matcher.service.js';
import { normalizeSkill } from '../src/services/skills.js';
import { hashEmbedding } from '../src/services/embedding.service.js';
import { chunkText } from '../src/services/parser.service.js';

describe('skills', () => {
  it('normalizes aliases', () => {
    expect(normalizeSkill('JS')).toBe('javascript');
    expect(normalizeSkill('Postgres')).toBe('postgresql');
    expect(normalizeSkill('RESTful APIs')).toBe('rest');
  });
  it('computes overlap with synonyms and missing skills', () => {
    const r = skillOverlap(['JS', 'Node', 'Postgres'], ['JavaScript', 'Node.js', 'Docker']);
    expect(r.matched).toEqual(['javascript', 'node.js']);
    expect(r.missing).toEqual(['docker']);
    expect(r.ratio).toBeCloseTo(2 / 3);
  });
  it('weights nice-to-have lower', () => {
    const r = skillOverlap(['java'], ['java'], ['kafka']);
    expect(r.ratio).toBeCloseTo(1 / 1.3);
  });
  it('empty requirements gives full ratio', () => {
    expect(skillOverlap(['java'], []).ratio).toBe(1);
  });
});

describe('scoring', () => {
  it('experience fit is capped at 1', () => {
    expect(experienceFit(5, 2)).toBe(1);
    expect(experienceFit(1, 4)).toBe(0.25);
    expect(experienceFit(0, 0)).toBe(1);
  });
  it('semantic normalization clamps', () => {
    expect(normalizeSemantic(0.1)).toBe(0);
    expect(normalizeSemantic(0.55)).toBeCloseTo(0.5);
    expect(normalizeSemantic(0.99)).toBe(1);
  });
  it('combines with weights to a 0-100 score', () => {
    expect(combineScore({ semantic: 1, skills: 1, experience: 1 })).toBe(100);
    expect(combineScore({ semantic: 0, skills: 0, experience: 0 })).toBe(0);
    expect(combineScore({ semantic: 0.5, skills: 0.5, experience: 0.5 })).toBe(50);
  });
});

describe('embeddings and chunking', () => {
  it('fallback embedding is unit length and deterministic', () => {
    const a = hashEmbedding('spring boot java');
    expect(a).toHaveLength(1024);
    expect(Math.hypot(...a)).toBeCloseTo(1);
    expect(hashEmbedding('spring boot java')).toEqual(a);
  });
  it('chunks long text', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ` + 'x'.repeat(100)).join('\n\n');
    const chunks = chunkText(text, 400);
    expect(chunks.length).toBeGreaterThan(3);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(800));
  });
});
