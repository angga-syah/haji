// src/lib/database/connection.ts
import { Pool, PoolConfig } from 'pg'

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const isLocal = process.env.DATABASE_URL?.includes('localhost')
const isSupabase = process.env.DATABASE_URL?.includes('supabase.co')

// Database connection configuration
const getPoolConfig = (): PoolConfig => {
  const baseConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:fsn285712@localhost:5432/invoice_db',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
    query_timeout: 30000,
  }

  if (isProduction) {
    return {
      ...baseConfig,
      max: 20, // Maximum connections in production
      min: 2,  // Minimum connections
      ssl: { rejectUnauthorized: false },
      application_name: 'invoice-management-prod'
    }
  } else if (isSupabase) {
    return {
      ...baseConfig,
      max: 10, // Supabase has connection limits
      min: 1,
      ssl: { rejectUnauthorized: false },
      application_name: 'invoice-management-dev'
    }
  } else {
    return {
      ...baseConfig,
      max: 5,  // Local development
      min: 1,
      ssl: false,
      application_name: 'invoice-management-local'
    }
  }
}

// Connection pool instance
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(getPoolConfig())
    
    // Connection error handling
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client:', err)
      process.exit(-1)
    })

    // Connection logging for development
    if (!isProduction) {
      pool.on('connect', (client) => {
        console.log('📦 Database client connected')
      })

      pool.on('remove', (client) => {
        console.log('📦 Database client removed')
      })
    }
  }
  
  return pool
}

// Health check function
export async function checkDatabaseConnection(): Promise<{
  isConnected: boolean
  error?: string
  info?: {
    database: string
    user: string
    host: string
    port: number
    ssl: boolean
  }
}> {
  try {
    const pool = getPool()
    const client = await pool.connect()
    
    try {
      const result = await client.query('SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port()')
      const row = result.rows[0]
      
      return {
        isConnected: true,
        info: {
          database: row.current_database,
          user: row.current_user,
          host: row.inet_server_addr || 'localhost',
          port: row.inet_server_port || 5432,
          ssl: !!pool.options.ssl
        }
      }
    } finally {
      client.release()
    }
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    }
  }
}

// Close all connections (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('📦 Database pool closed')
  }
}

// Database migration checker
export async function ensureMigrationsTable(): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `)
  } finally {
    client.release()
  }
}

// Check if migration has been run
export async function hasMigration(version: string): Promise<boolean> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    const result = await client.query(
      'SELECT 1 FROM migrations WHERE version = $1',
      [version]
    )
    return result.rowCount > 0
  } finally {
    client.release()
  }
}

// Record migration as completed
export async function recordMigration(version: string): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query(
      'INSERT INTO migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [version]
    )
  } finally {
    client.release()
  }
}

// Connection utilities for different environments
export const ConnectionUtils = {
  isProduction,
  isLocal,
  isSupabase,
  
  // Get current environment info
  getEnvironment(): string {
    if (isProduction) return 'production'
    if (isSupabase) return 'supabase'
    if (isLocal) return 'local'
    return 'unknown'
  },
  
  // Get connection string info (without sensitive data)
  getConnectionInfo(): {
    host: string
    database: string
    environment: string
    ssl: boolean
  } {
    const url = new URL(process.env.DATABASE_URL || 'postgresql://localhost/invoice_db')
    return {
      host: url.hostname,
      database: url.pathname.slice(1),
      environment: this.getEnvironment(),
      ssl: isProduction || isSupabase
    }
  }
}

// Export the pool getter as default
export default getPool