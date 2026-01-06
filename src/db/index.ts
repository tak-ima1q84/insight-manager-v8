import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use DATABASE_URL for Render, fallback to individual env vars for local development
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Configure SSL for AWS Lightsail PostgreSQL
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

const client = postgres(connectionString, {
  ssl: sslConfig,
});

export const db = drizzle(client, { schema });
