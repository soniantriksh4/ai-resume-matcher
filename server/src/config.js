import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/resume_matcher',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  llmModel: process.env.LLM_MODEL || 'claude-sonnet-5-5',
  voyageKey: process.env.VOYAGE_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL || 'voyage-3',
  embeddingDim: 1024,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  maxUploadMb: 5,
};
