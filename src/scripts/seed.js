#!/usr/bin/env node

// src/scripts/seed.js
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

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

// Sample data
const sampleData = {
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@spiritofservices.com',
      password: 'admin123', // Will be hashed
      profile: {
        username: 'admin',
        role: 'admin',
        full_name: 'System Administrator'
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'supervisor@spiritofservices.com',
      password: 'supervisor123',
      profile: {
        username: 'supervisor',
        role: 'finance_supervisor',
        full_name: 'Finance Supervisor'
      }
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'staff@spiritofservices.com',
      password: 'staff123',
      profile: {
        username: 'staff',
        role: 'finance_staff',
        full_name: 'Finance Staff'
      }
    }
  ],

  bankAccounts: [
    {
      bank_name: 'Bank Central Asia (BCA)',
      account_number: '1234567890',
      account_name: 'PT Spirit of Services',
      is_default: true,
      sort_order: 1
    },
    {
      bank_name: 'Bank Mandiri',
      account_number: '0987654321',
      account_name: 'PT Spirit of Services',
      is_default: false,
      sort_order: 2
    },
    {
      bank_name: 'Bank Negara Indonesia (BNI)',
      account_number: '5555666677',
      account_name: 'PT Spirit of Services',
      is_default: false,
      sort_order: 3
    }
  ],

  companies: [
    {
      company_name: 'PT Teknologi Maju Indonesia',
      npwp: '123456789012345',
      idtku: 'IDTKU001',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat 10110, DKI Jakarta',
      contact_phone: '+62-21-12345678',
      contact_email: 'contact@teknologimaju.com'
    },
    {
      company_name: 'CV Konstruksi Bangunan Sejahtera',
      npwp: '987654321098765',
      idtku: 'IDTKU002',
      address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan 12190, DKI Jakarta',
      contact_phone: '+62-21-87654321',
      contact_email: 'info@konstruksibangunan.com'
    },
    {
      company_name: 'PT Manufacturing Solutions Indonesia',
      npwp: '555666777888999',
      idtku: 'IDTKU003',
      address: 'Kawasan Industri MM2100, Blok A-1, Bekasi 17520, Jawa Barat',
      contact_phone: '+62-21-99887766',
      contact_email: 'hello@manufacturingsolutions.com'
    },
    {
      company_name: 'PT Global Trade Enterprises',
      npwp: '111222333444555',
      idtku: 'IDTKU004',
      address: 'Jl. HR Rasuna Said No. 789, Kuningan, Jakarta Selatan 12940',
      contact_phone: '+62-21-55544433',
      contact_email: 'trade@globalenterprises.co.id'
    },
    {
      company_name: 'CV Agro Industri Nusantara',
      npwp: '777888999000111',
      idtku: 'IDTKU005',
      address: 'Jl. Raya Bogor KM 25, Cibinong, Bogor 16911, Jawa Barat',
      contact_phone: '+62-21-77889900',
      contact_email: 'agro@nusantara.com'
    }
  ],

  tkaWorkers: [
    {
      nama: 'John Michael Smith',
      passport: 'A12345678',
      divisi: 'Engineering & Technology',
      jenis_kelamin: 'Laki-laki'
    },
    {
      nama: 'Sarah Elizabeth Johnson',
      passport: 'B87654321',
      divisi: 'Project Management',
      jenis_kelamin: 'Perempuan'
    },
    {
      nama: 'Michael David Brown',
      passport: 'C11223344',
      divisi: 'Technical Supervision',
      jenis_kelamin: 'Laki-laki'
    },
    {
      nama: 'Emma Katherine Wilson',
      passport: 'D55667788',
      divisi: 'Quality Control & Assurance',
      jenis_kelamin: 'Perempuan'
    },
    {
      nama: 'James Robert Taylor',
      passport: 'E99887766',
      divisi: 'Operations Management',
      jenis_kelamin: 'Laki-laki'
    },
    {
      nama: 'Lisa Marie Anderson',
      passport: 'F44556677',
      divisi: 'Human Resources',
      jenis_kelamin: 'Perempuan'
    },
    {
      nama: 'Robert William Davis',
      passport: 'G33445566',
      divisi: 'Financial Planning',
      jenis_kelamin: 'Laki-laki'
    },
    {
      nama: 'Jennifer Anne Miller',
      passport: 'H22334455',
      divisi: 'Marketing & Sales',
      jenis_kelamin: 'Perempuan'
    }
  ],

  jobDescriptions: [
    {
      job_name: 'Technical Consultant',
      job_description: 'Providing technical consultation and expertise for project development, system analysis, and technology implementation.',
      price: 15000000
    },
    {
      job_name: 'Project Manager',
      job_description: 'Managing and overseeing project execution from planning to completion, ensuring timely delivery and quality standards.',
      price: 18000000
    },
    {
      job_name: 'Engineering Supervisor',
      job_description: 'Supervising engineering activities, coordinating technical teams, and ensuring compliance with engineering standards.',
      price: 12000000
    },
    {
      job_name: 'Quality Control Inspector',
      job_description: 'Inspecting products and processes, ensuring quality compliance, and implementing quality assurance procedures.',
      price: 10000000
    },
    {
      job_name: 'Operations Manager',
      job_description: 'Managing daily operations, optimizing workflow processes, and coordinating between different departments.',
      price: 16000000
    },
    {
      job_name: 'Technical Training Specialist',
      job_description: 'Developing and conducting technical training programs for local staff and knowledge transfer activities.',
      price: 13000000
    },
    {
      job_name: 'Safety Coordinator',
      job_description: 'Implementing safety protocols, conducting safety audits, and ensuring workplace safety compliance.',
      price: 11000000
    },
    {
      job_name: 'Business Development Manager',
      job_description: 'Identifying business opportunities, developing strategic partnerships, and expanding market presence.',
      price: 20000000
    }
  ],

  appSettings: [
    {
      setting_key: 'vat_percentage',
      setting_value: '11.0',
      setting_type: 'number',
      description: 'Default VAT percentage for invoices'
    },
    {
      setting_key: 'company_info',
      setting_value: JSON.stringify({
        name: 'Spirit of Services',
        address: 'Jakarta Office, Indonesia',
        phone: '+62-21-12345678',
        email: 'info@spiritofservices.com',
        website: 'https://spiritofservices.com'
      }),
      setting_type: 'json',
      description: 'Company information for invoices and documents'
    },
    {
      setting_key: 'invoice_prefix',
      setting_value: '"INV"',
      setting_type: 'string',
      description: 'Default prefix for invoice numbers'
    },
    {
      setting_key: 'default_terms',
      setting_value: JSON.stringify({
        payment_terms: '30 days',
        late_fee: '2% per month',
        currency: 'IDR'
      }),
      setting_type: 'json',
      description: 'Default invoice terms and conditions'
    }
  ]
}

