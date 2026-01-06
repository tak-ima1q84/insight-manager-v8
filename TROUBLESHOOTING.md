# Troubleshooting Guide - Insight Manager v8

## Database Connection Issues

### Error: `drizzle-kit push` fails with PostgreSQL connection error

**Symptoms:**
- `drizzle-kit push` command fails
- Error messages about PostgreSQL connection
- SSL-related errors

**Root Cause:**
AWS Lightsail PostgreSQL requires SSL connections, but the application wasn't configured to use SSL.

**Solution:**

1. **Update your code** (if you haven't already):
   ```bash
   # The SSL configuration has been fixed in the latest version
   git pull  # if using git
   ```

2. **Verify environment variables**:
   ```bash
   # Check your .env file contains:
   cat .env | grep -E "(LIGHTSAIL_DB_|DB_SSL)"
   ```
   
   Should show:
   ```
   LIGHTSAIL_DB_HOST=your-db-endpoint.amazonaws.com
   LIGHTSAIL_DB_USER=postgres
   LIGHTSAIL_DB_PASSWORD=your-password
   LIGHTSAIL_DB_NAME=insight_manager
   LIGHTSAIL_DB_SSL=true
   ```

3. **Test connection manually**:
   ```bash
   # Install postgres client if not present
   sudo apt install postgresql-client-14 -y
   
   # Test connection
   psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager -c "SELECT version();"
   ```

4. **Rebuild and restart application**:
   ```bash
   # Stop application
   docker-compose down
   
   # Rebuild with SSL fixes
   docker-compose build --no-cache app
   
   # Start application
   docker-compose up -d
   
   # Wait and test
   sleep 30
   docker-compose exec app bun run db:push
   ```

### Quick Fix Script

Run the automated fix script:
```bash
chmod +x fix-ssl-connection.sh
./fix-ssl-connection.sh
```

---

## Environment Configuration Issues

### Missing Environment Variables

**Check required variables:**
```bash
# Run the verification script
node verify-db-connection.js
```

**Required variables:**
- `LIGHTSAIL_DB_HOST` - Your database endpoint
- `LIGHTSAIL_DB_USER` - Database username (usually 'postgres')
- `LIGHTSAIL_DB_PASSWORD` - Database password
- `LIGHTSAIL_DB_NAME` - Database name (usually 'insight_manager')
- `LIGHTSAIL_DB_SSL` - Must be 'true' for Lightsail

### Environment Setup

**Automated setup:**
```bash
chmod +x setup-env.sh
./setup-env.sh
```

**Manual setup:**
```bash
# Copy example and edit
cp .env.example .env
nano .env

# Update with your actual values
LIGHTSAIL_DB_HOST=ls-abc123def456.czowadgeqq.us-east-1.rds.amazonaws.com
LIGHTSAIL_DB_USER=postgres
LIGHTSAIL_DB_PASSWORD=your-actual-password
LIGHTSAIL_DB_NAME=insight_manager
LIGHTSAIL_DB_SSL=true
```

---

## Docker Issues

### Container Won't Start

**Check container status:**
```bash
docker-compose ps
docker-compose logs app
```

**Common solutions:**
```bash
# Restart Docker service
sudo systemctl restart docker

# Clean up and rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Port Conflicts

**Check port usage:**
```bash
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :3000
```

**Kill conflicting processes:**
```bash
sudo fuser -k 8080/tcp
sudo fuser -k 3000/tcp
```

---

## Database Issues

### Database Not Available

**Check database status:**
```bash
aws lightsail get-relational-database \
  --relational-database-name YOUR_DB_NAME \
  --query 'relationalDatabase.state' \
  --output text
```

**Wait for database to be available:**
```bash
# Database might still be starting up
# Wait 5-10 minutes and try again
```

### Connection Timeout

**Check network connectivity:**
```bash
# Test if you can reach the database host
telnet YOUR_DB_ENDPOINT 5432

# Check DNS resolution
nslookup YOUR_DB_ENDPOINT
```

### Wrong Database Credentials

**Reset database password:**
```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 24)

# Update database password via AWS CLI
aws lightsail update-relational-database \
  --relational-database-name YOUR_DB_NAME \
  --master-user-password "$NEW_PASSWORD"

# Update .env file with new password
```

---

## SSL Certificate Issues

### Let's Encrypt Certificate Fails

**Check domain configuration:**
```bash
# Verify DNS points to your server
dig +short your-domain.com

# Check Nginx configuration
sudo nginx -t
```

**Renew certificate:**
```bash
sudo certbot renew --dry-run
sudo certbot renew
```

---

## Performance Issues

### High Memory Usage

**Check memory usage:**
```bash
free -h
docker stats
```

**Add swap if needed:**
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Slow Database Queries

**Check database performance:**
```bash
# Connect to database
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('insight_manager'));

# Analyze tables
ANALYZE;
```

---

## Application Issues

### Application Won't Start

**Check application logs:**
```bash
docker-compose logs -f app
```

**Common issues:**
- Missing JWT_SECRET
- Database connection failure
- Port already in use

**Solutions:**
```bash
# Generate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Check environment variables
docker-compose exec app env | grep -E "(JWT_|DB_|PORT)"
```

### API Endpoints Not Working

**Test health endpoint:**
```bash
curl http://localhost:8080/health
```

**Check API endpoints:**
```bash
# Test login endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Monitoring Commands

### System Health Check

```bash
# System resources
htop
df -h
free -h

# Docker status
docker-compose ps
docker stats

# Service status
sudo systemctl status insight-manager-v8
sudo systemctl status nginx

# Application logs
docker-compose logs --tail=50 app

# Database connection test
docker-compose exec app bun run db:push --dry-run
```

### Network Diagnostics

```bash
# Check open ports
sudo netstat -tlnp

# Test database connectivity
telnet YOUR_DB_ENDPOINT 5432

# Check firewall
sudo ufw status

# Test external connectivity
curl -I http://your-domain.com
```

---

## Getting Help

### Collect Diagnostic Information

```bash
# System information
uname -a
docker --version
docker-compose --version

# Application status
docker-compose ps
docker-compose logs --tail=100 app

# Environment variables (sanitized)
docker-compose exec app env | grep -E "(DB_|JWT_|PORT|NODE_ENV)" | sed 's/PASSWORD=.*/PASSWORD=***/'

# Database connectivity
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager -c "SELECT version();"
```

### Log Files Locations

- **Application logs**: `docker-compose logs app`
- **Nginx logs**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **System logs**: `sudo journalctl -u insight-manager-v8`
- **Docker logs**: `sudo journalctl -u docker`

### Support Resources

- **AWS Lightsail Documentation**: https://lightsail.aws.amazon.com/ls/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Docker Compose Reference**: https://docs.docker.com/compose/

---

## Prevention

### Regular Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean up Docker
docker system prune -f

# Backup database
pg_dump -h YOUR_DB_ENDPOINT -U postgres insight_manager > backup_$(date +%Y%m%d).sql

# Monitor disk space
df -h

# Check logs for errors
docker-compose logs app | grep -i error
```

### Monitoring Setup

```bash
# Set up log rotation
sudo nano /etc/logrotate.d/insight-manager

# Add monitoring script to crontab
crontab -e
# Add: */5 * * * * /home/ubuntu/monitor.sh
```

This troubleshooting guide should help you resolve most common issues with Insight Manager v8 deployment.