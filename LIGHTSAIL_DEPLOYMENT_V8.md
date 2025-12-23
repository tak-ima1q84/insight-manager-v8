# AWS Lightsail Deployment Guide - Insight Manager v8

Complete guide for deploying Insight Manager v8 on AWS Lightsail Ubuntu server with AWS Lightsail PostgreSQL database.

## 🆕 What's New in v8

- **External PostgreSQL**: Uses AWS Lightsail managed PostgreSQL database
- **Simplified Architecture**: No local database container
- **Enhanced Security**: SSL connections to managed database
- **Better Scalability**: Separate database and application tiers
- **Cost Optimization**: Pay only for what you use

## Architecture Overview

```
┌─────────────────────┐    ┌──────────────────────┐
│   Lightsail Ubuntu  │    │  Lightsail PostgreSQL│
│     Instance        │────│     Database         │
│                     │    │                      │
│  ┌───────────────┐  │    │  ┌─────────────────┐ │
│  │ Docker        │  │    │  │   PostgreSQL    │ │
│  │ ┌───────────┐ │  │    │  │     16.x        │ │
│  │ │   App     │ │  │────│──│   Port: 5432    │ │
│  │ │ Port:3000 │ │  │    │  │   SSL: Enabled  │ │
│  │ └───────────┘ │  │    │  └─────────────────┘ │
│  └───────────────┘  │    │                      │
│                     │    │  Automated Backups   │
│  Nginx (Port 80/443)│    │  Multi-AZ Available  │
└─────────────────────┘    └──────────────────────┘
```

---

## Prerequisites

- AWS account with Lightsail access
- Domain name (optional, for SSL)
- Basic knowledge of SSH and Docker

---

## Step 1: Create AWS Lightsail PostgreSQL Database

### Via AWS Console

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click "Create database"
3. Select:
   - Database engine: PostgreSQL
   - Version: 16.x (latest)
   - Database plan: 
     - **Development**: $15/month (1 vCPU, 1 GB RAM, 20 GB SSD)
     - **Production**: $30/month (1 vCPU, 2 GB RAM, 40 GB SSD)
   - Database name: `insight-manager-v8-db`
   - Master database name: `insight_manager`
   - Master username: `postgres`
   - Master password: Generate secure password
4. Click "Create database"

### Via AWS CLI

```bash
# Create PostgreSQL database
aws lightsail create-relational-database \
  --relational-database-name insight-manager-v8-db \
  --relational-database-blueprint-id postgres_16 \
  --relational-database-bundle-id micro_2_0 \
  --master-database-name insight_manager \
  --master-username postgres \
  --master-user-password "$(openssl rand -base64 24)" \
  --backup-retention-enabled \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00"

# Get database endpoint
aws lightsail get-relational-database \
  --relational-database-name insight-manager-v8-db \
  --query 'relationalDatabase.masterEndpoint.address' \
  --output text
```

**Important**: Save the database endpoint and password - you'll need them later!

---

## Step 2: Create Lightsail Ubuntu Instance

### Via AWS Console

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click "Create instance"
3. Select:
   - Platform: Linux/Unix
   - Blueprint: Ubuntu 22.04 LTS
   - Instance plan:
     - **Development**: $10/month (2 GB RAM, 1 vCPU)
     - **Production**: $20/month (4 GB RAM, 2 vCPU)
   - Instance name: `insight-manager-v8`
4. Click "Create instance"

### Via AWS CLI

```bash
# Create Ubuntu instance
aws lightsail create-instances \
  --instance-names insight-manager-v8 \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id medium_2_0

# Get instance IP
aws lightsail get-instance \
  --instance-name insight-manager-v8 \
  --query 'instance.publicIpAddress' \
  --output text
```

---

## Step 3: Configure Networking

### Open Required Ports

```bash
# HTTP (port 8080 for Docker)
aws lightsail open-instance-public-ports \
  --instance-name insight-manager-v8 \
  --port-info fromPort=8080,toPort=8080,protocol=TCP

# HTTP (port 80 for Nginx)
aws lightsail open-instance-public-ports \
  --instance-name insight-manager-v8 \
  --port-info fromPort=80,toPort=80,protocol=TCP

# HTTPS (port 443 for SSL)
aws lightsail open-instance-public-ports \
  --instance-name insight-manager-v8 \
  --port-info fromPort=443,toPort=443,protocol=TCP
```

### Configure Database Access

The PostgreSQL database is automatically configured to allow connections from Lightsail instances in the same region. No additional firewall configuration needed.

---

## Step 4: Install Dependencies on Ubuntu Instance