class DatabaseSeeder {
  constructor(pool) {
    this.pool = pool
    this.createdIds = {}
  }

  async checkTableExists(tableName) {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      return result.rows[0].exists
    } catch (error) {
      logError(`Error checking table ${tableName}: ${error.message}`)
      return false
    }
  }

  async seedUsers() {
    logInfo('Seeding users and profiles...')
    
    for (const userData of sampleData.users) {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12)
        
        // Insert user
        await this.pool.query(`
          INSERT INTO users (id, email, password_hash, email_verified)
          VALUES ($1, $2, $3, true)
          ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            updated_at = NOW()
        `, [userData.id, userData.email, hashedPassword])

        // Insert profile
        await this.pool.query(`
          INSERT INTO profiles (id, username, role, full_name, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            username = EXCLUDED.username,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            updated_at = NOW()
        `, [
          userData.id,
          userData.profile.username,
          userData.profile.role,
          userData.profile.full_name
        ])

        this.createdIds.adminUserId = userData.id
        logSuccess(`Created user: ${userData.email} (${userData.profile.role})`)
        
      } catch (error) {
        logError(`Error seeding user ${userData.email}: ${error.message}`)
      }
    }
  }

  async seedBankAccounts() {
    logInfo('Seeding bank accounts...')
    
    for (const bankData of sampleData.bankAccounts) {
      try {
        await this.pool.query(`
          INSERT INTO bank_accounts (bank_name, account_number, account_name, is_default, sort_order, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (account_number) DO UPDATE SET 
            bank_name = EXCLUDED.bank_name,
            account_name = EXCLUDED.account_name,
            is_default = EXCLUDED.is_default,
            sort_order = EXCLUDED.sort_order,
            updated_at = NOW()
        `, [
          bankData.bank_name,
          bankData.account_number,
          bankData.account_name,
          bankData.is_default,
          bankData.sort_order,
          this.createdIds.adminUserId
        ])

        logSuccess(`Created bank account: ${bankData.bank_name}`)
        
      } catch (error) {
        logError(`Error seeding bank account ${bankData.bank_name}: ${error.message}`)
      }
    }
  }

  async seedCompanies() {
    logInfo('Seeding companies...')
    
    this.createdIds.companies = []
    
    for (const companyData of sampleData.companies) {
      try {
        const result = await this.pool.query(`
          INSERT INTO companies (company_name, npwp, idtku, address, contact_phone, contact_email, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (npwp) DO UPDATE SET 
            company_name = EXCLUDED.company_name,
            idtku = EXCLUDED.idtku,
            address = EXCLUDED.address,
            contact_phone = EXCLUDED.contact_phone,
            contact_email = EXCLUDED.contact_email,
            updated_at = NOW()
          RETURNING id
        `, [
          companyData.company_name,
          companyData.npwp,
          companyData.idtku,
          companyData.address,
          companyData.contact_phone,
          companyData.contact_email,
          this.createdIds.adminUserId
        ])

        this.createdIds.companies.push(result.rows[0].id)
        logSuccess(`Created company: ${companyData.company_name}`)
        
      } catch (error) {
        logError(`Error seeding company ${companyData.company_name}: ${error.message}`)
      }
    }
  }

  async seedTKAWorkers() {
    logInfo('Seeding TKA workers...')
    
    this.createdIds.tkaWorkers = []
    
    for (const workerData of sampleData.tkaWorkers) {
      try {
        const result = await this.pool.query(`
          INSERT INTO tka_workers (nama, passport, divisi, jenis_kelamin, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (passport) DO UPDATE SET 
            nama = EXCLUDED.nama,
            divisi = EXCLUDED.divisi,
            jenis_kelamin = EXCLUDED.jenis_kelamin,
            updated_at = NOW()
          RETURNING id
        `, [
          workerData.nama,
          workerData.passport,
          workerData.divisi,
          workerData.jenis_kelamin,
          this.createdIds.adminUserId
        ])

        this.createdIds.tkaWorkers.push(result.rows[0].id)
        logSuccess(`Created TKA worker: ${workerData.nama}`)
        
      } catch (error) {
        logError(`Error seeding TKA worker ${workerData.nama}: ${error.message}`)
      }
    }
  }

  async seedJobDescriptions() {
    logInfo('Seeding job descriptions...')
    
    // Create job descriptions for each company
    for (const companyId of this.createdIds.companies) {
      for (const [index, jobData] of sampleData.jobDescriptions.entries()) {
        try {
          await this.pool.query(`
            INSERT INTO job_descriptions (company_id, job_name, job_description, price, sort_order, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `, [
            companyId,
            jobData.job_name,
            jobData.job_description,
            jobData.price,
            index + 1,
            this.createdIds.adminUserId
          ])

        } catch (error) {
          logError(`Error seeding job description ${jobData.job_name}: ${error.message}`)
        }
      }
    }
    
    logSuccess(`Created job descriptions for ${this.createdIds.companies.length} companies`)
  }

  async seedInvoiceSequences() {
    logInfo('Seeding invoice sequences...')
    
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    
    try {
      await this.pool.query(`
        INSERT INTO invoice_sequences (year, month, current_number, prefix, created_at, updated_at)
        VALUES ($1, $2, 0, 'INV', NOW(), NOW())
        ON CONFLICT (year, month) DO NOTHING
      `, [currentYear, currentMonth])

      logSuccess(`Created invoice sequence for ${currentYear}-${String(currentMonth).padStart(2, '0')}`)
      
    } catch (error) {
      logError(`Error seeding invoice sequences: ${error.message}`)
    }
  }

  async seedAppSettings() {
    logInfo('Seeding application settings...')
    
    for (const settingData of sampleData.appSettings) {
      try {
        await this.pool.query(`
          INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (setting_key) DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            setting_type = EXCLUDED.setting_type,
            description = EXCLUDED.description,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
        `, [
          settingData.setting_key,
          settingData.setting_value,
          settingData.setting_type,
          settingData.description,
          this.createdIds.adminUserId
        ])

        logSuccess(`Created setting: ${settingData.setting_key}`)
        
      } catch (error) {
        logError(`Error seeding setting ${settingData.setting_key}: ${error.message}`)
      }
    }
  }

  async clearAllData() {
    logWarning('Clearing all existing data...')
    
    const tables = [
      'invoice_lines',
      'invoices',
      'job_descriptions',
      'tka_family_members',
      'tka_workers',
      'companies',
      'bank_accounts',
      'invoice_sequences',
      'app_settings',
      'profiles',
      'users'
    ]

    for (const table of tables) {
      try {
        const tableExists = await this.checkTableExists(table)
        if (tableExists) {
          await this.pool.query(`DELETE FROM ${table}`)
          logInfo(`Cleared table: ${table}`)
        }
      } catch (error) {
        logError(`Error clearing table ${table}: ${error.message}`)
      }
    }
  }

  async seed(options = {}) {
    const { clear = false } = options
    
    try {
      if (clear) {
        await this.clearAllData()
      }

      // Check if required tables exist
      const requiredTables = ['users', 'profiles', 'companies', 'tka_workers', 'job_descriptions', 'bank_accounts']
      for (const table of requiredTables) {
        const exists = await this.checkTableExists(table)
        if (!exists) {
          throw new Error(`Required table '${table}' does not exist. Please run migrations first.`)
        }
      }

      await this.seedUsers()
      await this.seedBankAccounts()
      await this.seedCompanies()
      await this.seedTKAWorkers()
      await this.seedJobDescriptions()
      await this.seedInvoiceSequences()
      await this.seedAppSettings()
      
      logSuccess('Database seeding completed successfully! 🎉')
      
      // Show summary
      logInfo('Seeding Summary:')
      console.log(`  - Users: ${sampleData.users.length}`)
      console.log(`  - Bank Accounts: ${sampleData.bankAccounts.length}`)
      console.log(`  - Companies: ${sampleData.companies.length}`)
      console.log(`  - TKA Workers: ${sampleData.tkaWorkers.length}`)
      console.log(`  - Job Descriptions: ${sampleData.jobDescriptions.length * sampleData.companies.length}`)
      console.log(`  - App Settings: ${sampleData.appSettings.length}`)
      
      logInfo('Default Login Credentials:')
      console.log(`  Admin: admin@spiritofservices.com / admin123`)
      console.log(`  Supervisor: supervisor@spiritofservices.com / supervisor123`)
      console.log(`  Staff: staff@spiritofservices.com / staff123`)
      
    } catch (error) {
      logError(`Seeding failed: ${error.message}`)
      throw error
    }
  }
}

