#!/bin/bash

# AWS Lightsail Deployment Script for Insight Manager v8
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="insight-manager-v8"
DB_NAME="insight-manager-v8-db"
INSTANCE_NAME="insight-manager-v8"
STATIC_IP_NAME="insight-manager-v8-ip"

echo -e "${BLUE}🚀 AWS Lightsail Deployment Script for Insight Manager v8${NC}"
echo -e "${BLUE}================================================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS CLI is configured and ready"

# Get AWS region
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
    print_warning "No region configured, using default: $AWS_REGION"
fi

echo -e "${BLUE}Using AWS Region: $AWS_REGION${NC}"

# Function to generate secure password
generate_password() {
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-20
}

# Step 1: Create PostgreSQL Database
echo -e "\n${BLUE}Step 1: Creating PostgreSQL Database${NC}"

# Check if database already exists
if aws lightsail get-relational-database --relational-database-name $DB_NAME &> /dev/null; then
    print_warning "Database $DB_NAME already exists"
    DB_ENDPOINT=$(aws lightsail get-relational-database \
        --relational-database-name $DB_NAME \
        --query 'relationalDatabase.masterEndpoint.address' \
        --output text)
    print_status "Database endpoint: $DB_ENDPOINT"
else
    print_status "Creating new PostgreSQL database..."
    
    # Generate secure database password
    DB_PASSWORD=$(generate_password)
    
    # Create database
    aws lightsail create-relational-database \
        --relational-database-name $DB_NAME \
        --relational-database-blueprint-id postgres_16 \
        --relational-database-bundle-id micro_2_0 \
        --master-database-name insight_manager \
        --master-username postgres \
        --master-user-password "$DB_PASSWORD" \
        --backup-retention-enabled \
        --preferred-backup-window "03:00-04:00" \
        --preferred-maintenance-window "sun:04:00-sun:05:00"
    
    print_status "Database creation initiated. Waiting for it to be available..."
    
    # Wait for database to be available
    while true; do
        STATUS=$(aws lightsail get-relational-database \
            --relational-database-name $DB_NAME \
            --query 'relationalDatabase.state' \
            --output text 2>/dev/null || echo "pending")
        
        if [ "$STATUS" = "available" ]; then
            break
        fi
        
        echo -e "${YELLOW}Database status: $STATUS. Waiting...${NC}"
        sleep 30
    done
    
    # Get database endpoint
    DB_ENDPOINT=$(aws lightsail get-relational-database \
        --relational-database-name $DB_NAME \
        --query 'relationalDatabase.masterEndpoint.address' \
        --output text)
    
    print_status "Database created successfully!"
    print_status "Database endpoint: $DB_ENDPOINT"
    print_status "Database password: $DB_PASSWORD"
    
    # Save credentials to file
    cat > db_credentials.txt << EOF
Database Name: $DB_NAME
Database Endpoint: $DB_ENDPOINT
Database User: postgres
Database Password: $DB_PASSWORD
Database Name: insight_manager
EOF
    
    print_warning "Database credentials saved to db_credentials.txt - KEEP THIS SECURE!"
fi

# Step 2: Create Ubuntu Instance
echo -e "\n${BLUE}Step 2: Creating Ubuntu Instance${NC}"

# Check if instance already exists
if aws lightsail get-instance --instance-name $INSTANCE_NAME &> /dev/null; then
    print_warning "Instance $INSTANCE_NAME already exists"
    INSTANCE_IP=$(aws lightsail get-instance \
        --instance-name $INSTANCE_NAME \
        --query 'instance.publicIpAddress' \
        --output text)
    print_status "Instance IP: $INSTANCE_IP"