```bash
# Connect via SSH
ssh -i LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_INSTANCE_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install git htop nano curl postgresql-client-14 -y

# Logout and login for docker group to take effect
exit
```

---

## Step 5: Deploy Application

```bash
# Reconnect to instance
ssh -i LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_INSTANCE_IP

# Clone repository (replace with your repository)
git clone https://github.com/YOUR_USERNAME/insight-manager-v8.git
cd insight-manager-v8

# Create production environment file
cp .env .env.production
nano .env.production
```

### Configure Environment Variables

Update `.env.production` with your actual values:

```env
# AWS Lightsail PostgreSQL Database Configuration
LIGHTSAIL_DB_HOST=ls-abc123def456ghi789.czowadgeqq.us-east-1.rds.amazonaws.com
LIGHTSAIL_DB_PORT=5432
LIGHTSAIL_DB_USER=postgres
LIGHTSAIL_DB_PASSWORD=your-actual-database-password
LIGHTSAIL_DB_NAME=insight_manager
LIGHTSAIL_DB_SSL=true

# Server Configuration
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-generated-below

# Production Environment
NODE_ENV=production
```

### Generate Secure Secrets

```bash
# Generate JWT secret (save this!)
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Test database connection
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager -c "SELECT version();"
```

---

## Step 6: Start Application

```bash
# Use production environment
cp .env.production .env

# Build and start application
docker-compose up -d

# Wait for application to start
sleep 30

# Check status
docker-compose ps

# Initialize database schema
docker-compose exec app bun run db:push

# Seed initial data
docker-compose exec app bun run db:seed

# Test application
curl http://localhost:8080/health

# Test API endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Check logs
docker-compose logs -f app
```

---

## Step 7: Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/insight-manager-v8
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other requests
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle file uploads
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/insight-manager-v8 /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 8: Configure Auto-Start Service

```bash
# Create systemd service
sudo nano /etc/systemd/system/insight-manager-v8.service
```

Add this configuration:

```ini
[Unit]
Description=Insight Manager v8
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/insight-manager-v8
ExecStartPre=/bin/sleep 10
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
ExecReload=/usr/local/bin/docker-compose restart
User=ubuntu
Group=ubuntu
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable insight-manager-v8
sudo systemctl start insight-manager-v8
sudo systemctl status insight-manager-v8
```

---

## Step 9: SSL/HTTPS Setup (Optional but Recommended)

### Create Static IP

```bash
# Allocate static IP
aws lightsail allocate-static-ip --static-ip-name insight-manager-v8-ip

# Attach to instance
aws lightsail attach-static-ip \
  --static-ip-name insight-manager-v8-ip \
  --instance-name insight-manager-v8

# Get static IP
aws lightsail get-static-ip \
  --static-ip-name insight-manager-v8-ip \
  --query 'staticIp.ipAddress' \
  --output text
```

### Configure DNS

Add A record at your domain registrar:
- Type: A
- Name: @ (or subdomain like `app`)
- Value: YOUR_STATIC_IP
- TTL: 300

### Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

---

## Database Management

### Connect to Database

```bash
# From Ubuntu instance
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager

# From local machine (if you have psql installed)
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager
```

### Database Backup

```bash
# Create backup script
nano /home/ubuntu/backup-db.sh
```

Add backup script:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DB_HOST="YOUR_DB_ENDPOINT"
DB_USER="postgres"
DB_NAME="insight_manager"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD="$LIGHTSAIL_DB_PASSWORD" pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --no-password \
  > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $(date)"
```

```bash
# Make executable and schedule
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

### Database Restore

```bash
# Restore from backup
PGPASSWORD="$LIGHTSAIL_DB_PASSWORD" psql \
  -h YOUR_DB_ENDPOINT \
  -U postgres \
  -d insight_manager \
  < backup_file.sql
```

---

## Monitoring and Maintenance

### Application Monitoring

```bash
# Check application status
docker-compose ps
docker-compose logs -f app

# Check system resources
htop
df -h
free -h

# Check service status
sudo systemctl status insight-manager-v8
sudo systemctl status nginx
```

### Database Monitoring

```bash
# Connect to database
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager

# Check database size
SELECT pg_size_pretty(pg_database_size('insight_manager'));

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Log Management

```bash
# Application logs
docker-compose logs --tail=100 app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u insight-manager-v8 -f
sudo journalctl -u nginx -f
```

---

## Security Best Practices

### Firewall Configuration

```bash
# Install and configure UFW
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Database Security

1. **Use strong passwords**: Generate with `openssl rand -base64 32`
2. **Enable SSL**: Already configured in v8
3. **Regular backups**: Automated daily backups
4. **Monitor access**: Check connection logs regularly
5. **Update regularly**: Lightsail handles PostgreSQL updates

