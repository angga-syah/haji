#!/usr/bin/env node

// src/scripts/backup.js
const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

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

class DatabaseBackup {
  constructor(pool) {
    this.pool = pool
    this.backupDir = path.join(process.cwd(), 'backups')
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir)
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true })
      logInfo(`Created backup directory: ${this.backupDir}`)
    }
  }

  async getConnectionInfo() {
    const url = new URL(config.connectionString)
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.slice(1),
      username: url.username,
      password: url.password
    }
  }

  async createSQLBackup(outputPath) {
    logInfo('Creating SQL backup using pg_dump...')
    
    const connInfo = await this.getConnectionInfo()
    
    // Set environment variables for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: connInfo.password
    }
    
    const command = `pg_dump -h ${connInfo.host} -p ${connInfo.port} -U ${connInfo.username} -d ${connInfo.database} --no-password --verbose --clean --if-exists --create`
    
    try {
      const { stdout, stderr } = await execAsync(command, { env, maxBuffer: 1024 * 1024 * 10 }) // 10MB buffer
      
      await fs.writeFile(outputPath, stdout)
      
      if (stderr) {
        logWarning('pg_dump warnings:')
        console.log(stderr)
      }
      
      return true
    } catch (error) {
      logError(`pg_dump failed: ${error.message}`)
      
      // Fallback to custom SQL backup
      logInfo('Falling back to custom SQL backup...')
      return await this.createCustomSQLBackup(outputPath)
    }
  }

  async createCustomSQLBackup(outputPath) {
    logInfo('Creating custom SQL backup...')
    
    const client = await this.pool.connect()
    
    try {
      let sqlContent = ''
      
      // Header
      sqlContent += `-- Invoice Management System Database Backup\n`
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`
      sqlContent += `-- Database: ${(await this.getConnectionInfo()).database}\n\n`
      
      sqlContent += `-- Disable triggers during restore\n`
      sqlContent += `SET session_replication_role = replica;\n\n`
      
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      
      const tables = tablesResult.rows.map(row => row.table_name)
      
      // Backup each table
      for (const table of tables) {
        sqlContent += await this.backupTable(client, table)
      }
      
      // Re-enable triggers
      sqlContent += `\n-- Re-enable triggers\n`
      sqlContent += `SET session_replication_role = DEFAULT;\n\n`
      
      // Update sequences
      sqlContent += await this.backupSequences(client)
      
      await fs.writeFile(outputPath, sqlContent)
      
      logSuccess(`Custom SQL backup created: ${path.basename(outputPath)}`)
      return true
      
    } catch (error) {
      logError(`Custom backup failed: ${error.message}`)
      return false
    } finally {
      client.release()
    }
  }

  async backupTable(client, tableName) {
    let sql = `\n-- Table: ${tableName}\n`
    
    try {
      // Get table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName])
      
      const columns = columnsResult.rows.map(row => row.column_name)
      
      // Clear existing data
      sql += `DELETE FROM ${tableName};\n`
      
      // Get all data
      const dataResult = await client.query(`SELECT * FROM ${tableName}`)
      
      if (dataResult.rows.length > 0) {
        sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n`
        
        const values = dataResult.rows.map(row => {
          const rowValues = columns.map(col => {
            const value = row[col]
            if (value === null) return 'NULL'
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
            if (value instanceof Date) return `'${value.toISOString()}'`
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`
            return value
          })
          return `  (${rowValues.join(', ')})`
        })
        
        sql += values.join(',\n') + ';\n'
      }
      
      logInfo(`Backed up table: ${tableName} (${dataResult.rows.length} rows)`)
      
    } catch (error) {
      logError(`Error backing up table ${tableName}: ${error.message}`)
      sql += `-- Error backing up table ${tableName}: ${error.message}\n`
    }
    
    return sql
  }

  async backupSequences(client) {
    let sql = `\n-- Sequences\n`
    
    try {
      const sequencesResult = await client.query(`
        SELECT schemaname, sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
      `)
      
      for (const seq of sequencesResult.rows) {
        const seqName = `${seq.schemaname}.${seq.sequencename}`
        const valueResult = await client.query(`SELECT last_value FROM ${seqName}`)
        
        if (valueResult.rows.length > 0) {
          sql += `SELECT setval('${seqName}', ${valueResult.rows[0].last_value});\n`
        }
      }
      
    } catch (error) {
      logWarning(`Could not backup sequences: ${error.message}`)
    }
    
    return sql
  }

  async createJSONBackup(outputPath) {
    logInfo('Creating JSON backup...')
    
    const client = await this.pool.connect()
    
    try {
      const backup = {
        metadata: {
          version: '1.0',
          created_at: new Date().toISOString(),
          database: (await this.getConnectionInfo()).database,
          tables: []
        },
        data: {}
      }
      
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      
      const tables = tablesResult.rows.map(row => row.table_name)
      backup.metadata.tables = tables
      
      // Backup each table
      for (const table of tables) {
        const dataResult = await client.query(`SELECT * FROM ${table}`)
        backup.data[table] = dataResult.rows
        
        logInfo(`Backed up table: ${table} (${dataResult.rows.length} rows)`)
      }
      
      await fs.writeFile(outputPath, JSON.stringify(backup, null, 2))
      
      logSuccess(`JSON backup created: ${path.basename(outputPath)}`)
      return true
      
    } catch (error) {
      logError(`JSON backup failed: ${error.message}`)
      return false
    } finally {
      client.release()
    }
  }

  async createCSVBackup(outputDir) {
    logInfo('Creating CSV backup...')
    
    const client = await this.pool.connect()
    
    try {
      // Create CSV directory
      await fs.mkdir(outputDir, { recursive: true })
      
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `)
      
      const tables = tablesResult.rows.map(row => row.table_name)
      
      // Backup each table as CSV
      for (const table of tables) {
        const outputPath = path.join(outputDir, `${table}.csv`)
        
        // Get columns
        const columnsResult = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table])
        
        const columns = columnsResult.rows.map(row => row.column_name)
        
        // Get data
        const dataResult = await client.query(`SELECT * FROM ${table}`)
        
        // Create CSV content
        let csvContent = columns.join(',') + '\n'
        
        dataResult.rows.forEach(row => {
          const values = columns.map(col => {
            const value = row[col]
            if (value === null) return ''
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
            if (value instanceof Date) return value.toISOString()
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            return value
          })
          csvContent += values.join(',') + '\n'
        })
        
        await fs.writeFile(outputPath, csvContent)
        
        logInfo(`Backed up table: ${table} (${dataResult.rows.length} rows) -> ${table}.csv`)
      }
      
      logSuccess(`CSV backup created in: ${outputDir}`)
      return true
      
    } catch (error) {
      logError(`CSV backup failed: ${error.message}`)
      return false
    } finally {
      client.release()
    }
  }

  async getBackupStats(filePath) {
    try {
      const stats = await fs.stat(filePath)
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
      return {
        size: stats.size,
        sizeFormatted: `${sizeInMB} MB`,
        created: stats.birthtime
      }
    } catch (error) {
      return null
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(file => 
        file.endsWith('.sql') || 
        file.endsWith('.json') || 
        file.startsWith('csv-backup-')
      )
      
      const backups = []
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file)
        const stats = await this.getBackupStats(filePath)
        
        if (stats) {
          backups.push({
            name: file,
            path: filePath,
            size: stats.sizeFormatted,
            created: stats.created.toISOString()
          })
        }
      }
      
      return backups.sort((a, b) => new Date(b.created) - new Date(a.created))
      
    } catch (error) {
      logError(`Error listing backups: ${error.message}`)
      return []
    }
  }

  async cleanOldBackups(keepCount = 10) {
    try {
      const backups = await this.listBackups()
      
      if (backups.length <= keepCount) {
        logInfo(`No cleanup needed. Current backups: ${backups.length}, Keep: ${keepCount}`)
        return
      }
      
      const toDelete = backups.slice(keepCount)
      
      for (const backup of toDelete) {
        await fs.unlink(backup.path)
        logInfo(`Deleted old backup: ${backup.name}`)
      }
      
      logSuccess(`Cleaned up ${toDelete.length} old backups`)
      
    } catch (error) {
      logError(`Error cleaning old backups: ${error.message}`)
    }
  }
}

