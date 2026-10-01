import crypto from 'node:crypto';
import { config } from '../config.js';

const DIM = config.embeddingDim;

// Deterministic bag-of-words hashing embedding: offline dev/test fallback only.
export function hashEmbedding(text) {
  const v = new Array(DIM).fill(0);
  for (const tok of text.toLowerCase().match(/[a-z0-9+#.]+/g) || []) {
    const h = crypto.createHash('md5').update(tok).digest();
    v[h.readUInt16BE(0) % DIM] += h[2] % 2 ? 1 : -1;
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embed(texts, inputType = 'document') {
  if (!config.voyageKey) {
    console.warn('[embeddings] VOYAGE_API_KEY not set, using hashing fallback (dev only)');
    return texts.map(hashEmbedding);
  }
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.voyageKey}` },
    body: JSON.stringify({ input: texts, model: config.embeddingModel, input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

export const toPgVector = (v) => `[${v.join(',')}]`;
