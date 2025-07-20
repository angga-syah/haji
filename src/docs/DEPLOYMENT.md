# 🚀 Invoice Management System - Deployment Guide

## 📋 Overview

This guide covers multiple deployment strategies for the Invoice Management System, from local development to production environments. The system is designed for flexibility with support for various database providers and hosting platforms.

---

## 🏗️ Architecture Overview

### Technology Stack
- **Frontend/Backend**: Next.js 15 with App Router
- **Database**: PostgreSQL (Supabase, Railway, Local, or any PostgreSQL provider)
- **Authentication**: Flexible (Supabase Auth or Local JWT)
- **Hosting**: Vercel (recommended), Netlify, or self-hosted
- **Desktop**: Electron (for printer integration)

### Environment Flexibility
The system uses a unified approach that works with any PostgreSQL database:
- Local PostgreSQL for development
- Supabase for cloud database
- Railway, Neon, or any PostgreSQL provider
- Docker containers

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# .env.local (copy from .env.example)

# Database (Required)
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication (Optional - for enhanced security)
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here

# Supabase (Optional - only if using Supabase Auth)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development|production

# Email (Optional - for notifications)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Backup (Optional)
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+ (or Docker)
- Git

### Option 1: Local PostgreSQL

```bash
# 1. Install PostgreSQL
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# 2. Create database
createdb invoice_management

# 3. Clone and setup project
git clone <repository-url>
cd invoice-management-system
npm install

# 4. Setup environment
cp .env.example .env.local
# Edit .env.local with your database connection

# 5. Run migrations
npm run db:migrate

# 6. Seed initial data (optional)
npm run db:seed

# 7. Start development server
npm run dev
```

### Option 2: Docker Development

```bash
# 1. Clone project
git clone <repository-url>
cd invoice-management-system

# 2. Start with Docker Compose
docker-compose up -d

# 3. Run migrations
npm run db:migrate

# 4. Access application
# http://localhost:3000
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/invoice_db
      - NODE_ENV=development
    depends_on:
      - db
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=invoice_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

---

## ☁️ Cloud Database Setup

### Option 1: Supabase (Recommended for beginners)

```bash
# 1. Create Supabase project at https://supabase.com
# 2. Get connection details from Settings > Database
# 3. Update .env.local
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]

# 4. Run migrations
npm run db:migrate

# 5. (Optional) Enable Row Level Security
npm run db:setup-rls
```

### Option 2: Railway

```bash
# 1. Create account at https://railway.app
# 2. Create PostgreSQL service
# 3. Get connection string from Variables tab
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway

# 4. Deploy
railway login
railway link
railway up
```

### Option 3: Neon (Serverless PostgreSQL)

```bash
# 1. Create account at https://neon.tech
# 2. Create database
# 3. Get connection string
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require

# 4. Update environment and deploy
```

### Option 4: Amazon RDS

```bash
# 1. Create RDS PostgreSQL instance
# 2. Configure security groups
# 3. Get endpoint details
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[ENDPOINT]:5432/[DATABASE]

# 4. Ensure SSL connection
DATABASE_URL=postgresql://[USERNAME]:[PASSWORD]@[ENDPOINT]:5432/[DATABASE]?sslmode=require
```

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

#### Automatic Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login and setup
vercel login
vercel

# 3. Configure environment variables in Vercel dashboard
# Settings > Environment Variables
```

#### Manual Deployment

```bash
# 1. Build project locally
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. Setup environment variables via dashboard or CLI
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... add other required variables

# 4. Redeploy with new environment
vercel --prod
```

#### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "edge"
    }
  },
  "regions": ["sin1", "hkg1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Option 2: Netlify

```bash
# 1. Build static export (if using SSG)
npm run build
npm run export

# 2. Deploy to Netlify
# Drag and drop 'out' folder to Netlify deploy page
# OR connect GitHub repository

# 3. Configure environment variables in Netlify dashboard
```

### Option 3: Self-Hosted (Ubuntu/CentOS)

#### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx

# Install PostgreSQL (if not using external database)
sudo apt install postgresql postgresql-contrib
```

#### Application Setup

```bash
# 1. Clone repository
git clone <repository-url> /var/www/invoice-app
cd /var/www/invoice-app

# 2. Install dependencies
npm ci --production

# 3. Setup environment
sudo nano .env.production
# Add all required environment variables

# 4. Build application
npm run build

# 5. Setup PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Configure Nginx
sudo nano /etc/nginx/sites-available/invoice-app
```

#### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'invoice-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/invoice-app',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/invoice-app/err.log',
      out_file: '/var/log/invoice-app/out.log',
      log_file: '/var/log/invoice-app/combined.log',
      time: true
    }
  ]
}
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/invoice-app
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### SSL Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Option 4: Docker Production

#### Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose for Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🗄️ Database Migration & Setup

### Migration Scripts

```bash
# Run all migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Reset database (development only)
npm run db:reset

# Create new migration
npm run db:create-migration "add_new_table"
```

### Initial Data Setup

```bash
# Seed basic data
npm run db:seed

# Seed with sample data (development)
npm run db:seed:sample

# Create admin user
npm run db:create-admin
```

### Database Backup & Restore

```bash
# Manual backup
npm run db:backup

# Automated backup (setup in cron)
0 2 * * * cd /var/www/invoice-app && npm run db:backup

# Restore from backup
npm run db:restore backup-2024-01-01.sql
```

---

## 🖥️ Desktop Application (Electron)

### Building Desktop App

```bash
# Install Electron dependencies
cd src/electron
npm install

# Build for current platform
npm run build:electron

# Build for specific platforms
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux

# Build for all platforms
npm run build:all
```

### Distribution

```bash
# Create installer packages
npm run dist

# Code signing (production)
# Windows: Setup code signing certificate
# macOS: Setup Apple Developer certificate
# Linux: Setup GPG signing
```

### Printer Integration

```bash
# Configure dot matrix printer (Epson LX-300)
# 1. Install printer drivers
# 2. Setup printer in system
# 3. Configure printer name in app settings
# 4. Test print functionality
```

---

## 🔧 Configuration Management

### Environment-Specific Configs

```javascript
// next.config.js
const config = {
  // Base configuration
  reactStrictMode: true,
  experimental: {
    runtime: 'edge'
  },

  // Environment-specific settings
  env: {
    CUSTOM_KEY: process.env.NODE_ENV === 'production' 
      ? 'production-value' 
      : 'development-value'
  },

  // Vercel-specific optimizations
  ...(process.env.VERCEL && {
    assetPrefix: process.env.VERCEL_URL,
    images: {
      domains: ['vercel.app']
    }
  })
}

module.exports = config
```

### Feature Flags

```javascript
// lib/features.ts
export const features = {
  // Enable/disable features per environment
  ELECTRON_PRINTING: process.env.NODE_ENV !== 'production',
  ADVANCED_REPORTS: process.env.FEATURE_ADVANCED_REPORTS === 'true',
  MULTI_COMPANY: process.env.FEATURE_MULTI_COMPANY === 'true',
  
  // Database features
  USE_SUPABASE_AUTH: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  USE_LOCAL_AUTH: !process.env.NEXT_PUBLIC_SUPABASE_URL
}
```

---

## 📊 Monitoring & Logging

### Application Monitoring

```javascript
// lib/monitoring.ts
import { createClient } from '@vercel/edge-config'

export const monitoring = {
  // Error tracking
  captureError: (error: Error, context: any) => {
    console.error('Application Error:', error, context)
    // Send to monitoring service
  },

  // Performance tracking
  trackPerformance: (metric: string, value: number) => {
    console.log(`Performance: ${metric} = ${value}ms`)
    // Send to analytics
  },

  // Business metrics
  trackEvent: (event: string, properties: any) => {
    console.log(`Event: ${event}`, properties)
    // Send to analytics
  }
}
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await pool.query('SELECT 1')
    
    // Check external services
    const checks = {
      database: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    }
    
    return Response.json(checks)
  } catch (error) {
    return Response.json(
      { error: 'Unhealthy', details: error.message },
      { status: 500 }
    )
  }
}
```

---

## 🔒 Security Considerations

### Production Security Checklist

- [ ] **Environment Variables**: All secrets in environment variables, not code
- [ ] **HTTPS**: SSL/TLS certificates properly configured
- [ ] **Database**: Connection string uses SSL mode
- [ ] **Authentication**: Strong JWT secrets and proper session management
- [ ] **CORS**: Configure allowed origins for API endpoints
- [ ] **Rate Limiting**: Implement rate limiting for API endpoints
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **SQL Injection**: Use parameterized queries only
- [ ] **XSS Protection**: Proper output encoding
- [ ] **CSRF Protection**: CSRF tokens where needed

### Security Headers

```javascript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

---

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Test database connection
npm run db:test

# Check connection string format
echo $DATABASE_URL

# Test with psql directly
psql $DATABASE_URL -c "SELECT version();"
```

#### Build/Deployment Issues

```bash
# Clear Next.js cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check build logs
npm run build 2>&1 | tee build.log
```

#### Performance Issues

```bash
# Analyze bundle size
npm run analyze

# Check memory usage
npm run start:debug

# Database performance
npm run db:analyze
```

### Error Diagnostics

```typescript
// lib/diagnostics.ts
export const diagnostics = {
  async checkDatabase() {
    try {
      const result = await pool.query('SELECT NOW()')
      return { status: 'healthy', latency: '< 100ms' }
    } catch (error) {
      return { status: 'error', error: error.message }
    }
  },

  async checkAuth() {
    // Test authentication system
  },

  async checkExternal() {
    // Test external service connections
  }
}
```

---

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] **Code Review**: All code reviewed and approved
- [ ] **Tests**: All tests passing
- [ ] **Environment**: Production environment variables configured
- [ ] **Database**: Migrations tested and ready
- [ ] **Dependencies**: All dependencies up to date and secure
- [ ] **Build**: Production build successful
- [ ] **Backup**: Database backup created

### Deployment

- [ ] **Deploy**: Application deployed successfully
- [ ] **Migrations**: Database migrations run successfully
- [ ] **Health Check**: Health endpoints responding
- [ ] **Monitoring**: Monitoring and logging configured
- [ ] **SSL**: HTTPS working correctly
- [ ] **DNS**: Domain name resolving correctly

### Post-Deployment

- [ ] **Functionality**: Core features working
- [ ] **Performance**: Acceptable response times
- [ ] **Errors**: No critical errors in logs
- [ ] **Users**: User authentication working
- [ ] **Data**: Data integrity verified
- [ ] **Backup**: Automated backups working
- [ ] **Documentation**: Deployment documented

---

## 🔄 Continuous Deployment

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

This comprehensive deployment guide covers all major scenarios and provides step-by-step instructions for deploying the Invoice Management System in various environments.