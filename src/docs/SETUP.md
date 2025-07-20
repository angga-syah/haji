# 🚀 Invoice Management System - Setup Guide

## 📋 Overview

This comprehensive setup guide will walk you through setting up the Invoice Management System from scratch. Whether you're a developer, system administrator, or end user, this guide provides step-by-step instructions for all scenarios.

---

## 🎯 Quick Start (5 Minutes)

### For Developers - Local Development

```bash
# 1. Clone the repository
git clone <repository-url>
cd invoice-management-system

# 2. Install dependencies
npm install

# 3. Setup local database (PostgreSQL)
createdb invoice_management

# 4. Configure environment
cp .env.example .env.local
# Edit DATABASE_URL in .env.local

# 5. Initialize database
npm run db:migrate
npm run db:seed

# 6. Start development server
npm run dev

# 7. Open browser
open http://localhost:3000
```

### For Quick Testing - Docker

```bash
# 1. Clone and start with Docker
git clone <repository-url>
cd invoice-management-system
docker-compose up -d

# 2. Initialize database
npm run db:migrate

# 3. Access application
open http://localhost:3000
```

---

## 📋 Prerequisites

### System Requirements

#### Development Environment
- **Node.js**: Version 18.0 or higher
- **PostgreSQL**: Version 13.0 or higher
- **Git**: Latest version
- **Operating System**: Windows 10+, macOS 10.15+, or Linux Ubuntu 18.04+

