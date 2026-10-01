const ALIASES = {
  js: 'javascript', es6: 'javascript', ts: 'typescript', node: 'node.js', nodejs: 'node.js',
  'node js': 'node.js', reactjs: 'react', 'react.js': 'react', nextjs: 'next.js', next: 'next.js',
  postgres: 'postgresql', psql: 'postgresql', mongo: 'mongodb', k8s: 'kubernetes',
  springboot: 'spring boot', 'rest api': 'rest', 'restful api': 'rest',
  'restful apis': 'rest', 'rest apis': 'rest', py: 'python', cicd: 'ci/cd',
  ml: 'machine learning', llms: 'llm', 'large language models': 'llm', gcp: 'google cloud',
  'amazon web services': 'aws', oop: 'object-oriented programming', dsa: 'data structures and algorithms',
};

export function normalizeSkill(s) {
  const k = String(s).toLowerCase().trim().replace(/\s+/g, ' ');
  return ALIASES[k] || k;
}

export function normalizeSkills(list = []) {
  return [...new Set(list.map(normalizeSkill).filter(Boolean))];
}
