import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use DATABASE_URL for Render, fallback to individual env vars for local development
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.LIGHTSAIL_DB_USER || process.env.DB_USER}:${process.env.LIGHTSAIL_DB_PASSWORD || process.env.DB_PASSWORD}@${process.env.LIGHTSAIL_DB_HOST || process.env.DB_HOST}:${process.env.LIGHTSAIL_DB_PORT || process.env.DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME || process.env.DB_NAME}`;

// Configure SSL for AWS Lightsail PostgreSQL - check both LIGHTSAIL_DB_SSL and DB_SSL
const shouldUseSSL = process.env.LIGHTSAIL_DB_SSL === 'true' || process.env.DB_SSL === 'true';
const sslConfig = shouldUseSSL ? { rejectUnauthorized: false } : false;

console.log('Database Connection Debug:');
console.log('- Connection string (sanitized):', connectionString.replace(/:[^:@]*@/, ':***@'));
console.log('- SSL enabled:', shouldUseSSL);
console.log('- LIGHTSAIL_DB_SSL:', process.env.LIGHTSAIL_DB_SSL);
console.log('- DB_SSL:', process.env.DB_SSL);

const client = postgres(connectionString, {
  ssl: sslConfig,
});

export const db = drizzle(client, { schema });
