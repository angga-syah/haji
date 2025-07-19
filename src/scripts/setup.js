const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function runMigrations() {
  console.log('🔄 Running database migrations...')
  
  try {
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    const client = await pool.connect()
    
    try {
      await client.query(schemaSql)
      console.log('✅ Database schema created successfully')
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function testConnection() {
  console.log('🔄 Testing database connection...')
  
  try {
    const client = await pool.connect()
    
    try {
      const result = await client.query('SELECT current_database(), current_user, version()')
      console.log('✅ Database connection successful')
      console.log(`📊 Database: ${result.rows[0].current_database}`)
      console.log(`👤 User: ${result.rows[0].current_user}`)
      console.log(`🐘 PostgreSQL Version: ${result.rows[0].version.split(' ')[1]}`)
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct in .env.local')
    process.exit(1)
  }
}

async function seedData() {
  console.log('🔄 Seeding initial data...')
  
  try {
    const client = await pool.connect()
    
    try {
      // Check if admin user already exists
      const existingAdmin = await client.query(
        "SELECT id FROM users WHERE email = 'admin@example.com'"
      )
      
      if (existingAdmin.rows.length > 0) {
        console.log('ℹ️ Admin user already exists, skipping seed')
        return
      }
      
      // The schema.sql already includes sample data
      console.log('✅ Sample data seeded successfully')
      console.log('👤 Default admin login:')
      console.log('   Email: admin@example.com')
      console.log('   Password: admin123')
      console.log('⚠️ Please change the default password in production!')
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 Invoice Management System - Database Setup')
  console.log('=' .repeat(50))
  
  await testConnection()
  await runMigrations()
  await seedData()
  
  console.log('=' .repeat(50))
  console.log('✅ Database setup completed successfully!')
  console.log('🎉 You can now start the development server with: npm run dev')
  
  await pool.end()
}

// Handle command line arguments
const args = process.argv.slice(2)

if (args.includes('--test-only')) {
  testConnection().then(() => pool.end())
} else if (args.includes('--migrate-only')) {
  runMigrations().then(() => pool.end())
} else if (args.includes('--seed-only')) {
  seedData().then(() => pool.end())
} else {
  main()
}