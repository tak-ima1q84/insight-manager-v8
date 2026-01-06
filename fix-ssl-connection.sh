#!/bin/bash

# Quick fix script for SSL connection issues with AWS Lightsail PostgreSQL
# Run this on your Lightsail instance to fix the database connection

echo "🔧 Fixing SSL connection for AWS Lightsail PostgreSQL..."

# Stop the application
echo "📦 Stopping application..."
docker-compose down

# Pull latest changes (if this is a git repository)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull
fi

# Rebuild the application with SSL fixes
echo "🔨 Rebuilding application..."
docker-compose build --no-cache app

# Start the application
echo "🚀 Starting application..."
docker-compose up -d

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 30

# Test the connection
echo "🧪 Testing database connection..."
if docker-compose exec app bun run db:push; then
    echo "✅ Database connection successful!"
    echo "🌱 Seeding database..."
    docker-compose exec app bun run db:seed
    echo "🎉 Application is ready!"
else
    echo "❌ Database connection failed. Please check your environment variables."
    echo "📋 Current environment variables:"
    docker-compose exec app env | grep -E "(DB_|LIGHTSAIL_)"
fi

echo "📊 Application status:"
docker-compose ps