#### Production Environment
- **Memory**: Minimum 1GB RAM (2GB+ recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Stable internet connection for cloud databases
- **SSL Certificate**: For HTTPS in production

#### Desktop Application (Optional)
- **Epson LX-300 Printer**: For dot matrix printing
- **Printer Drivers**: Latest drivers installed
- **Electron**: For desktop app functionality

### Software Installation

#### Node.js Installation

**Windows:**
```bash
# Download from https://nodejs.org/
# Or using Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### PostgreSQL Installation

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or using Chocolatey
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-13
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create user (if needed)
createuser -s postgres
```

**Linux (Ubuntu/Debian):**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
```

---

## 🔧 Environment Setup

### 1. Project Structure Setup

```bash
# Create project directory
mkdir invoice-management-system
cd invoice-management-system

# Clone repository (if using Git)
git clone <repository-url> .

# Or download and extract ZIP file
```

### 2. Dependencies Installation

```bash
# Install Node.js dependencies
npm install

# For global tools (optional)
npm install -g pm2      # For production process management
npm install -g vercel   # For Vercel deployment
```

### 3. Environment Configuration

#### Create Environment File

```bash
# Copy example environment file
cp .env.example .env.local

# For production
cp .env.example .env.production
```

#### Configure Environment Variables

**Local Development (.env.local):**
```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/invoice_management

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_SECRET=your-nextauth-secret-for-additional-security

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Supabase (if using cloud database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional: File Upload
UPLOAD_MAX_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=.xlsx,.csv,.pdf

# Optional: Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

**Production (.env.production):**
```bash
# Database Configuration (use your production database URL)
DATABASE_URL=postgresql://username:password@your-host:5432/production_db

# Authentication (use strong secrets)
JWT_SECRET=your-production-jwt-secret-very-long-and-secure
NEXTAUTH_SECRET=your-production-nextauth-secret

# Application Settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Security Settings
CORS_ORIGIN=https://your-domain.com
SESSION_TIMEOUT=3600  # 1 hour in seconds
MAX_LOGIN_ATTEMPTS=5

# Performance Settings
DATABASE_POOL_SIZE=20
CACHE_TTL=300  # 5 minutes
```

---

## 🗄️ Database Setup

### Option 1: Local PostgreSQL

#### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE invoice_management;

# Create user (optional)
CREATE USER invoice_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE invoice_management TO invoice_user;

# Exit PostgreSQL
\q
```

#### 2. Configure Connection

```bash
# Update .env.local
DATABASE_URL=postgresql://invoice_user:secure_password@localhost:5432/invoice_management
```

### Option 2: Supabase (Cloud Database)

#### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create new account or sign in
3. Create new project
4. Choose region closest to your users
5. Set strong database password

#### 2. Get Connection Details

1. Go to Settings → Database
2. Copy Connection string
3. Replace `[YOUR-PASSWORD]` with your database password

```bash
# Update .env.local
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```

### Option 3: Other Cloud Providers

#### Railway
1. Create account at [https://railway.app](https://railway.app)
2. Create PostgreSQL service
3. Copy connection string from Variables tab

#### Neon
1. Create account at [https://neon.tech](https://neon.tech)
2. Create database
3. Copy connection string (ensure SSL mode)

#### Amazon RDS
1. Create RDS PostgreSQL instance
2. Configure security groups
3. Get endpoint and create connection string

### 3. Run Database Migrations

```bash
# Run all migrations to create tables
npm run db:migrate

# Verify tables were created
npm run db:status
```

### 4. Seed Initial Data

```bash
# Seed basic system data (users, settings)
npm run db:seed

# Optional: Add sample data for testing
npm run db:seed:sample
```

---

## 👤 Initial User Setup

### Create Admin User

```bash
# Method 1: Using script
npm run create-admin

# Follow prompts to enter:
# - Email address
# - Password
# - Full name
```

### Manual User Creation

```sql
-- Connect to your database
psql $DATABASE_URL

-- Create admin user
INSERT INTO users (id, email, password_hash, email_verified) 
VALUES (
  uuid_generate_v4(),
  'admin@yourcompany.com',
  '$2b$10$rQ7gMkJ8YhZdQk8vKp7wJeH8vK9mN3wX2fL6tS9qW1eR4yU7oP8vC', -- 'admin123'
  true
);

-- Create admin profile
INSERT INTO profiles (id, username, role, full_name)
SELECT id, 'admin', 'admin', 'System Administrator'
FROM users WHERE email = 'admin@yourcompany.com';
```

**Default Login Credentials:**
- Email: `admin@yourcompany.com`
- Password: `admin123`
- **⚠️ Important: Change this password immediately after first login!**

---

## 🚀 Application Startup

### Development Mode

```bash
# Start development server with hot reload
npm run dev

# Server will start on http://localhost:3000
# - Automatic reload on file changes
# - Development error overlay
# - Detailed error messages
```

### Production Mode

```bash
# Build application for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Verify Installation

1. **Open Browser**: Navigate to `http://localhost:3000`
2. **Login Page**: Should see login form
3. **Login**: Use admin credentials created above
4. **Dashboard**: Should see main dashboard after login
5. **Test Features**: Try creating a company or TKA worker

---

## 🎨 UI & Theme Configuration

### Basic Customization

```javascript
// Update app/globals.css for basic theme changes
:root {
  --primary-color: #3B82F6;      /* Blue */
  --secondary-color: #6B7280;    /* Gray */
  --success-color: #10B981;      /* Green */
  --warning-color: #F59E0B;      /* Amber */
  --error-color: #EF4444;        /* Red */
  
  /* Dark mode support */
  --background: #FFFFFF;
  --foreground: #1F2937;
}

[data-theme="dark"] {
  --background: #1F2937;
  --foreground: #F9FAFB;
}
```

### Logo & Branding

```bash
# Replace logo files in public/images/
public/
├── images/
│   ├── logo.png          # Main logo
│   ├── logo-dark.png     # Dark mode logo
│   ├── favicon.ico       # Browser icon
│   └── og-image.png      # Social media preview

# Update company information in settings
```

---

## 🔧 System Configuration

### Application Settings

1. **Login as Admin**
2. **Navigate to Settings → System**
3. **Configure Basic Settings:**

```javascript
// Default settings to configure
{
  "company_name": "Your Company Name",
  "company_address": "Your Company Address",
  "vat_percentage": 11.00,
  "invoice_prefix": "INV",
  "currency_symbol": "Rp",
  "date_format": "DD/MM/YYYY",
  "timezone": "Asia/Jakarta",
  "language": "id",
  "auto_backup": true,
  "backup_retention_days": 30
}
```

### Bank Account Setup

1. **Navigate to Settings → Bank Accounts**
2. **Add Bank Account:**
   - Bank Name: e.g., "Bank BCA"
   - Account Number: Your account number
   - Account Name: Account holder name
   - Set as Default: Yes (for first account)

### User Management

1. **Navigate to Settings → Users**
2. **Create Additional Users:**
   - Finance Supervisor: Can manage invoices, mark as paid
   - Finance Staff: Can create invoices, manage data entry

---

## 📊 Data Import Setup

### Prepare Sample Data

#### Companies Excel Template

```csv
company_name,npwp,idtku,address,contact_phone,contact_email
"PT Example Corp","123456789012345","IDTKU001","Jakarta, Indonesia","+6281234567890","contact@example.com"
"PT Another Company","987654321098765","IDTKU002","Surabaya, Indonesia","+6281234567891","info@another.com"
```

#### TKA Workers Excel Template

```csv
nama,passport,divisi,jenis_kelamin
"John Smith","A12345678","Engineering","Laki-laki"
"Jane Doe","B87654321","Marketing","Perempuan"
"Bob Johnson","C11111111","Sales","Laki-laki"
```

### Import Process

1. **Navigate to Companies → Import**
2. **Upload Excel/CSV file**
3. **Map columns to database fields**
4. **Review and confirm import**
5. **Handle any errors**

---

## 🖨️ Printer Setup (Desktop App)

### Epson LX-300 Configuration

#### Windows Setup

```bash
# 1. Install printer drivers
# Download from Epson website: https://epson.com/support

# 2. Connect printer to computer
# USB or parallel port connection

# 3. Configure printer in Windows
# Control Panel → Devices and Printers → Add Printer

# 4. Test print
# Print test page from Windows printer settings
```

#### Application Configuration

1. **Open Desktop Application**
2. **Navigate to Settings → Printer**
3. **Configure Printer Settings:**
   - Printer Name: Select "Epson LX-300" from dropdown
   - Paper Size: Continuous form or A4
   - Print Quality: Draft for faster printing
   - Copies: Number of copies to print

### Desktop App Installation

```bash
# Build desktop application
npm run build:electron

# Install on Windows
# Run the generated .exe installer

# Install on macOS
# Open the generated .dmg file and drag to Applications

# Install on Linux
# Install the generated .deb or .rpm package
```

---

## 🔐 Security Configuration

### SSL/HTTPS Setup

#### Development (Self-Signed)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Update package.json script
"dev:https": "next dev --experimental-https --experimental-https-key ./key.pem --experimental-https-cert ./cert.pem"
```

#### Production (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/invoice-app
```

### Firewall Configuration

```bash
# Ubuntu/Debian firewall setup
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Development (if needed)
```

### Backup Setup

```bash
# Setup automated database backups
# Add to crontab
crontab -e

# Add backup script (runs daily at 2 AM)
0 2 * * * cd /var/www/invoice-app && npm run db:backup

# Test backup
npm run db:backup
```

---

## 🧪 Testing & Validation

### Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api        # API endpoint tests
npm run test:components # React component tests
npm run test:e2e        # End-to-end tests

# Run tests with coverage
npm run test:coverage
```

### Manual Testing Checklist

#### Authentication
- [ ] Login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Session timeout works
- [ ] Password change works
- [ ] Role-based access works

#### Core Functionality
- [ ] Create company
- [ ] Create TKA worker
- [ ] Create job description
- [ ] Create invoice
- [ ] Calculate totals correctly
- [ ] Generate PDF
- [ ] Print invoice (if printer available)

#### Data Integrity
- [ ] NPWP uniqueness enforced
- [ ] Passport uniqueness enforced
- [ ] Invoice number generation works
- [ ] VAT calculation with special rules
- [ ] Database constraints work

### Performance Testing

```bash
# Test database connection
npm run db:test

# Test API endpoints
npm run test:api:performance

# Monitor memory usage
npm run start:debug
```

---

## 📱 Mobile & Responsive Testing

### Test Different Screen Sizes

1. **Desktop**: 1920x1080, 1366x768
2. **Tablet**: 1024x768, 768x1024 (iPad)
3. **Mobile**: 375x667 (iPhone), 360x640 (Android)

### Browser Compatibility

- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions  
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions

### Touch Interface Testing

- Touch targets are at least 44px
- Swipe gestures work on mobile
- Form inputs are accessible on mobile
- Print function works on mobile browsers

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Database Connection Errors

```bash
# Error: Connection refused
# Solution: Check if PostgreSQL is running
sudo systemctl start postgresql

# Error: Authentication failed
# Solution: Check credentials in .env.local
echo $DATABASE_URL

# Error: Database does not exist
# Solution: Create database
createdb invoice_management
```

#### Build Errors

```bash
# Error: Out of memory
# Solution: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Error: Module not found
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Runtime Errors

```bash
# Error: Port 3000 already in use
# Solution: Kill process or use different port
lsof -ti:3000 | xargs kill -9
# OR
PORT=3001 npm run dev

# Error: Environment variable not found
# Solution: Check .env.local file exists and has correct variables
cat .env.local
```

### Debug Mode

```bash
# Start in debug mode
DEBUG=* npm run dev

# Database debug mode
DEBUG=db:* npm run dev

# API debug mode  
DEBUG=api:* npm run dev
```

### Get Help

- **Documentation**: Check docs/ folder for detailed guides
- **GitHub Issues**: Create issue with error details
- **Community**: Join Discord/Slack community
- **Support**: Email support team with logs and screenshots

---

## 📚 Next Steps

### After Successful Setup

1. **Change Default Passwords**: Update admin password
2. **Configure Settings**: Set company information, VAT rates
3. **Add Users**: Create accounts for team members
4. **Import Data**: Import existing companies and workers
5. **Create First Invoice**: Test the complete workflow
6. **Setup Backups**: Configure automated database backups
7. **Monitor Performance**: Check application performance
8. **Plan Training**: Train users on system features

### Advanced Configuration

- **Custom Reports**: Create custom report templates
- **API Integration**: Integrate with external systems
- **Automated Workflows**: Set up automated invoice processing
- **Advanced Security**: Implement 2FA, audit logging
- **Scaling**: Optimize for higher user loads

### Maintenance Schedule

- **Daily**: Monitor application logs, check backups
- **Weekly**: Review user activity, update dependencies
- **Monthly**: Security updates, performance optimization
- **Quarterly**: Database maintenance, feature updates

---

## 📋 Setup Checklist

### Pre-Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 13+ installed (or cloud database ready)
- [ ] Git installed
- [ ] Code editor/IDE ready

### Environment Setup
- [ ] Project cloned/downloaded
- [ ] Dependencies installed (`npm install`)
- [ ] Environment file created (`.env.local`)
- [ ] Database URL configured
- [ ] JWT secrets generated

### Database Setup
- [ ] Database created
- [ ] Connection tested
- [ ] Migrations run (`npm run db:migrate`)
- [ ] Initial data seeded (`npm run db:seed`)

### Application Setup
- [ ] Admin user created
- [ ] Application starts (`npm run dev`)
- [ ] Login tested
- [ ] Basic functionality verified

### Configuration
- [ ] Company settings configured
- [ ] Bank accounts added
- [ ] User roles configured
- [ ] Printer setup (if using desktop app)

### Security
- [ ] Default passwords changed
- [ ] HTTPS configured (production)
- [ ] Firewall configured (production)
- [ ] Backups configured

### Testing
- [ ] Authentication tested
- [ ] Core features tested
- [ ] Mobile responsiveness verified
- [ ] Performance acceptable

### Production (if applicable)
- [ ] Production environment configured
- [ ] SSL certificate installed
- [ ] Monitoring setup
- [ ] Backup schedule active
- [ ] Documentation updated

---

Congratulations! 🎉 Your Invoice Management System is now ready to use. Begin by creating your first company and TKA worker, then proceed to generate your first invoice.