#!/usr/bin/env node

// Test script to verify Drizzle configuration
// Run with: node test-drizzle-config.js

console.log('🧪 Testing Drizzle Configuration...\n');

// Load environment variables
require('dotenv').config();

// Import the drizzle config
try {
    const config = require('./drizzle.config.ts');
    console.log('✅ Drizzle config loaded successfully');
} catch (error) {
    console.log('❌ Failed to load drizzle config:', error.message);
    process.exit(1);
}

// Check environment variables
console.log('\n📋 Environment Variables Check:');
const requiredVars = [
    'LIGHTSAIL_DB_HOST',
    'LIGHTSAIL_DB_USER',
    'LIGHTSAIL_DB_PASSWORD', 
    'LIGHTSAIL_DB_NAME',
    'LIGHTSAIL_DB_SSL'
];

let allSet = true;
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${varName.includes('PASSWORD') ? '***' : value}`);
    } else {
        console.log(`❌ ${varName}: NOT SET`);
        allSet = false;
    }
});

if (!allSet) {
    console.log('\n❌ Some required environment variables are missing!');
    console.log('Please check your .env file.');
    process.exit(1);
}

// Test connection string building
const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.LIGHTSAIL_DB_USER}:${process.env.LIGHTSAIL_DB_PASSWORD}@${process.env.LIGHTSAIL_DB_HOST}:${process.env.LIGHTSAIL_DB_PORT || '5432'}/${process.env.LIGHTSAIL_DB_NAME}`;

console.log('\n🔗 Connection String (sanitized):');
console.log(connectionString.replace(/:[^:@]*@/, ':***@'));

// Check SSL configuration
const shouldUseSSL = process.env.LIGHTSAIL_DB_SSL === 'true' || process.env.DB_SSL === 'true';
console.log('\n🔒 SSL Configuration:');
console.log(`SSL Enabled: ${shouldUseSSL}`);
console.log(`LIGHTSAIL_DB_SSL: ${process.env.LIGHTSAIL_DB_SSL}`);
console.log(`DB_SSL: ${process.env.DB_SSL}`);

if (!shouldUseSSL) {
    console.log('\n⚠️  WARNING: SSL is not enabled! This will cause connection failures with AWS Lightsail PostgreSQL.');
    console.log('Set LIGHTSAIL_DB_SSL=true in your .env file.');
}

console.log('\n✅ Configuration test completed!');

if (shouldUseSSL && allSet) {
    console.log('🎉 Your configuration looks correct for AWS Lightsail PostgreSQL!');
} else {
    console.log('❌ Please fix the issues above before running drizzle-kit push.');
}