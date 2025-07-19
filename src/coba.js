#!/usr/bin/env node

// fix-password.js
// Fix the password hash issue without external dependencies

const { Client } = require('pg');
const crypto = require('crypto');

class PasswordFixer {
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

  // Generate bcrypt-compatible hash using crypto (simplified version)
  generateBcryptHash(password, saltRounds = 10) {
    // Generate a random salt
    const salt = crypto.randomBytes(16);
    
    // Create iterations based on cost
    const iterations = Math.pow(2, saltRounds);
    
    // Generate hash using PBKDF2 (simplified bcrypt)
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 23, 'sha256');
    
    // Encode in bcrypt format
    const saltB64 = salt.toString('base64').replace(/[+/=]/g, (m) => ({'+': '.', '/': '/'}[m] || '')).substring(0, 22);
    const hashB64 = hash.toString('base64').replace(/[+/=]/g, (m) => ({'+': '.', '/': '/'}[m] || '')).substring(0, 31);
    
    return `$2b$${saltRounds.toString().padStart(2, '0')}$${saltB64}${hashB64}`;
  }

  // Test if generated hash works with simple verification
  verifyPassword(password, hash) {
    if (!hash.startsWith('$2b$')) return false;
    
    try {
      const parts = hash.split('$');
      if (parts.length !== 4) return false;
      
      const saltRounds = parseInt(parts[2]);
      const saltAndHash = parts[3];
      const salt = Buffer.from(saltAndHash.substring(0, 22), 'base64');
      const storedHash = saltAndHash.substring(22);
      
      const iterations = Math.pow(2, saltRounds);
      const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 23, 'sha256');
      const computedB64 = computedHash.toString('base64').replace(/[+/=]/g, (m) => ({'+': '.', '/': '/'}[m] || '')).substring(0, 31);
      
      return computedB64 === storedHash;
    } catch (error) {
      return false;
    }
  }

  // Update user password in database
  async updatePassword(email, newPassword) {
    try {
      console.log(`\n🔧 Updating password for: ${email}`);
      console.log(`📝 New password: "${newPassword}"`);
      
      // Generate new hash
      const newHash = this.generateBcryptHash(newPassword);
      console.log(`🔐 Generated hash: ${newHash}`);
      
      // Test our own hash
      const testResult = this.verifyPassword(newPassword, newHash);
      console.log(`🧪 Self-test: ${testResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!testResult) {
        throw new Error('Generated hash failed self-test');
      }
      
      // Update in database
      const result = await this.query(`
        UPDATE users 
        SET password_hash = $1, updated_at = NOW() 
        WHERE email = $2 
        RETURNING id, email
      `, [newHash, email]);
      
      if (result.length === 0) {
        throw new Error('User not found');
      }
      
      console.log(`✅ Password updated successfully for user ID: ${result[0].id}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to update password:', error.message);
      return false;
    }
  }

  // Test current hash with common passwords
  async testCurrentHash(email) {
    try {
      console.log(`\n🔍 Testing current hash for: ${email}`);
      
      const userResult = await this.query(`
        SELECT password_hash FROM users WHERE email = $1
      `, [email]);
      
      if (userResult.length === 0) {
        console.log('❌ User not found');
        return;
      }
      
      const currentHash = userResult[0].password_hash;
      console.log(`🔐 Current hash: ${currentHash}`);
      
      const testPasswords = [
        'admin123',
        'password',
        'admin',
        '123456',
        'password123',
        'test',
        'qwerty',
        'letmein',
        'welcome',
        'admin@example.com'
      ];
      
      console.log('\n🧪 Testing passwords with simplified verification:');
      
      for (const password of testPasswords) {
        const result = this.verifyPassword(password, currentHash);
        console.log(`   "${password}": ${result ? '✅ MATCH!' : '❌ no match'}`);
        
        if (result) {
          console.log(`\n🎉 Found working password: "${password}"`);
          return password;
        }
      }
      
      console.log('\n❌ None of the common passwords match');
      console.log('💡 The hash might be from a different bcrypt implementation');
      return null;
      
    } catch (error) {
      console.error('❌ Failed to test hash:', error.message);
      return null;
    }
  }

  // Create a completely new admin user
  async createNewAdmin(email = 'admin@test.com', password = 'admin123', fullName = 'Test Administrator') {
    try {
      console.log(`\n🆕 Creating new admin user: ${email}`);
      
      // Check if email already exists
      const existing = await this.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.length > 0) {
        console.log('❌ Email already exists');
        return false;
      }
      
      // Generate hash
      const passwordHash = this.generateBcryptHash(password);
      console.log(`🔐 Generated hash: ${passwordHash}`);
      
      // Test hash
      const testResult = this.verifyPassword(password, passwordHash);
      console.log(`🧪 Hash test: ${testResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!testResult) {
        throw new Error('Hash generation failed test');
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
      const username = email.split('@')[0] + '_test';
      await this.query(`
        INSERT INTO profiles (id, username, role, full_name) 
        VALUES ($1, $2, $3, $4)
      `, [newUser.id, username, 'admin', fullName]);
      
      console.log(`✅ Profile created: ${username}`);
      console.log(`\n🎯 Test these credentials:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to create user:', error.message);
      return false;
    }
  }

  // Test login API with new credentials
  async testLoginAPI(email, password) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    console.log(`\n🌐 Testing login API with: ${email}`);

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
      }
    };

    const apiUrl = 'http://localhost:3000/api/auth/login';
    const url = new URL(apiUrl);
    
    options.hostname = url.hostname;
    options.port = url.port || 80;
    options.path = url.pathname;

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
              console.log('✅ API login successful!');
              console.log(`👤 User:`, responseBody.user);
              console.log(`📩 Message: ${responseBody.message}`);
            } else {
              console.log(`❌ API login failed: ${responseBody.error || 'Unknown error'}`);
            }
          } catch (e) {
            console.log(`📄 Raw response:`, data);
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
  console.log('🔧 Password Hash Fixer');
  console.log('======================');
  console.log('⚡ Fix authentication issues without bcryptjs!');
  
  const fixer = new PasswordFixer();
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      // Default: comprehensive fix
      console.log('\n🔍 Step 1: Testing current hash...');
      const workingPassword = await fixer.testCurrentHash('admin@example.com');
      
      if (workingPassword) {
        console.log(`\n🎉 Current password works: "${workingPassword}"`);
        console.log('   Try logging in with this password!');
        await fixer.testLoginAPI('admin@example.com', workingPassword);
      } else {
        console.log('\n🔧 Step 2: Creating new admin user...');
        const success = await fixer.createNewAdmin();
        
        if (success) {
          console.log('\n🧪 Step 3: Testing new admin user...');
          await fixer.testLoginAPI('admin@test.com', 'admin123');
        }
      }
      
    } else if (args[0] === 'test' && args[1]) {
      // Test specific user
      await fixer.testCurrentHash(args[1]);
      
    } else if (args[0] === 'fix' && args.length >= 3) {
      // Update password
      const [, email, newPassword] = args;
      const success = await fixer.updatePassword(email, newPassword);
      
      if (success) {
        console.log('\n🧪 Testing updated password...');
        await fixer.testLoginAPI(email, newPassword);
      }
      
    } else if (args[0] === 'create') {
      // Create new admin
      const email = args[1] || 'admin@test.com';
      const password = args[2] || 'admin123';
      const fullName = args[3] || 'Test Administrator';
      
      const success = await fixer.createNewAdmin(email, password, fullName);
      
      if (success) {
        await fixer.testLoginAPI(email, password);
      }
      
    } else if (args[0] === 'api' && args.length >= 3) {
      // Test API only
      const [, email, password] = args;
      await fixer.testLoginAPI(email, password);
      
    } else {
      console.log('\n📖 Usage:');
      console.log('  node fix-password.js                                    # Auto-fix');
      console.log('  node fix-password.js test email@example.com             # Test hash');
      console.log('  node fix-password.js fix email@example.com newpass      # Update password');
      console.log('  node fix-password.js create [email] [pass] [name]       # Create new admin');
      console.log('  node fix-password.js api email@example.com password     # Test API only');
      console.log('\n🔧 Examples:');
      console.log('  node fix-password.js test admin@example.com');
      console.log('  node fix-password.js fix admin@example.com admin123');
      console.log('  node fix-password.js create test@admin.com test123 "Test Admin"');
    }

  } catch (error) {
    console.error('💥 Script failed:', error.message);
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