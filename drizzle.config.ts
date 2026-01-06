import type { Config } from 'drizzle-kit';

// Use DATABASE_URL for Render, fallback to individual env vars for local development
let connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.LIGHTSAIL_DB_USER || process.env.DB_USER || 'postgres'}:${process.env.LIGHTSAIL_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres'}@${process.env.LIGHTSAIL_DB_HOST || process.env.DB_HOST || 'localhost'}:${process.env.LIGHTSAIL_DB_PORT || process.env.DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME || process.env.DB_NAME || 'insight_manager'}`;

// Configure SSL for AWS Lightsail PostgreSQL - check both LIGHTSAIL_DB_SSL and DB_SSL
const shouldUseSSL = process.env.LIGHTSAIL_DB_SSL === 'true' || process.env.DB_SSL === 'true';

// For AWS Lightsail PostgreSQL, we need to add SSL parameters to the connection string
if (shouldUseSSL && !connectionString.includes('sslmode')) {
  connectionString += '?sslmode=require';
}

console.log('Drizzle Config Debug:');
console.log('- Connection string (sanitized):', connectionString.replace(/:[^:@]*@/, ':***@'));
console.log('- SSL enabled:', shouldUseSSL);
console.log('- LIGHTSAIL_DB_SSL:', process.env.LIGHTSAIL_DB_SSL);
console.log('- DB_SSL:', process.env.DB_SSL);

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
} satisfies Config;