async function main() {
  log('💾 Invoice Management System - Database Backup', colors.bright)
  log('=' * 60, colors.cyan)
  
  const pool = new Pool(config)
  
  try {
    // Test connection
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    logSuccess('Database connection successful')
    
    const backup = new DatabaseBackup(pool)
    await backup.ensureBackupDirectory()
    
    // Parse command line arguments
    const args = process.argv.slice(2)
    const format = args.find(arg => ['--sql', '--json', '--csv'].includes(arg)) || '--sql'
    const outputArg = args.find(arg => arg.startsWith('--output='))
    const listFlag = args.includes('--list')
    const cleanFlag = args.includes('--clean')
    
    if (listFlag) {
      // List existing backups
      const backups = await backup.listBackups()
      
      if (backups.length === 0) {
        logInfo('No backups found')
      } else {
        logInfo(`Found ${backups.length} backups:`)
        backups.forEach(b => {
          console.log(`  ${b.name} (${b.size}) - ${new Date(b.created).toLocaleString()}`)
        })
      }
      return
    }
    
    if (cleanFlag) {
      await backup.cleanOldBackups(10)
      return
    }
    
    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
    let outputPath
    
    if (outputArg) {
      outputPath = outputArg.split('=')[1]
    } else {
      const extension = format === '--json' ? 'json' : (format === '--csv' ? 'csv' : 'sql')
      const filename = `invoice-backup-${timestamp}.${extension}`
      outputPath = path.join(backup.backupDir, filename)
    }
    
    // Create backup
    let success = false
    
    switch (format) {
      case '--json':
        success = await backup.createJSONBackup(outputPath)
        break
      case '--csv':
        const csvDir = outputPath.endsWith('.csv') ? 
          path.dirname(outputPath) : 
          outputPath.replace('.csv', '')
        success = await backup.createCSVBackup(csvDir)
        break
      case '--sql':
      default:
        success = await backup.createSQLBackup(outputPath)
        break
    }
    
    if (success) {
      const stats = await backup.getBackupStats(outputPath)
      if (stats) {
        logSuccess(`Backup completed: ${path.basename(outputPath)} (${stats.sizeFormatted})`)
      }
      
      // Clean old backups
      await backup.cleanOldBackups(10)
    }
    
  } catch (error) {
    logError(`Backup failed: ${error.message}`)
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
Invoice Management System - Database Backup

Usage: node backup.js [options]

Options:
  --help, -h         Show this help message
  --sql              Create SQL backup (default)
  --json             Create JSON backup
  --csv              Create CSV backup (multiple files)
  --output=PATH      Specify output path
  --list             List existing backups
  --clean            Clean old backups (keep latest 10)

Environment Variables:
  DATABASE_URL       PostgreSQL connection string
                     Default: postgresql://postgres:fsn285712@localhost:5432/invoice_db

Examples:
  node backup.js                              # Create SQL backup
  node backup.js --json                       # Create JSON backup
  node backup.js --csv                        # Create CSV backup
  node backup.js --output=my-backup.sql       # Custom output path
  node backup.js --list                       # List existing backups
  node backup.js --clean                      # Clean old backups
`)
  process.exit(0)
}

// Run main function
main()

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Backup interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('Backup terminated')
  process.exit(1)
})