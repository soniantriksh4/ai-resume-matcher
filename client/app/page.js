'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const card = { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.08)' };
const input = { width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: '1px solid #ccd', boxSizing: 'border-box' };
const btn = { padding: '10px 16px', borderRadius: 8, border: 0, background: '#2f5bea', color: '#fff', cursor: 'pointer' };
const chip = (bg) => ({ display: 'inline-block', padding: '4px 10px', margin: 3, borderRadius: 999, background: bg, fontSize: 13 });

function ScoreGauge({ score }) {
  const color = score >= 70 ? '#1a9a52' : score >= 45 ? '#d98a00' : '#d03a3a';
  const r = 54, c = 2 * Math.PI * r;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Match score ${score}`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 70 70)" />
      <text x="70" y="78" textAnchor="middle" fontSize="28" fontWeight="600">{Math.round(score)}</text>
    </svg>
  );
}

export default function Home() {
  const [token, setToken] = useState(null);
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [resume, setResume] = useState(null);
  const [job, setJob] = useState({ title: '', company: '', description: '' });
  const [jobSaved, setJobSaved] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setToken(localStorage.getItem('token')); }, []);
  useEffect(() => { if (token) api('/matches', { token }).then(setHistory).catch(() => {}); }, [token, result]);

  const run = (fn) => async () => {
    setError(''); setBusy(true);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const login = (mode) => run(async () => {
    const d = await api(`/auth/${mode}`, { method: 'POST', body: auth });
    localStorage.setItem('token', d.token); setToken(d.token);
  });

  const upload = run(async () => {
    const form = new FormData(); form.append('file', document.getElementById('file').files[0]);
    setResume(await api('/resumes', { method: 'POST', form, token }));
  });

  const saveJob = run(async () => setJobSaved(await api('/jobs', { method: 'POST', body: job, token })));

  const match = run(async () =>
    setResult(await api('/match', { method: 'POST', body: { resumeId: resume.id, jobId: jobSaved.id }, token })));

  if (!token)
    return (
      <div style={{ ...card, maxWidth: 380, margin: '80px auto' }}>
        <h2>AI Resume Matcher</h2>
        <input style={input} placeholder="Email" onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
        <input style={input} type="password" placeholder="Password (8+ chars)" onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
        <button style={btn} disabled={busy} onClick={login('login')}>Log in</button>{' '}
        <button style={{ ...btn, background: '#555' }} disabled={busy} onClick={login('register')}>Register</button>
        {error && <p style={{ color: '#d03a3a' }}>{error}</p>}
      </div>
    );

  return (
    <>
      <h1>AI Resume Matcher</h1>
      {error && <p style={{ color: '#d03a3a' }}>{error}</p>}
      <section style={card}>
        <h3>1. Upload resume (PDF or DOCX)</h3>
        <input id="file" type="file" accept=".pdf,.docx" />
        <button style={btn} disabled={busy} onClick={upload}>Upload</button>
        {resume && <p>Detected skills: {resume.parsed_json.skills.map((s) => <span key={s} style={chip('#e8efff')}>{s}</span>)}</p>}
      </section>
      <section style={card}>
        <h3>2. Job description</h3>
        <input style={input} placeholder="Job title" onChange={(e) => setJob({ ...job, title: e.target.value })} />
        <input style={input} placeholder="Company (optional)" onChange={(e) => setJob({ ...job, company: e.target.value })} />
        <textarea style={{ ...input, height: 140 }} placeholder="Paste the job description" onChange={(e) => setJob({ ...job, description: e.target.value })} />
        <button style={btn} disabled={busy} onClick={saveJob}>Save job</button>
      </section>
      <button style={{ ...btn, fontSize: 16, marginBottom: 16 }} disabled={busy || !resume || !jobSaved} onClick={match}>
        {busy ? 'Working...' : 'Match'}
      </button>

      {result && (
        <section style={card}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <ScoreGauge score={result.score} />
            <div>
              <p>Semantic: {Math.round(result.breakdown.semantic * 100)}% | Skills: {Math.round(result.breakdown.skills * 100)}% | Experience: {Math.round(result.breakdown.experience * 100)}%</p>
              <p>{result.recommendations.summary}</p>
            </div>
          </div>
          <h4>Matched</h4>{result.matched.map((s) => <span key={s} style={chip('#d9f2e3')}>{s}</span>)}
          <h4>Missing (required)</h4>{result.missing.required.map((s) => <span key={s} style={chip('#fbdcdc')}>{s}</span>)}
          <h4>What to learn</h4>
          <ul>{result.recommendations.learn.map((l) => <li key={l.skill}><b>{l.skill}</b>: {l.why} {l.how}</li>)}</ul>
          <h4>Resume rewrites</h4>
          {result.recommendations.resume_rewrites.map((r, i) => <p key={i}><s>{r.before}</s><br />{r.after}</p>)}
          <h4>Project ideas</h4>
          <ul>{result.recommendations.project_ideas.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}

      {history.length > 0 && (
        <section style={card}>
          <h3>History</h3>
          {history.map((h) => <p key={h.id}>{h.title} {h.company && `@ ${h.company}`} — <b>{h.score}</b> ({h.filename})</p>)}
        </section>
      )}
    </>
  );
}
