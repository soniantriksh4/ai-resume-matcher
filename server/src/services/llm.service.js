import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { config } from '../config.js';

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

export const ResumeSchema = z.object({
  name: z.string().nullish(),
  skills: z.array(z.string()).default([]),
  experience_years: z.number().default(0),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
});

export const JobSchema = z.object({
  required_skills: z.array(z.string()).default([]),
  nice_to_have_skills: z.array(z.string()).default([]),
  min_experience_years: z.number().default(0),
  seniority: z.string().nullish(),
});

export const RecommendationSchema = z.object({
  summary: z.string(),
  learn: z.array(z.object({ skill: z.string(), why: z.string(), how: z.string() })).default([]),
  resume_rewrites: z.array(z.object({ before: z.string(), after: z.string() })).default([]),
  project_ideas: z.array(z.string()).default([]),
});

function parseJson(text) {
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
}

async function askJson(system, user, schema) {
  if (!client) throw new Error('ANTHROPIC_API_KEY is not configured');
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages.create({
      model: config.llmModel,
      max_tokens: 1500,
      system: `${system}\nRespond with ONLY a valid JSON object. No prose, no markdown.`,
      messages: [{ role: 'user', content: user }],
    });
    try {
      return schema.parse(parseJson(msg.content.map((b) => b.text || '').join('')));
    } catch (e) {
      if (attempt === 1) throw new Error('LLM returned invalid JSON: ' + e.message);
    }
  }
}

export const extractResume = (text) =>
  askJson(
    'You extract structured data from resumes. Keys: name, skills (canonical technology/skill names), experience_years (number, internships count fractionally), education (array of strings), projects (array of one-line summaries).',
    `<resume>\n${text.slice(0, 12000)}\n</resume>`,
    ResumeSchema,
  );

export const extractJob = (text) =>
  askJson(
    'You extract structured data from job descriptions. Keys: required_skills, nice_to_have_skills (canonical names), min_experience_years (number), seniority (string).',
    `<job_description>\n${text.slice(0, 12000)}\n</job_description>`,
    JobSchema,
  );

export const recommend = ({ resume, job, matched, missing, score }) =>
  askJson(
    'You are a career coach. Give specific, honest, actionable advice. Keys: summary (2-3 sentences), learn [{skill, why, how}] for the most important missing skills, resume_rewrites [{before, after}] (max 3, based only on content really present in the resume, never invent experience), project_ideas (max 3 strings).',
    JSON.stringify({ score, matched, missing, resume_projects: resume.projects, job }),
    RecommendationSchema,
  );
