#!/usr/bin/env node

// install-and-fix.js
// Install bcryptjs and fix authentication properly

const { execSync } = require('child_process');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class AuthFixer {
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
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  }

  // Check if bcryptjs is installed
  checkBcryptjs() {
    try {
      const bcrypt = require('bcryptjs');
      console.log('✅ bcryptjs is already installed');
      return bcrypt;
    } catch (error) {
      console.log('❌ bcryptjs not found');
      return null;
    }
  }

  // Install bcryptjs
  installBcryptjs() {
    try {
      console.log('\n📦 Installing bcryptjs...');
      
      // Try to find package.json directory
      let packageDir = process.cwd();
      while (!fs.existsSync(path.join(packageDir, 'package.json')) && packageDir !== path.dirname(packageDir)) {
        packageDir = path.dirname(packageDir);
      }
      
      if (!fs.existsSync(path.join(packageDir, 'package.json'))) {
        throw new Error('package.json not found. Run this from your project directory.');
      }
      
      console.log(`📁 Found package.json in: ${packageDir}`);
      
      // Install bcryptjs
      process.chdir(packageDir);
      execSync('npm install bcryptjs', { stdio: 'inherit' });
      
      console.log('✅ bcryptjs installed successfully');
      return require('bcryptjs');
      
    } catch (error) {
      console.error('❌ Failed to install bcryptjs:', error.message);
      throw error;
    }
  }

  // Create user with proper bcrypt hash
  async createUserWithBcrypt(email, password, fullName, username = null, role = 'admin') {
    let bcrypt = this.checkBcryptjs();
    
    if (!bcrypt) {
      bcrypt = this.installBcryptjs();
    }
    
    try {
      console.log(`\n🔧 Creating user with proper bcrypt: ${email}`);
      
      // Check if user exists
      const existing = await this.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.length > 0) {
        console.log('❌ Email already exists');
        return false;
      }
      
      // Generate proper bcrypt hash
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      console.log(`🔐 Generated bcrypt hash: ${passwordHash.substring(0, 20)}...`);
      
      // Test hash immediately
      const testResult = await bcrypt.compare(password, passwordHash);
      console.log(`🧪 Hash verification test: ${testResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!testResult) {
        throw new Error('Hash generation failed verification');
      }
      
      // Generate username if not provided
      if (!username) {
        username = email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);
      }
      
      // Insert user
      const userResult = await this.query(`
        INSERT INTO users (email, password_hash, email_verified) 
        VALUES ($1, $2, true) 
        RETURNING id, email
      `, [email, passwordHash]);
      
      const newUser = userResult[0];
      console.log(`✅ User created with ID: ${newUser.id}`);
      
      // Insert profile
      await this.query(`
        INSERT INTO profiles (id, username, role, full_name) 
        VALUES ($1, $2, $3, $4)
      `, [newUser.id, username, role, fullName]);
      
      console.log(`✅ Profile created: ${username}`);
      console.log(`\n🎯 New credentials:`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Password: ${password}`);
      console.log(`   👤 Role: ${role}`);
      
      return { email, password, id: newUser.id };
      
    } catch (error) {
      console.error('❌ Failed to create user:', error.message);
      return false;
    }
  }

  // Fix existing user password
  async fixUserPassword(email, newPassword) {
    let bcrypt = this.checkBcryptjs();
    
    if (!bcrypt) {
      bcrypt = this.installBcryptjs();
    }
    
    try {
      console.log(`\n🔧 Fixing password for: ${email}`);
      
      // Check if user exists
      const userResult = await this.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userResult.length === 0) {
        console.log('❌ User not found');
        return false;
      }
      
      // Generate proper bcrypt hash
      const passwordHash = await bcrypt.hash(newPassword, 12);
      console.log(`🔐 Generated new hash: ${passwordHash.substring(0, 20)}...`);
      
      // Test hash
      const testResult = await bcrypt.compare(newPassword, passwordHash);
      console.log(`🧪 Hash verification: ${testResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!testResult) {
        throw new Error('Hash verification failed');
      }
      
      // Update password
      await this.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE email = $2
      `, [passwordHash, email]);
      
      console.log('✅ Password updated successfully');
      return { email, password: newPassword };
      
    } catch (error) {
      console.error('❌ Failed to fix password:', error.message);
      return false;
    }
  }

  // Test with real bcrypt
  async testExistingHash(email) {
    let bcrypt = this.checkBcryptjs();
    
    if (!bcrypt) {
      console.log('⚠️  bcryptjs not installed, cannot test existing hash');
      return null;
    }
    
    try {
      console.log(`\n🔍 Testing existing hash with real bcrypt: ${email}`);
      
      const userResult = await this.query(`
        SELECT password_hash FROM users WHERE email = $1
      `, [email]);
      
      if (userResult.length === 0) {
        console.log('❌ User not found');
        return null;
      }
      
      const hash = userResult[0].password_hash;
      console.log(`🔐 Hash: ${hash.substring(0, 20)}...`);
      
      const testPasswords = [
        'admin123',
        'password',
        'admin',
        '123456',
        'password123',
        'test123',
        'admin@example.com',
        'qwerty',
        'letmein',
        'welcome',
        'secret',
        'changeme'
      ];
      
      console.log('\n🧪 Testing with real bcrypt.compare():');
      
      for (const password of testPasswords) {
        const result = await bcrypt.compare(password, hash);
        console.log(`   "${password}": ${result ? '✅ MATCH!' : '❌ no match'}`);
        
        if (result) {
          console.log(`\n🎉 Found correct password: "${password}"`);
          return password;
        }
      }
      
      console.log('\n❌ No matching password found');
      return null;
      
    } catch (error) {
      console.error('❌ Failed to test hash:', error.message);
      return null;
    }
  }

  // Test login API
  async testLoginAPI(email, password) {
    const http = require('http');
    const { URL } = require('url');

    console.log(`\n🌐 Testing login API: ${email}`);

    const postData = JSON.stringify({
      email: email,
      password: password,
      remember: false
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login'
    };

    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`📬 Response status: ${res.statusCode}`);
          
          try {
            const responseBody = JSON.parse(data);
            
            if (res.statusCode === 200) {
              console.log('🎉 API LOGIN SUCCESSFUL!');
              console.log(`👤 User: ${responseBody.user.full_name} (${responseBody.user.email})`);
              console.log(`🔑 Role: ${responseBody.user.role}`);
              console.log(`📩 Message: ${responseBody.message}`);
              console.log('\n✅ You can now login to your application!');
            } else {
              console.log(`❌ API login failed: ${responseBody.error || 'Unknown error'}`);
            }
          } catch (e) {
            console.log(`📄 Raw response: ${data}`);
          }
          
          resolve(res.statusCode === 200);
        });
      });

      req.on('error', (error) => {
        console.error('❌ API request failed:', error.message);
        console.log('💡 Make sure your Next.js server is running: npm run dev');
        resolve(false);
      });

      req.setTimeout(5000);
      req.write(postData);
      req.end();
    });
  }

  async close() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }
}

