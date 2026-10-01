import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export async function extractText(file) {
  let text;
  if (file.mimetype === 'application/pdf') {
    text = (await pdf(file.buffer)).text;
  } else {
    text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
  }
  text = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 50) throw new Error('Could not extract readable text from file');
  return text;
}

export function chunkText(text, maxLen = 800) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if ((cur + '\n' + p).length > maxLen && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + '\n' + p : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.flatMap((c) => (c.length > maxLen * 2 ? c.match(new RegExp(`[\\s\\S]{1,${maxLen}}`, 'g')) : [c]));
}
