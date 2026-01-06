#!/usr/bin/env node

// Test SSL connection to AWS Lightsail PostgreSQL
// Run with: node test-ssl-connection.js

const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    console.log('🧪 Testing SSL Connection to AWS Lightsail PostgreSQL...\n');

    // Build connection string with SSL
    let connectionString = `postgresql://${process.env.LIGHTSAIL_DB_USER}:${process.env.LIGHTSAIL_DB_PASSWORD}@${process.env.LIGHTSAIL_DB_HOST}:${process.env.LIGHTSAIL_DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME}`;
    
    // Add SSL mode to connection string
    connectionString += '?sslmode=require';
    
    console.log('🔗 Connection String (sanitized):');
    console.log(connectionString.replace(/:[^:@]*@/, ':***@'));
    console.log('');

    // Test with pg client
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        
        console.log('✅ Connected successfully!');
        
        // Test query
        const result = await client.query('SELECT version(), current_database(), current_user');
        console.log('📊 Database Info:');
        console.log(`- Database: ${result.rows[0].current_database}`);
        console.log(`- User: ${result.rows[0].current_user}`);
        console.log(`- Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        
        await client.end();
        console.log('\n🎉 SSL connection test successful!');
        console.log('Your database is ready for drizzle-kit push.');
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log('Error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        
        if (error.message.includes('no pg_hba.conf entry')) {
            console.log('- This error means SSL is required but not being used properly');
            console.log('- Make sure sslmode=require is in the connection string');
            console.log('- Verify your database allows SSL connections');
        }
        
        if (error.message.includes('authentication failed')) {
            console.log('- Check your database password');
            console.log('- Verify the username is correct');
        }
        
        if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
            console.log('- Check your database endpoint');
            console.log('- Verify network connectivity');
            console.log('- Ensure database is in "Available" state');
        }
    }
}

// Check environment variables first
const requiredVars = ['LIGHTSAIL_DB_HOST', 'LIGHTSAIL_DB_USER', 'LIGHTSAIL_DB_PASSWORD', 'LIGHTSAIL_DB_NAME'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('Please check your .env file.');
    process.exit(1);
}

testConnection().catch(console.error);