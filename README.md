# Insight Manager v8

A modern, full-stack insight management application built with Bun, Elysia, React, and PostgreSQL. Designed for AWS Lightsail deployment with managed PostgreSQL database.

## 🆕 What's New in v8

- **AWS Lightsail PostgreSQL**: Uses managed PostgreSQL database instead of containers
- **Enhanced Security**: SSL connections and better database isolation
- **Simplified Deployment**: No database containers to manage
- **Better Scalability**: Separate database and application tiers
- **Cost Optimization**: Pay-as-you-use managed database

## 🏗️ Architecture

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

## ⚡ Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/tak-ima1q84/insight-manager-v8.git
cd insight-manager-v8

# Run automated deployment
./deploy-lightsail.sh
```

### Option 2: Manual Setup

See [QUICKSTART_V8.md](./QUICKSTART_V8.md) for step-by-step instructions.

## 🛠️ Tech Stack

- **Backend**: Bun + Elysia (TypeScript)
- **Frontend**: React 19 + Vite
- **Database**: PostgreSQL 16 (AWS Lightsail managed)
- **ORM**: Drizzle ORM
- **Authentication**: JWT
- **Deployment**: Docker + AWS Lightsail
- **Reverse Proxy**: Nginx (optional)

## 📋 Features

- ✅ **Insight Management**: Create, read, update, delete insights
- ✅ **User Authentication**: JWT-based auth system
- ✅ **File Uploads**: Support for attachments and media
- ✅ **RESTful API**: Clean API endpoints
- ✅ **Responsive UI**: Modern React interface
- ✅ **Database Migrations**: Automated schema management
- ✅ **Health Checks**: Application monitoring endpoints
- ✅ **SSL Support**: HTTPS with Let's Encrypt
- ✅ **Automated Backups**: Daily database backups
- ✅ **Horizontal Scaling**: Ready for load balancers

## 🚀 Deployment Options

### AWS Lightsail (Recommended)
- **Cost**: $30-55/month
- **Features**: Managed database, automated backups, SSL
- **Guide**: [LIGHTSAIL_DEPLOYMENT_V8.md](./LIGHTSAIL_DEPLOYMENT_V8.md)

### Local Development
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Access at http://localhost:3000
```

## 📁 Project Structure

```
insight-manager-v8/
├── src/
│   ├── components/          # React components
│   ├── routes/             # API routes
│   ├── db/                 # Database schema & migrations
│   ├── lib/                # Utilities
│   └── server.ts           # Main server file
├── public/                 # Static assets
├── docker-compose.yml      # Docker configuration
├── Dockerfile             # Container definition
├── deploy-lightsail-v8.sh # Automated deployment
├── LIGHTSAIL_DEPLOYMENT_V8.md # Full deployment guide
└── QUICKSTART_V8.md       # Quick start guide
```

## 🔧 Configuration

### Environment Variables

```env
# AWS Lightsail PostgreSQL
LIGHTSAIL_DB_HOST=your-db-endpoint.region.rds.amazonaws.com
LIGHTSAIL_DB_PORT=5432
LIGHTSAIL_DB_USER=postgres
LIGHTSAIL_DB_PASSWORD=your-secure-password
LIGHTSAIL_DB_NAME=insight_manager
LIGHTSAIL_DB_SSL=true

# Application
PORT=3000
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### Database Schema

The application uses Drizzle ORM with automatic migrations:

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:push

# Seed initial data
bun run db:seed
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Insights
- `GET /api/insights` - List all insights
- `POST /api/insights` - Create new insight
- `GET /api/insights/:id` - Get specific insight
- `PUT /api/insights/:id` - Update insight
- `DELETE /api/insights/:id` - Delete insight

### System
- `GET /health` - Health check
- `GET /api/stats` - Application statistics

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **SSL Connections**: Encrypted database connections
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: API rate limiting with Nginx
- **CORS Protection**: Cross-origin request security
- **Security Headers**: XSS, CSRF, and other protections

## 📈 Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl http://your-domain.com/health

# Database connection
docker-compose exec app bun run db:push
```

### Logs
```bash
# Application logs
docker-compose logs -f app

# System logs
sudo journalctl -u insight-manager-v8 -f
```

### Backups
```bash
# Manual backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h YOUR_DB_ENDPOINT \
  -U postgres \
  -d insight_manager \
  > backup_$(date +%Y%m%d).sql

# Automated daily backups (configured in deployment)
```

## 💰 Cost Analysis

| Component | Development | Production | High Traffic |
|-----------|-------------|------------|--------------|
| Ubuntu Instance | $10/month | $20/month | $40/month |
| PostgreSQL DB | $15/month | $30/month | $60/month |
| Static IP | $5/month | $5/month | $5/month |
| **Total** | **$30/month** | **$55/month** | **$105/month** |

## 🔄 Scaling

### Vertical Scaling
- Upgrade Lightsail instance plan
- Upgrade database plan
- Add more CPU/RAM as needed

### Horizontal Scaling
- Multiple app instances behind load balancer
- Database read replicas
- CDN for static assets
- Redis for caching

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Test connection
psql -h YOUR_DB_ENDPOINT -U postgres -d insight_manager

# Check environment variables
docker-compose exec app env | grep DB
```

**Application Won't Start**
```bash
# Check logs
docker-compose logs app

# Restart services
docker-compose restart
```

**Out of Memory**
```bash
# Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📚 Documentation

- **Quick Start**: [QUICKSTART_V8.md](./QUICKSTART_V8.md)
- **Full Deployment**: [LIGHTSAIL_DEPLOYMENT_V8.md](./LIGHTSAIL_DEPLOYMENT_V8.md)
- **API Documentation**: Available at `/api/docs` (when running)
- **Database Schema**: See `src/db/schema.ts`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/tak-ima1q84/insight-manager-v8/issues)
- **Documentation**: [Wiki](https://github.com/tak-ima1q84/insight-manager-v8/wiki)
- **AWS Lightsail**: [Official Documentation](https://lightsail.aws.amazon.com/ls/docs)

---

**🚀 Ready to deploy? Run `./deploy-lightsail.sh` and get your Insight Manager v8 running on AWS Lightsail in minutes!**