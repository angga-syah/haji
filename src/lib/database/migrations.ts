// src/lib/database/migrations.ts
import { Database } from './index'
import fs from 'fs'
import path from 'path'

interface Migration {
  id: string
  name: string
  up: string
  down: string
  applied_at?: Date
}

export class MigrationRunner {
  private migrationsTable = 'schema_migrations'

  constructor() {
    this.ensureMigrationsTable()
  }

  // Ensure migrations tracking table exists
  private async ensureMigrationsTable() {
    await Database.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
  }

  // Get list of applied migrations
  async getAppliedMigrations(): Promise<string[]> {
    const result = await Database.query(
      `SELECT id FROM ${this.migrationsTable} ORDER BY applied_at`
    )
    return result.map(row => row.id)
  }

  // Run all pending migrations
  async runMigrations(migrationsDir?: string): Promise<void> {
    const migrationFiles = this.getMigrationFiles(migrationsDir)
    const appliedMigrations = await this.getAppliedMigrations()
    
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.includes(file.id)
    )

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Running ${pendingMigrations.length} pending migrations...`)

    for (const migration of pendingMigrations) {
      await this.runMigration(migration)
    }

    console.log('All migrations completed successfully')
  }

  // Run a single migration
  private async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration: ${migration.name}`)
    
    try {
      await Database.transaction(async (client) => {
        // Execute migration SQL
        await client.query(migration.up)
        
        // Record migration as applied
        await client.query(
          `INSERT INTO ${this.migrationsTable} (id, name) VALUES ($1, $2)`,
          [migration.id, migration.name]
        )
      })
      
      console.log(`✓ Migration ${migration.name} completed`)
    } catch (error) {
      console.error(`✗ Migration ${migration.name} failed:`, error)
      throw error
    }
  }

  // Rollback the last migration
  async rollbackMigration(): Promise<void> {
    const appliedMigrations = await Database.query(
      `SELECT id, name FROM ${this.migrationsTable} ORDER BY applied_at DESC LIMIT 1`
    )

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback')
      return
    }

    const lastMigration = appliedMigrations[0]
    const migrationFiles = this.getMigrationFiles()
    const migrationFile = migrationFiles.find(f => f.id === lastMigration.id)

    if (!migrationFile) {
      throw new Error(`Migration file not found for: ${lastMigration.name}`)
    }

    console.log(`Rolling back migration: ${migrationFile.name}`)

    try {
      await Database.transaction(async (client) => {
        // Execute rollback SQL
        await client.query(migrationFile.down)
        
        // Remove migration record
        await client.query(
          `DELETE FROM ${this.migrationsTable} WHERE id = $1`,
          [lastMigration.id]
        )
      })
      
      console.log(`✓ Migration ${migrationFile.name} rolled back`)
    } catch (error) {
      console.error(`✗ Rollback failed:`, error)
      throw error
    }
  }

  // Get migration files from directory
  private getMigrationFiles(migrationsDir?: string): Migration[] {
    const dir = migrationsDir || path.join(process.cwd(), 'migrations')
    
    if (!fs.existsSync(dir)) {
      return this.getBuiltInMigrations()
    }

    const files = fs.readdirSync(dir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    return files.map(file => {
      const filePath = path.join(dir, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const [up, down] = content.split('-- DOWN')
      
      return {
        id: file.replace('.sql', ''),
        name: file,
        up: up.replace('-- UP', '').trim(),
        down: (down || '').trim()
      }
    })
  }

  // Built-in migrations for core system
  private getBuiltInMigrations(): Migration[] {
    return [
      {
        id: '001_create_initial_schema',
        name: 'Create initial schema',
        up: `
          -- Create users table
          CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Create profiles table
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

          -- Create companies table
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

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin(company_name gin_trgm_ops);
          CREATE INDEX IF NOT EXISTS idx_companies_npwp ON companies(npwp);
          CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
        `,
        down: `
          DROP INDEX IF EXISTS idx_companies_active;
          DROP INDEX IF EXISTS idx_companies_npwp;
          DROP INDEX IF EXISTS idx_companies_name_trgm;
          DROP TABLE IF EXISTS companies;
          DROP TABLE IF EXISTS profiles;
          DROP TABLE IF EXISTS users;
        `
      },
      {
        id: '002_create_tka_tables',
        name: 'Create TKA worker tables',
        up: `
          -- Create TKA workers table
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

          -- Create TKA family members table
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

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_tka_name_trgm ON tka_workers USING gin(nama gin_trgm_ops);
          CREATE INDEX IF NOT EXISTS idx_tka_passport ON tka_workers(passport);
          CREATE INDEX IF NOT EXISTS idx_tka_active ON tka_workers(is_active);
        `,
        down: `
          DROP INDEX IF EXISTS idx_tka_active;
          DROP INDEX IF EXISTS idx_tka_passport;
          DROP INDEX IF EXISTS idx_tka_name_trgm;
          DROP TABLE IF EXISTS tka_family_members;
          DROP TABLE IF EXISTS tka_workers;
        `
      },
      {
        id: '003_create_job_descriptions',
        name: 'Create job descriptions table',
        up: `
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

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_job_company_active ON job_descriptions(company_id, is_active);
          CREATE INDEX IF NOT EXISTS idx_job_name_trgm ON job_descriptions USING gin(job_name gin_trgm_ops);
        `,
        down: `
          DROP INDEX IF EXISTS idx_job_name_trgm;
          DROP INDEX IF EXISTS idx_job_company_active;
          DROP TABLE IF EXISTS job_descriptions;
        `
      },
      {
        id: '004_create_invoices',
        name: 'Create invoices and related tables',
        up: `
          -- Create bank accounts table
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

          -- Create invoices table
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

          -- Create invoice lines table
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

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_invoice_number ON invoices(invoice_number);
          CREATE INDEX IF NOT EXISTS idx_invoice_company_date ON invoices(company_id, invoice_date DESC);
          CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);
          CREATE INDEX IF NOT EXISTS idx_invoice_created_by ON invoices(created_by);
          CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id, line_order);
          CREATE INDEX IF NOT EXISTS idx_invoice_lines_tka ON invoice_lines(tka_id);

          -- Create unique constraint for default bank
          CREATE UNIQUE INDEX IF NOT EXISTS unique_default_bank ON bank_accounts (is_default) WHERE is_default = true;
        `,
        down: `
          DROP INDEX IF EXISTS unique_default_bank;
          DROP INDEX IF EXISTS idx_invoice_lines_tka;
          DROP INDEX IF EXISTS idx_invoice_lines_invoice_id;
          DROP INDEX IF EXISTS idx_invoice_created_by;
          DROP INDEX IF EXISTS idx_invoice_status;
          DROP INDEX IF EXISTS idx_invoice_company_date;
          DROP INDEX IF EXISTS idx_invoice_number;
          DROP TABLE IF EXISTS invoice_lines;
          DROP TABLE IF EXISTS invoices;
          DROP TABLE IF EXISTS bank_accounts;
        `
      },
      {
        id: '005_create_system_tables',
        name: 'Create system tables',
        up: `
          -- Create app settings table
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

          -- Create invoice sequences table
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
        `,
        down: `
          DROP TABLE IF EXISTS invoice_sequences;
          DROP TABLE IF EXISTS app_settings;
        `
      }
    ]
  }

  // Reset all migrations (dangerous!)
  async resetMigrations(): Promise<void> {
    console.log('⚠️  WARNING: Resetting all migrations...')
    
    await Database.query(`DROP TABLE IF EXISTS ${this.migrationsTable}`)
    await this.ensureMigrationsTable()
    
    console.log('All migrations reset')
  }

  // Get migration status
  async getMigrationStatus(): Promise<{
    total: number
    applied: number
    pending: string[]
  }> {
    const migrationFiles = this.getMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    
    const pending = migrationFiles
      .filter(file => !appliedMigrations.includes(file.id))
      .map(file => file.name)

    return {
      total: migrationFiles.length,
      applied: appliedMigrations.length,
      pending
    }
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner()

// Convenience functions
export const runMigrations = () => migrationRunner.runMigrations()
export const rollbackMigration = () => migrationRunner.rollbackMigration()
export const getMigrationStatus = () => migrationRunner.getMigrationStatus()
export const resetMigrations = () => migrationRunner.resetMigrations()