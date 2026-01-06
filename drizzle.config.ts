import type { Config } from 'drizzle-kit';

// Use DATABASE_URL for Render, fallback to individual env vars for local development
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'insight_manager'}`;

// Configure SSL for AWS Lightsail PostgreSQL
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined;

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
    ssl: sslConfig,
  },
} satisfies Config;