else
    print_status "Creating Ubuntu instance..."
    
    # Create instance
    aws lightsail create-instances \
        --instance-names $INSTANCE_NAME \
        --availability-zone ${AWS_REGION}a \
        --blueprint-id ubuntu_22_04 \
        --bundle-id medium_2_0
    
    print_status "Instance creation initiated. Waiting for it to be running..."
    
    # Wait for instance to be running
    while true; do
        STATUS=$(aws lightsail get-instance \
            --instance-name $INSTANCE_NAME \
            --query 'instance.state.name' \
            --output text 2>/dev/null || echo "pending")
        
        if [ "$STATUS" = "running" ]; then
            break
        fi
        
        echo -e "${YELLOW}Instance status: $STATUS. Waiting...${NC}"
        sleep 15
    done
    
    # Get instance IP
    INSTANCE_IP=$(aws lightsail get-instance \
        --instance-name $INSTANCE_NAME \
        --query 'instance.publicIpAddress' \
        --output text)
    
    print_status "Instance created successfully!"
    print_status "Instance IP: $INSTANCE_IP"
fi

# Step 3: Configure Networking
echo -e "\n${BLUE}Step 3: Configuring Networking${NC}"

# Open required ports
print_status "Opening required ports..."

aws lightsail open-instance-public-ports \
    --instance-name $INSTANCE_NAME \
    --port-info fromPort=8080,toPort=8080,protocol=TCP || true

aws lightsail open-instance-public-ports \
    --instance-name $INSTANCE_NAME \
    --port-info fromPort=80,toPort=80,protocol=TCP || true

aws lightsail open-instance-public-ports \
    --instance-name $INSTANCE_NAME \
    --port-info fromPort=443,toPort=443,protocol=TCP || true

print_status "Ports configured successfully"

# Step 4: Create Static IP
echo -e "\n${BLUE}Step 4: Creating Static IP${NC}"

# Check if static IP already exists
if aws lightsail get-static-ip --static-ip-name $STATIC_IP_NAME &> /dev/null; then
    print_warning "Static IP $STATIC_IP_NAME already exists"
    STATIC_IP=$(aws lightsail get-static-ip \
        --static-ip-name $STATIC_IP_NAME \
        --query 'staticIp.ipAddress' \
        --output text)
    print_status "Static IP: $STATIC_IP"
else
    print_status "Creating static IP..."
    
    # Create static IP
    aws lightsail allocate-static-ip --static-ip-name $STATIC_IP_NAME
    
    # Attach to instance
    aws lightsail attach-static-ip \
        --static-ip-name $STATIC_IP_NAME \
        --instance-name $INSTANCE_NAME
    
    # Get static IP
    STATIC_IP=$(aws lightsail get-static-ip \
        --static-ip-name $STATIC_IP_NAME \
        --query 'staticIp.ipAddress' \
        --output text)
    
    print_status "Static IP created and attached: $STATIC_IP"
fi

# Step 5: Generate deployment files
echo -e "\n${BLUE}Step 5: Generating Deployment Files${NC}"

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create production environment file
cat > .env.production << EOF
# AWS Lightsail PostgreSQL Database Configuration
LIGHTSAIL_DB_HOST=$DB_ENDPOINT
LIGHTSAIL_DB_PORT=5432
LIGHTSAIL_DB_USER=postgres
LIGHTSAIL_DB_PASSWORD=$DB_PASSWORD
LIGHTSAIL_DB_NAME=insight_manager
LIGHTSAIL_DB_SSL=true

# Server Configuration
PORT=3000
JWT_SECRET=$JWT_SECRET

# Production Environment
NODE_ENV=production
EOF

print_status "Production environment file created: .env.production"

# Create deployment instructions
cat > DEPLOYMENT_INSTRUCTIONS.md << EOF
# Deployment Instructions for $INSTANCE_NAME

## Server Details
- **Instance Name**: $INSTANCE_NAME
- **Instance IP**: $INSTANCE_IP
- **Static IP**: $STATIC_IP
- **Database Endpoint**: $DB_ENDPOINT