// Main function
async function main() {
  console.log('🔧 Complete Authentication Fixer');
  console.log('================================');
  console.log('📦 This will install bcryptjs and fix authentication properly');
  
  const fixer = new AuthFixer();
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      // Auto-fix process
      console.log('\n🚀 Starting auto-fix process...');
      
      // Step 1: Test existing hash with real bcrypt
      console.log('\n📋 Step 1: Test existing admin user...');
      const existingPassword = await fixer.testExistingHash('admin@example.com');
      
      if (existingPassword) {
        console.log(`\n✅ Existing admin works! Test login...`);
        await fixer.testLoginAPI('admin@example.com', existingPassword);
      } else {
        console.log('\n📋 Step 2: Fix existing admin password...');
        const fixResult = await fixer.fixUserPassword('admin@example.com', 'admin123');
        
        if (fixResult) {
          await fixer.testLoginAPI(fixResult.email, fixResult.password);
        } else {
          console.log('\n📋 Step 3: Create new admin user...');
          const newUser = await fixer.createUserWithBcrypt('admin@fixed.com', 'admin123', 'Fixed Admin');
          
          if (newUser) {
            await fixer.testLoginAPI(newUser.email, newUser.password);
          }
        }
      }
      
    } else if (args[0] === 'test' && args[1]) {
      // Test existing user
      await fixer.testExistingHash(args[1]);
      
    } else if (args[0] === 'fix' && args.length >= 3) {
      // Fix user password
      const [, email, password] = args;
      const result = await fixer.fixUserPassword(email, password);
      if (result) {
        await fixer.testLoginAPI(result.email, result.password);
      }
      
    } else if (args[0] === 'create') {
      // Create new user
      const email = args[1] || 'admin@fixed.com';
      const password = args[2] || 'admin123';
      const fullName = args[3] || 'Fixed Admin User';
      
      const result = await fixer.createUserWithBcrypt(email, password, fullName);
      if (result) {
        await fixer.testLoginAPI(result.email, result.password);
      }
      
    } else if (args[0] === 'install') {
      // Just install bcryptjs
      fixer.installBcryptjs();
      console.log('✅ bcryptjs installation complete');
      
    } else {
      console.log('\n📖 Usage:');
      console.log('  node install-and-fix.js                                # Auto-fix everything');
      console.log('  node install-and-fix.js test admin@example.com         # Test existing user');
      console.log('  node install-and-fix.js fix admin@example.com admin123 # Fix password');
      console.log('  node install-and-fix.js create [email] [pass] [name]   # Create new user');
      console.log('  node install-and-fix.js install                        # Install bcryptjs only');
      console.log('\n🎯 Recommended: Just run "node install-and-fix.js" for automatic fix');
    }

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    
    if (error.message.includes('package.json')) {
      console.log('\n💡 Solutions:');
      console.log('   1. Run this script from your project root directory (where package.json is)');
      console.log('   2. Or run: cd .. && node src/install-and-fix.js');
    }
    
    process.exit(1);
  } finally {
    await fixer.close();
    console.log('\n🔐 Connection closed');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Script interrupted');
  process.exit(0);
});

main();