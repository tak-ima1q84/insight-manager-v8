#!/bin/bash

# Environment Setup Script for Insight Manager v8 on AWS Lightsail
# This script helps you configure the correct environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Insight Manager v8 - Environment Setup${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists. Creating backup...${NC}"
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ Backup created${NC}"
fi

echo -e "\n${BLUE}Please provide your AWS Lightsail PostgreSQL database details:${NC}"

# Get database information
read -p "Database Host (endpoint): " DB_HOST
read -p "Database User [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}
read -s -p "Database Password: " DB_PASSWORD
echo
read -p "Database Name [insight_manager]: " DB_NAME
DB_NAME=${DB_NAME:-insight_manager}
read -p "Database Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

echo -e "\n${BLUE}📝 Creating .env file...${NC}"

# Create .env file
cat > .env << EOF
# AWS Lightsail PostgreSQL Database Configuration
LIGHTSAIL_DB_HOST=$DB_HOST
LIGHTSAIL_DB_PORT=$DB_PORT
LIGHTSAIL_DB_USER=$DB_USER
LIGHTSAIL_DB_PASSWORD=$DB_PASSWORD
LIGHTSAIL_DB_NAME=$DB_NAME
LIGHTSAIL_DB_SSL=true

# Server Configuration
PORT=3000
JWT_SECRET=$JWT_SECRET

# Production Environment
NODE_ENV=production
EOF

echo -e "${GREEN}✅ .env file created successfully!${NC}"

# Test connection if node is available
if command -v node &> /dev/null && [ -f "package.json" ]; then
    echo -e "\n${BLUE}🧪 Testing database connection...${NC}"
    
    # Install postgres dependency if not present
    if ! npm list postgres &> /dev/null; then
        echo -e "${YELLOW}📦 Installing postgres dependency...${NC}"
        npm install postgres dotenv
    fi
    
    # Run connection test
    if node verify-db-connection.js; then
        echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
        echo -e "${GREEN}You can now run: docker-compose up -d${NC}"
    else
        echo -e "\n${RED}❌ Connection test failed. Please check your database configuration.${NC}"
    fi
else
    echo -e "\n${YELLOW}⚠️  Node.js not found. Skipping connection test.${NC}"
    echo -e "${GREEN}✅ Environment file created. Please test manually.${NC}"
fi

echo -e "\n${BLUE}📋 Next steps:${NC}"
echo -e "1. Verify your database is running: ${YELLOW}aws lightsail get-relational-database --relational-database-name YOUR_DB_NAME${NC}"
echo -e "2. Test connection: ${YELLOW}node verify-db-connection.js${NC}"
echo -e "3. Start application: ${YELLOW}docker-compose up -d${NC}"
echo -e "4. Initialize database: ${YELLOW}docker-compose exec app bun run db:push${NC}"
echo -e "5. Seed data: ${YELLOW}docker-compose exec app bun run db:seed${NC}"

echo -e "\n${GREEN}🔒 Security reminder: Keep your .env file secure and never commit it to version control!${NC}"