async function main() {
  log('🌱 Invoice Management System - Database Seeding', colors.bright)
  log('=' * 60, colors.cyan)
  
  const pool = new Pool(config)
  
  try {
    // Test connection
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    logSuccess('Database connection successful')
    
    const seeder = new DatabaseSeeder(pool)
    
    // Parse command line arguments
    const args = process.argv.slice(2)
    const options = {
      clear: args.includes('--clear') || args.includes('--fresh')
    }
    
    // Ask for confirmation if clearing data
    if (options.clear) {
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise(resolve => {
        rl.question('⚠️  This will clear ALL existing data. Continue? (y/N): ', resolve)
      })
      
      rl.close()
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        logInfo('Seeding cancelled by user')
        process.exit(0)
      }
    }
    
    await seeder.seed(options)
    
  } catch (error) {
    logError(`Seeding failed: ${error.message}`)
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
Invoice Management System - Database Seeding

Usage: node seed.js [options]

Options:
  --help, -h     Show this help message
  --clear        Clear all existing data before seeding
  --fresh        Same as --clear

Environment Variables:
  DATABASE_URL   PostgreSQL connection string
                 Default: postgresql://postgres:fsn285712@localhost:5432/invoice_db

Examples:
  node seed.js                    # Seed data (skip existing)
  node seed.js --clear            # Clear all data and reseed
  node seed.js --fresh            # Same as --clear
`)
  process.exit(0)
}

// Run main function
main()

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Seeding interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('Seeding terminated')
  process.exit(1)
})