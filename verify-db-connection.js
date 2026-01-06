#!/usr/bin/env node

// Simple script to verify database connection configuration
// Run with: node verify-db-connection.js

const postgres = require('postgres');
require('dotenv').config();

async function verifyConnection() {
  console.log('🔍 Verifying database connection configuration...\n');
  
  // Check environment variables
  const requiredVars = [
    'LIGHTSAIL_DB_HOST',
    'LIGHTSAIL_DB_USER', 
    'LIGHTSAIL_DB_PASSWORD',
    'LIGHTSAIL_DB_NAME'
  ];
  
  console.log('📋 Environment Variables:');
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${varName.includes('PASSWORD') ? '***' : value}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      missingVars.push(varName);
    }
  });
  
  console.log(`✅ LIGHTSAIL_DB_SSL: ${process.env.LIGHTSAIL_DB_SSL || 'true (default)'}`);
  console.log(`✅ LIGHTSAIL_DB_PORT: ${process.env.LIGHTSAIL_DB_PORT || '5432 (default)'}\n`);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('Please set these in your .env file or environment.\n');
    return;
  }
  
  // Build connection string
  const connectionString = `postgresql://${process.env.LIGHTSAIL_DB_USER}:${process.env.LIGHTSAIL_DB_PASSWORD}@${process.env.LIGHTSAIL_DB_HOST}:${process.env.LIGHTSAIL_DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME}`;
  
  console.log('🔗 Connection String:');
  console.log(`postgresql://${process.env.LIGHTSAIL_DB_USER}:***@${process.env.LIGHTSAIL_DB_HOST}:${process.env.LIGHTSAIL_DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME}\n`);
  
  // Test connection
  console.log('🧪 Testing database connection...');
  
  try {
    const sslConfig = process.env.LIGHTSAIL_DB_SSL !== 'false' ? { rejectUnauthorized: false } : false;
    
    const sql = postgres(connectionString, {
      ssl: sslConfig,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    });
    
    // Test query
    const result = await sql`SELECT version() as version, current_database() as database, current_user as user`;
    
    console.log('✅ Connection successful!');
    console.log(`📊 Database: ${result[0].database}`);
    console.log(`👤 User: ${result[0].user}`);
    console.log(`🐘 PostgreSQL Version: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}\n`);
    
    await sql.end();
    
    console.log('🎉 Your database configuration is correct!');
    console.log('You can now run: docker-compose up -d');
    
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('Error:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your database endpoint is correct');
    console.log('2. Check that your database password is correct');
    console.log('3. Ensure your Lightsail database is in "Available" state');
    console.log('4. Verify the database name exists');
    console.log('5. Check if your instance can reach the database (same region)');
  }
}

verifyConnection().catch(console.error);