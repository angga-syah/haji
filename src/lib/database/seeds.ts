// src/lib/database/seeds.ts
import { Database } from './index'
import bcrypt from 'bcryptjs'

export class DatabaseSeeder {
  static async seedAll(): Promise<void> {
    console.log('Starting database seeding...')
    
    try {
      await this.seedUsers()
      await this.seedBankAccounts()
      await this.seedCompanies()
      await this.seedTKAWorkers()
      await this.seedJobDescriptions()
      await this.seedInvoiceSequences()
      await this.seedAppSettings()
      
      console.log('Database seeding completed successfully!')
    } catch (error) {
      console.error('Database seeding failed:', error)
      throw error
    }
  }

  static async seedUsers(): Promise<void> {
    console.log('Seeding users...')
    
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const users = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@spiritofservices.com',
        password_hash: hashedPassword
      },
      {
        id: '00000000-0000-0000-0000-000000000002', 
        email: 'supervisor@spiritofservices.com',
        password_hash: hashedPassword
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'staff@spiritofservices.com', 
        password_hash: hashedPassword
      }
    ]

    const profiles = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        role: 'admin',
        full_name: 'System Administrator'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'supervisor',
        role: 'finance_supervisor', 
        full_name: 'Finance Supervisor'
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'staff',
        role: 'finance_staff',
        full_name: 'Finance Staff'
      }
    ]

    for (const user of users) {
      await Database.query(`
        INSERT INTO users (id, email, password_hash, email_verified)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.email, user.password_hash])
    }

    for (const profile of profiles) {
      await Database.query(`
        INSERT INTO profiles (id, username, role, full_name)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO NOTHING
      `, [profile.id, profile.username, profile.role, profile.full_name])
    }
  }

  static async seedBankAccounts(): Promise<void> {
    console.log('Seeding bank accounts...')
    
    const bankAccounts = [
      {
        bank_name: 'Bank Central Asia (BCA)',
        account_number: '1234567890',
        account_name: 'PT Spirit of Services',
        is_default: true,
        sort_order: 1,
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        bank_name: 'Bank Mandiri',
        account_number: '0987654321',
        account_name: 'PT Spirit of Services',
        is_default: false,
        sort_order: 2,
        created_by: '00000000-0000-0000-0000-000000000001'
      }
    ]

    for (const account of bankAccounts) {
      await Database.query(`
        INSERT INTO bank_accounts (bank_name, account_number, account_name, is_default, sort_order, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (account_number) DO NOTHING
      `, [
        account.bank_name,
        account.account_number, 
        account.account_name,
        account.is_default,
        account.sort_order,
        account.created_by
      ])
    }
  }

  static async seedCompanies(): Promise<void> {
    console.log('Seeding companies...')
    
    const companies = [
      {
        company_name: 'PT Teknologi Maju Indonesia',
        npwp: '123456789012345',
        idtku: 'IDTKU001',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat 10110',
        contact_phone: '+62-21-12345678',
        contact_email: 'contact@teknologimaju.com',
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        company_name: 'CV Konstruksi Bangunan',
        npwp: '987654321098765',
        idtku: 'IDTKU002', 
        address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan 12190',
        contact_phone: '+62-21-87654321',
        contact_email: 'info@konstruksibangunan.com',
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        company_name: 'PT Manufacturing Solutions',
        npwp: '555666777888999',
        idtku: 'IDTKU003',
        address: 'Kawasan Industri MM2100, Bekasi 17520',
        contact_phone: '+62-21-99887766',
        contact_email: 'hello@manufacturingsolutions.com',
        created_by: '00000000-0000-0000-0000-000000000001'
      }
    ]

    for (const company of companies) {
      await Database.query(`
        INSERT INTO companies (company_name, npwp, idtku, address, contact_phone, contact_email, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (npwp) DO NOTHING
      `, [
        company.company_name,
        company.npwp,
        company.idtku,
        company.address,
        company.contact_phone,
        company.contact_email,
        company.created_by
      ])
    }
  }

  static async seedTKAWorkers(): Promise<void> {
    console.log('Seeding TKA workers...')
    
    const workers = [
      {
        nama: 'John Smith',
        passport: 'A12345678',
        divisi: 'Engineering',
        jenis_kelamin: 'Laki-laki',
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        nama: 'Sarah Johnson',
        passport: 'B87654321',
        divisi: 'Project Management',
        jenis_kelamin: 'Perempuan',
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        nama: 'Michael Brown',
        passport: 'C11223344',
        divisi: 'Technical Supervision',
        jenis_kelamin: 'Laki-laki',
        created_by: '00000000-0000-0000-0000-000000000001'
      },
      {
        nama: 'Emma Wilson',
        passport: 'D55667788',
        divisi: 'Quality Control',
        jenis_kelamin: 'Perempuan',
        created_by: '00000000-0000-0000-0000-000000000001'
      }
    ]

    for (const worker of workers) {
      await Database.query(`
        INSERT INTO tka_workers (nama, passport, divisi, jenis_kelamin, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (passport) DO NOTHING
      `, [
        worker.nama,
        worker.passport,
        worker.divisi,
        worker.jenis_kelamin,
        worker.created_by
      ])
    }
  }

  static async seedJobDescriptions(): Promise<void> {
    console.log('Seeding job descriptions...')
    
    // Get company IDs first
    const companies = await Database.query('SELECT id, company_name FROM companies LIMIT 3')
    
    const jobTemplates = [
      {
        job_name: 'Technical Consultant',
        job_description: 'Providing technical consultation and expertise for project development',
        price: 15000000
      },
      {
        job_name: 'Project Manager',
        job_description: 'Managing and overseeing project execution from start to completion', 
        price: 18000000
      },
      {
        job_name: 'Engineering Supervisor',
        job_description: 'Supervising engineering activities and ensuring quality standards',
        price: 12000000
      },
      {
        job_name: 'Quality Control Inspector',
        job_description: 'Inspecting and ensuring quality compliance for all deliverables',
        price: 10000000
      }
    ]

    for (const company of companies) {
      for (const [index, job] of jobTemplates.entries()) {
        await Database.query(`
          INSERT INTO job_descriptions (company_id, job_name, job_description, price, sort_order, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          company.id,
          job.job_name,
          job.job_description,
          job.price,
          index + 1,
          '00000000-0000-0000-0000-000000000001'
        ])
      }
    }
  }

  static async seedInvoiceSequences(): Promise<void> {
    console.log('Seeding invoice sequences...')
    
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    
    await Database.query(`
      INSERT INTO invoice_sequences (year, month, current_number, prefix)
      VALUES ($1, $2, 0, 'INV')
      ON CONFLICT (year, month) DO NOTHING
    `, [currentYear, currentMonth])
  }

  static async seedAppSettings(): Promise<void> {
    console.log('Seeding app settings...')
    
    const settings = [
      {
        setting_key: 'vat_percentage',
        setting_value: JSON.stringify(11.0),
        setting_type: 'number',
        description: 'Default VAT percentage for invoices'
      },
      {
        setting_key: 'company_info',
        setting_value: JSON.stringify({
          name: 'Spirit of Services',
          address: 'Jakarta Office, Indonesia',
          phone: '+62-21-12345678',
          email: 'info@spiritofservices.com'
        }),
        setting_type: 'json',
        description: 'Company information for invoices'
      },
      {
        setting_key: 'invoice_prefix',
        setting_value: JSON.stringify('INV'),
        setting_type: 'string',
        description: 'Default prefix for invoice numbers'
      }
    ]

    for (const setting of settings) {
      await Database.query(`
        INSERT INTO app_settings (setting_key, setting_value, setting_type, description, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (setting_key) DO NOTHING
      `, [
        setting.setting_key,
        setting.setting_value,
        setting.setting_type,
        setting.description,
        '00000000-0000-0000-0000-000000000001'
      ])
    }
  }

  static async clearAll(): Promise<void> {
    console.log('Clearing all data...')
    
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
      await Database.query(`DELETE FROM ${table}`)
    }
  }
}

// Convenience functions
export const seedDatabase = DatabaseSeeder.seedAll
export const clearDatabase = DatabaseSeeder.clearAll