## SSH Connection
\`\`\`bash
ssh -i LightsailDefaultKey-${AWS_REGION}.pem ubuntu@$STATIC_IP
\`\`\`

## Next Steps

1. **Connect to your instance**:
   \`\`\`bash
   ssh -i LightsailDefaultKey-${AWS_REGION}.pem ubuntu@$STATIC_IP
   \`\`\`

2. **Install dependencies** (run on the instance):
   \`\`\`bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker ubuntu
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Install additional tools
   sudo apt install git htop nano curl postgresql-client-14 -y
   
   # Logout and login for docker group
   exit
   \`\`\`

3. **Deploy application** (after reconnecting):
   \`\`\`bash
   # Clone repository
   git clone https://github.com/tak-ima1q84/insight-manager-v8.git
   cd insight-manager-v8
   
   # Copy production environment (upload .env.production to server)
   # scp -i LightsailDefaultKey-${AWS_REGION}.pem .env.production ubuntu@$STATIC_IP:~/insight-manager-v8/.env
   
   # Start application
   docker-compose up -d
   
   # Initialize database
   sleep 30
   docker-compose exec app bun run db:push
   docker-compose exec app bun run db:seed
   
   # Test application
   curl http://localhost:8080/health
   \`\`\`

4. **Configure Nginx** (optional, for custom domain):
   Follow the Nginx configuration in LIGHTSAIL_DEPLOYMENT_V8.md

## Important Files
- Database credentials: db_credentials.txt
- Production environment: .env.production
- Deployment guide: LIGHTSAIL_DEPLOYMENT_V8.md

## Access Your Application
- **Direct access**: http://$STATIC_IP:8080
- **With domain**: Configure DNS A record pointing to $STATIC_IP

## Database Connection
\`\`\`bash
psql -h $DB_ENDPOINT -U postgres -d insight_manager
\`\`\`
EOF

print_status "Deployment instructions created: DEPLOYMENT_INSTRUCTIONS.md"

# Step 6: Summary
echo -e "\n${GREEN}🎉 Deployment Setup Complete!${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}Instance Name:${NC} $INSTANCE_NAME"
echo -e "${GREEN}Instance IP:${NC} $INSTANCE_IP"
echo -e "${GREEN}Static IP:${NC} $STATIC_IP"
echo -e "${GREEN}Database Endpoint:${NC} $DB_ENDPOINT"
echo -e "${GREEN}Database Name:${NC} insight_manager"
echo -e "${GREEN}Database User:${NC} postgres"
echo -e "${BLUE}================================================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Connect to your instance: ${BLUE}ssh -i LightsailDefaultKey-${AWS_REGION}.pem ubuntu@$STATIC_IP${NC}"
echo -e "2. Follow the instructions in ${BLUE}DEPLOYMENT_INSTRUCTIONS.md${NC}"
echo -e "3. Upload ${BLUE}.env.production${NC} to your server"
echo -e "4. Deploy your application using docker-compose"

echo -e "\n${YELLOW}Important Files Created:${NC}"
echo -e "- ${BLUE}db_credentials.txt${NC} - Database credentials (KEEP SECURE!)"
echo -e "- ${BLUE}.env.production${NC} - Production environment variables"
echo -e "- ${BLUE}DEPLOYMENT_INSTRUCTIONS.md${NC} - Step-by-step deployment guide"

echo -e "\n${GREEN}Your AWS Lightsail infrastructure is ready for Insight Manager v8!${NC}"

# Optional: Test database connection
echo -e "\n${YELLOW}Testing database connection...${NC}"
if command -v psql &> /dev/null; then
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_ENDPOINT" -U postgres -d insight_manager -c "SELECT version();" &> /dev/null; then
        print_status "Database connection test successful!"
    else
        print_warning "Database connection test failed. Database might still be initializing."
    fi
else
    print_warning "PostgreSQL client not installed. Skipping connection test."
fi

echo -e "\n${BLUE}Deployment script completed successfully!${NC}"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root. Run as ubuntu user."
    exit 1
fi

# Check if we're on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    print_error "This script is designed for Ubuntu. Please use Ubuntu 22.04 LTS."
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated successfully"

# Step 2: Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_warning "Docker is already installed"
fi

# Step 3: Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_warning "Docker Compose is already installed"
fi

# Step 4: Install additional tools
print_status "Installing additional tools..."
sudo apt install -y git htop nano curl ufw
print_success "Additional tools installed"

# Step 5: Configure firewall
print_status "Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw --force enable
print_success "Firewall configured"

# Step 6: Clone repository (if not already present)
if [ ! -d "insight-manager-v7" ]; then
    print_status "Please provide your GitHub repository URL:"
    read -p "Repository URL (e.g., https://github.com/username/insight-manager-v7.git): " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        print_error "Repository URL is required"
        exit 1
    fi
    
    print_status "Cloning repository..."
    git clone "$REPO_URL"
    print_success "Repository cloned"
else
    print_warning "Repository directory already exists"
fi

cd insight-manager-v7

# Switch to aws branch if it exists
if git branch -r | grep -q "origin/aws"; then
    print_status "Switching to aws branch..."
    git checkout aws
    print_success "Switched to aws branch"
fi

# Step 7: Configure environment
print_status "Configuring environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
    else
        print_status "Creating .env file..."
        cat > .env << EOF
# Database Configuration (Docker)
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=$(openssl rand -base64 24)
DB_NAME=insight_manager

# Server Configuration
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)

# Production settings
NODE_ENV=production
EOF
        print_success "Created .env file with secure defaults"
    fi
else
    print_warning ".env file already exists"
fi

# Step 8: Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/insight-manager.service > /dev/null << EOF
[Unit]
Description=Insight Manager v7
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/insight-manager-v7
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable insight-manager
print_success "Systemd service created and enabled"

# Step 9: Add swap if needed (for low memory instances)
MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEMORY_GB=$((MEMORY_KB / 1024 / 1024))

if [ $MEMORY_GB -lt 4 ]; then
    print_status "Adding swap file (detected ${MEMORY_GB}GB RAM)..."
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
        print_success "2GB swap file created"
    else
        print_warning "Swap file already exists"
    fi
fi

# Step 10: Start application
print_status "Starting application..."

# Check if user is in docker group (requires logout/login)
if ! groups | grep -q docker; then
    print_warning "User needs to be in docker group. Logging out and back in..."
    print_status "Please run the following commands after reconnecting:"
    echo "cd insight-manager-v7"
    echo "docker-compose up -d"
    echo "sleep 30"
    echo "docker-compose exec app bun run db:push"
    echo "docker-compose exec app bun run db:seed"
    exit 0
fi

docker-compose up -d
print_success "Application started"

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running"
    
    # Initialize database
    print_status "Initializing database..."
    docker-compose exec app bun run db:push
    docker-compose exec app bun run db:seed
    print_success "Database initialized"
    
    # Show status
    print_status "Service status:"
    docker-compose ps
    
    # Get instance IP
    INSTANCE_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "=================================================="
    echo "Application URL: http://${INSTANCE_IP}:8080"
    echo "Default login: admin / admin123"
    echo ""
    echo "Useful commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Restart: docker-compose restart"
    echo "  Stop: docker-compose down"
    echo "  Status: docker-compose ps"
    echo ""
    echo "Next steps:"
    echo "1. Configure your domain DNS to point to: ${INSTANCE_IP}"
    echo "2. Run SSL setup if you have a domain"
    echo "3. Change default passwords in the application"
    echo ""
else
    print_error "Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
cd /home/ubuntu/insight-manager-v7

# Create backup
docker-compose exec -T db pg_dump -U postgres insight_manager > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: $(date)"
EOF

chmod +x backup.sh
print_success "Backup script created"

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
echo "Updating Insight Manager v7..."

# Pull latest changes
git pull origin aws

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services
sleep 30

# Run migrations
docker-compose exec app bun run db:push

echo "Update completed: $(date)"
EOF

chmod +x update.sh
print_success "Update script created"

print_success "All scripts created successfully!"
print_status "You can now set up automated backups with: crontab -e"
print_status "Add this line for daily backups at 2 AM:"
print_status "0 2 * * * /home/ubuntu/insight-manager-v7/backup.sh >> /home/ubuntu/backup.log 2>&1"