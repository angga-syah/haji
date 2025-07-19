#!/usr/bin/env node

// test-database-connection.js
// Pure Node.js script - no external dependencies required
const { Client } = require('pg');
const crypto = require('crypto');

// Simple password hashing using built-in crypto (not as secure as bcrypt, but works)
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512');
  return salt + ':' + hash.toString('hex');
}

// Database class
class Database {
  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:fsn285712@localhost:5432/invoice_db',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async query(sql, params = []) {
    await this.connect();
    try {
      const result = await this.client.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  }

  async insert(table, data, returning = '*') {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING ${returning}`;
    const rows = await this.query(sql, values);
    return rows[0];
  }

  async close() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }
}

// Function to test database connection
async function testConnection(db) {
  try {
    console.log('🔄 Testing database connection...');
    const result = await db.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Database connected successfully!');
    console.log(`⏰ Current time: ${result[0].current_time}`);
    console.log(`🐘 PostgreSQL version: ${result[0].version.split(',')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Tip: Make sure PostgreSQL is running and check your connection string');
    }
    return false;
  }
}

// Function to create a new user
async function createUser(db, email, password, fullName, username = null, role = 'viewer') {
  try {
    console.log(`\n🔄 Creating user: ${email}...`);
    
    // Hash password using built-in crypto
    const passwordHash = hashPassword(password);
    
    // Generate username if not provided
    if (!username) {
      username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    }
    
    // Insert user
    const userData = {
      email: email,
      password_hash: passwordHash,
      email_verified: true
    };
    
    const newUser = await db.insert('users', userData);
    console.log(`✅ User created with ID: ${newUser.id}`);
    
    // Insert profile
    const profileData = {
      id: newUser.id,
      username: username,
      role: role,
      full_name: fullName,
      settings: '{}'
    };
    
    const newProfile = await db.insert('profiles', profileData);
    console.log(`✅ Profile created for user: ${newProfile.username}`);
    
    return { user: newUser, profile: newProfile };
    
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.error('❌ User creation failed: Email or username already exists');
    } else {
      console.error('❌ User creation failed:', error.message);
    }
    throw error;
  }
}

// Function to list all users
async function listUsers(db) {
  try {
    console.log('\n📋 Current users in database:');
    const users = await db.query(`
      SELECT 
        u.id, 
        u.email, 
        u.email_verified, 
        u.created_at,
        p.username,
        p.role,
        p.full_name
      FROM users u
      LEFT JOIN profiles p ON u.id = p.id
      ORDER BY u.created_at DESC
    `);
    
    if (users.length === 0) {
      console.log('📭 No users found');
      return;
    }
    
    console.log('\n┌─────────────────────────────────────────┬─────────────────────┬──────────┬────────────────────┐');
    console.log('│ Email                                   │ Username            │ Role     │ Full Name          │');
    console.log('├─────────────────────────────────────────┼─────────────────────┼──────────┼────────────────────┤');
    
    users.forEach(user => {
      const email = (user.email || '').slice(0, 39).padEnd(39);
      const username = (user.username || '').slice(0, 19).padEnd(19);
      const role = (user.role || '').slice(0, 8).padEnd(8);
      const fullName = (user.full_name || '').slice(0, 18).padEnd(18);
      console.log(`│ ${email} │ ${username} │ ${role} │ ${fullName} │`);
    });
    
    console.log('└─────────────────────────────────────────┴─────────────────────┴──────────┴────────────────────┘');
    console.log(`\n📊 Total users: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
  }
}

// Function to check if tables exist
async function checkTables(db) {
  try {
    console.log('\n🔍 Checking database tables...');
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'profiles', 'companies', 'tka_workers')
      ORDER BY table_name
    `);
    
    const requiredTables = ['users', 'profiles', 'companies', 'tka_workers'];
    const existingTables = tables.map(t => t.table_name);
    
    console.log('📋 Table status:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    if (existingTables.length < requiredTables.length) {
      console.log('\n💡 Some tables are missing. Please run your database migrations first.');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check tables:', error.message);
    return false;
  }
}

// Function to generate UUID v4 (simple version)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main function
async function main() {
  console.log('🚀 Database Connection Test & User Creation');
  console.log('===========================================');
  
  const db = new Database();
  
  try {
    // Test connection
    const connected = await testConnection(db);
    if (!connected) {
      console.log('\n💡 Please set your DATABASE_URL environment variable:');
      console.log('   export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"');
      console.log('\n   Windows: set DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
      process.exit(1);
    }
    
    // Check if tables exist
    const tablesExist = await checkTables(db);
    if (!tablesExist) {
      process.exit(1);
    }
    
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // No arguments, just list users
      await listUsers(db);
    } else if (args[0] === 'create' && args.length >= 3) {
      // Create user: node test-database-connection.js create email@example.com password123 "Full Name" [username] [role]
      const [, email, password, fullName, username, role] = args;
      
      // Basic validation
      if (!email.includes('@')) {
        throw new Error('Invalid email format');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      await createUser(db, email, password, fullName, username, role);
      await listUsers(db);
    } else if (args[0] === 'list') {
      // List users only
      await listUsers(db);
    } else if (args[0] === 'check') {
      // Check database status only
      await checkTables(db);
    } else {
      // Show usage
      console.log('\n📖 Usage:');
      console.log('  node test-database-connection.js                                    # Test connection and list users');
      console.log('  node test-database-connection.js check                             # Check database tables');
      console.log('  node test-database-connection.js list                              # List all users');
      console.log('  node test-database-connection.js create email@test.com pass123 "John Doe" [username] [role]');
      console.log('\n🔧 Examples:');
      console.log('  node test-database-connection.js create user@test.com mypassword "John Smith"');
      console.log('  node test-database-connection.js create admin@test.com admin123 "Admin User" admin_user admin');
      console.log('\n🌍 Environment Variables:');
      console.log('  DATABASE_URL - PostgreSQL connection string (required)');
      console.log('  NODE_ENV - Set to "production" for SSL connections');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await db.close();
    console.log('\n🔐 Database connection closed');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

// Handle CTRL+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Script interrupted by user');
  process.exit(0);
});

// Run the script
main();