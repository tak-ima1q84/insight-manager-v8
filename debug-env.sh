#!/bin/bash

echo "🔍 Debugging Environment Variables for Insight Manager v8"
echo "========================================================"

echo ""
echo "📋 Docker Compose Environment Variables:"
echo "----------------------------------------"
docker-compose exec app env | grep -E "(DB_|LIGHTSAIL_|JWT_|PORT|NODE_ENV)" | sort

echo ""
echo "📋 .env File Contents (sanitized):"
echo "-----------------------------------"
if [ -f ".env" ]; then
    cat .env | sed 's/PASSWORD=.*/PASSWORD=***/' | sed 's/SECRET=.*/SECRET=***/'
else
    echo "❌ .env file not found!"
fi

echo ""
echo "📋 Docker Compose Configuration:"
echo "--------------------------------"
echo "Environment variables from docker-compose.yml:"
grep -A 20 "environment:" docker-compose.yml | head -20

echo ""
echo "🧪 Testing Database Connection:"
echo "-------------------------------"
echo "Attempting to connect to database..."

# Test if we can reach the database host
DB_HOST=$(docker-compose exec app env | grep LIGHTSAIL_DB_HOST | cut -d'=' -f2 | tr -d '\r')
if [ -n "$DB_HOST" ]; then
    echo "Testing connectivity to: $DB_HOST"
    if timeout 5 bash -c "</dev/tcp/$DB_HOST/5432"; then
        echo "✅ Can reach database host on port 5432"
    else
        echo "❌ Cannot reach database host on port 5432"
    fi
else
    echo "❌ LIGHTSAIL_DB_HOST not set"
fi

echo ""
echo "🐳 Docker Container Status:"
echo "---------------------------"
docker-compose ps

echo ""
echo "📊 Container Logs (last 20 lines):"
echo "-----------------------------------"
docker-compose logs --tail=20 app

echo ""
echo "🔧 Suggested Actions:"
echo "--------------------"
echo "1. Verify your .env file has all required LIGHTSAIL_DB_* variables"
echo "2. Ensure LIGHTSAIL_DB_SSL=true is set"
echo "3. Check that your database is in 'Available' state in AWS console"
echo "4. Verify the database endpoint is correct"
echo "5. Try rebuilding: docker-compose down && docker-compose build --no-cache && docker-compose up -d"