### Application Security

```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Monitor failed login attempts
grep "Failed login" /var/log/auth.log

# Check for suspicious activity
sudo fail2ban-client status
```

---

## Performance Optimization

### Database Performance

```bash
# Connect to database and optimize
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager

# Analyze tables
ANALYZE;

# Update statistics
VACUUM ANALYZE;

# Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

### Application Performance

```bash
# Add resource limits to docker-compose.yml
nano docker-compose.yml
```

Add under app service:

```yaml
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Nginx Caching

Add to Nginx configuration:

```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Cache API responses (if appropriate)
location /api/public/ {
    proxy_cache_valid 200 5m;
    proxy_cache_key $scheme$proxy_host$request_uri;
}
```

---

## Scaling Considerations

### Vertical Scaling

**Database Scaling:**
- Upgrade Lightsail database plan via console
- No downtime for minor upgrades
- Backup before major upgrades

**Instance Scaling:**
```bash
# Create snapshot
aws lightsail create-instance-snapshot \
  --instance-name insight-manager-v8 \
  --instance-snapshot-name insight-manager-v8-snapshot

# Create larger instance from snapshot
aws lightsail create-instances-from-snapshot \
  --instance-names insight-manager-v8-large \
  --instance-snapshot-name insight-manager-v8-snapshot \
  --bundle-id large_2_0
```

### Horizontal Scaling

For high traffic, consider:
1. **Load Balancer**: Multiple app instances behind ALB
2. **Database Read Replicas**: For read-heavy workloads
3. **CDN**: CloudFront for static assets
4. **Caching**: Redis for session/data caching

---

## Cost Analysis

### Monthly Costs (USD)

| Component | Development | Production | High Traffic |
|-----------|-------------|------------|--------------|
| Ubuntu Instance | $10 (2GB RAM) | $20 (4GB RAM) | $40 (8GB RAM) |
| PostgreSQL DB | $15 (1GB RAM) | $30 (2GB RAM) | $60 (4GB RAM) |
| Static IP | $5 | $5 | $5 |
| **Total** | **$30/month** | **$55/month** | **$105/month** |

### Cost Optimization Tips

1. **Right-size instances**: Monitor usage and adjust
2. **Use snapshots**: For development environments
3. **Schedule backups**: During low-traffic hours
4. **Monitor data transfer**: Optimize API responses

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check database status
aws lightsail get-relational-database --relational-database-name insight-manager-v8-db

# Test connection
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager -c "SELECT 1;"

# Check environment variables
docker-compose exec app env | grep DB
```

**Application Won't Start:**
```bash
# Check Docker status
sudo systemctl status docker
docker-compose ps

# Check logs
docker-compose logs app

# Restart application
docker-compose restart app
```

**SSL Certificate Issues:**
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx config
sudo nginx -t
```

**High Memory Usage:**
```bash
# Check memory usage
free -h
docker stats

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Migration from v7

If migrating from insight-manager-v7:

```bash
# Export data from v7
docker-compose exec db pg_dump -U postgres insight_manager > v7_export.sql

# Import to Lightsail PostgreSQL
PGPASSWORD="$LIGHTSAIL_DB_PASSWORD" psql \
  -h YOUR_DB_ENDPOINT \
  -U postgres \
  -d insight_manager \
  < v7_export.sql

# Update application configuration
# Deploy v8 with new docker-compose.yml
```

---

## Quick Reference Commands

```bash
# Service management
sudo systemctl start insight-manager-v8
sudo systemctl stop insight-manager-v8
sudo systemctl restart insight-manager-v8
sudo systemctl status insight-manager-v8

# Docker management
docker-compose up -d
docker-compose down
docker-compose restart app
docker-compose logs -f app

# Database operations
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager
docker-compose exec app bun run db:push
docker-compose exec app bun run db:seed

# System monitoring
htop
df -h
free -h
docker stats
sudo ufw status
sudo systemctl status nginx
```

---

## Support Resources

- **AWS Lightsail Documentation**: https://lightsail.aws.amazon.com/ls/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Docker Compose Reference**: https://docs.docker.com/compose/
- **Nginx Documentation**: https://nginx.org/en/docs/

---

**Your Insight Manager v8 is now running on AWS Lightsail with managed PostgreSQL!** 🚀

Key benefits of v8:
- ✅ Managed PostgreSQL database with automated backups
- ✅ Simplified deployment without database containers
- ✅ Enhanced security with SSL connections
- ✅ Better scalability and performance
- ✅ Production-ready monitoring and maintenance