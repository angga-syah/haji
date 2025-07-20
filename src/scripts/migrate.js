#!/usr/bin/env node

// src/scripts/migrate.js
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuration
const config = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:fsn285712@localhost:5432/invoice_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

// Migration SQL
const migrationSQL = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========== AUTHENTICATION & USERS ==========
-- Create users table (replaces Supabase auth.users for offline mode)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'finance_supervisor', 'finance_staff')) NOT NULL DEFAULT 'finance_staff',
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== COMPANIES ==========
CREATE TABLE IF NOT EXISTS companies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    npwp VARCHAR(20) NOT NULL UNIQUE,
    idtku VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin(company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_npwp ON companies(npwp);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- ========== TKA WORKERS ==========
CREATE TABLE IF NOT EXISTS tka_workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    passport VARCHAR(20) NOT NULL UNIQUE,
    divisi VARCHAR(100),
    jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')) NOT NULL DEFAULT 'Laki-laki',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tka_name_trgm ON tka_workers USING gin(nama gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tka_passport ON tka_workers(passport);
CREATE INDEX IF NOT EXISTS idx_tka_active ON tka_workers(is_active);

-- ========== TKA FAMILY MEMBERS ==========
CREATE TABLE IF NOT EXISTS tka_family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tka_id UUID NOT NULL REFERENCES tka_workers(id) ON DELETE CASCADE,
    nama VARCHAR(100) NOT NULL,
    passport VARCHAR(20) NOT NULL UNIQUE,
    jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')) NOT NULL DEFAULT 'Laki-laki',
    relationship VARCHAR(20) CHECK (relationship IN ('spouse', 'parent', 'child')) NOT NULL DEFAULT 'spouse',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== JOB DESCRIPTIONS ==========
CREATE TABLE IF NOT EXISTS job_descriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_name VARCHAR(200) NOT NULL,
    job_description TEXT NOT NULL,
    price DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_company_active ON job_descriptions(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_job_name_trgm ON job_descriptions USING gin(job_name gin_trgm_ops);

-- ========== BANK ACCOUNTS ==========
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint for default bank
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_default_bank') THEN
        CREATE UNIQUE INDEX unique_default_bank ON bank_accounts (is_default) WHERE is_default = true;
    END IF;
END
$$;

-- ========== INVOICES ==========
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    vat_percentage DECIMAL(5,2) NOT NULL DEFAULT 11.00,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(20) CHECK (status IN ('draft', 'finalized', 'paid', 'cancelled')) DEFAULT 'draft',
    notes TEXT,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    printed_count INTEGER DEFAULT 0,
    last_printed_at TIMESTAMPTZ,
    imported_from VARCHAR(100),
    import_batch_id VARCHAR(50),
    created_by UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_company_date ON invoices(company_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_created_by ON invoices(created_by);

-- ========== INVOICE LINES ==========
CREATE TABLE IF NOT EXISTS invoice_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    baris INTEGER NOT NULL,
    line_order INTEGER NOT NULL,
    tka_id UUID NOT NULL REFERENCES tka_workers(id) ON DELETE RESTRICT,
    job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE RESTRICT,
    custom_job_name VARCHAR(200),
    custom_job_description TEXT,
    custom_price DECIMAL(15,2),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    line_total DECIMAL(15,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id, line_order);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_tka ON invoice_lines(tka_id);

-- ========== APPLICATION SETTINGS ==========
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description VARCHAR(200),
    is_system BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== INVOICE NUMBER SEQUENCES ==========
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0 CHECK (current_number >= 0),
    prefix VARCHAR(10) DEFAULT 'INV',
    suffix VARCHAR(10) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (year, month),
    CHECK (month >= 1 AND month <= 12)
);

-- ========== MIGRATION TRACKING ==========
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT NOW()
);
`

async function checkConnection(pool) {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT version()')
    client.release()
    
    logSuccess('Database connection successful')
    logInfo(`PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`)
    return true
  } catch (error) {
    logError(`Database connection failed: ${error.message}`)
    return false
  }
}

async function runMigration(pool) {
  const client = await pool.connect()
  
  try {
    logInfo('Starting database migration...')
    
    // Run migration in a transaction
    await client.query('BEGIN')
    
    // Split SQL into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement) {
        await client.query(statement + ';')
      }
    }
    
    // Record migration
    await client.query(`
      INSERT INTO migrations (version) 
      VALUES ('001_initial_schema') 
      ON CONFLICT (version) DO NOTHING
    `)
    
    await client.query('COMMIT')
    logSuccess('Database migration completed successfully')
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function checkMigrationStatus(pool) {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT * FROM migrations ORDER BY executed_at DESC')
    client.release()
    
    if (result.rows.length === 0) {
      logWarning('No migrations found in database')
    } else {
      logInfo('Migration history:')
      result.rows.forEach(row => {
        console.log(`  - ${row.version} (${row.executed_at.toISOString()})`)
      })
    }
    
    return result.rows
  } catch (error) {
    logWarning('Could not check migration status (migrations table may not exist yet)')
    return []
  }
}

async function verifyTables(pool) {
  try {
    const client = await pool.connect()
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    client.release()
    
    const expectedTables = [
      'users', 'profiles', 'companies', 'tka_workers', 'tka_family_members',
      'job_descriptions', 'bank_accounts', 'invoices', 'invoice_lines',
      'app_settings', 'invoice_sequences', 'migrations'
    ]
    
    const existingTables = result.rows.map(row => row.table_name)
    const missingTables = expectedTables.filter(table => !existingTables.includes(table))
    
    if (missingTables.length === 0) {
      logSuccess('All required tables exist')
    } else {
      logWarning(`Missing tables: ${missingTables.join(', ')}`)
    }
    
    logInfo('Existing tables:')
    existingTables.forEach(table => {
      console.log(`  - ${table}`)
    })
    
    return { existing: existingTables, missing: missingTables }
  } catch (error) {
    logError(`Error verifying tables: ${error.message}`)
    return { existing: [], missing: [] }
  }
}

async function main() {
  log('🚀 Invoice Management System - Database Migration', colors.bright)
  log('=' * 60, colors.cyan)
  
  const pool = new Pool(config)
  
  try {
    // Check database connection
    const connected = await checkConnection(pool)
    if (!connected) {
      process.exit(1)
    }
    
    // Check current migration status
    await checkMigrationStatus(pool)
    
    // Ask for confirmation in production
    if (process.env.NODE_ENV === 'production') {
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise(resolve => {
        rl.question('⚠️  Running migration in PRODUCTION. Continue? (y/N): ', resolve)
      })
      
      rl.close()
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        logInfo('Migration cancelled by user')
        process.exit(0)
      }
    }
    
    // Run migration
    await runMigration(pool)
    
    // Verify tables
    await verifyTables(pool)
    
    logSuccess('Migration completed successfully! 🎉')
    
  } catch (error) {
    logError(`Migration failed: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Invoice Management System - Database Migration

Usage: node migrate.js [options]

Options:
  --help, -h     Show this help message
  --verify       Only verify tables without running migration
  --status       Show migration status

Environment Variables:
  DATABASE_URL   PostgreSQL connection string
                 Default: postgresql://postgres:fsn285712@localhost:5432/invoice_db
  NODE_ENV       Environment (development/production)

Examples:
  node migrate.js                    # Run migration
  node migrate.js --verify           # Verify tables only
  node migrate.js --status           # Show migration status
`)
  process.exit(0)
}

if (args.includes('--verify')) {
  // Verify only mode
  const pool = new Pool(config)
  checkConnection(pool)
    .then(() => verifyTables(pool))
    .then(() => pool.end())
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
} else if (args.includes('--status')) {
  // Status only mode
  const pool = new Pool(config)
  checkConnection(pool)
    .then(() => checkMigrationStatus(pool))
    .then(() => pool.end())
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
} else {
  // Run main migration
  main()
}

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Migration interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('Migration terminated')
  process.exit(1)
})