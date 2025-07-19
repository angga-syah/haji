// lib/database/index.ts
import { Pool, PoolClient } from 'pg'

// Single PostgreSQL connection for all environments
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: process.env.NODE_ENV === 'production' ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Unified database class
export class Database {
  static async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = await pool.connect()
    try {
      const result = await client.query(sql, params)
      return result.rows
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Helper methods for common operations
  static async findOne<T>(table: string, where: Record<string, any>): Promise<T | null> {
    const keys = Object.keys(where)
    const values = Object.values(where)
    const conditions = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ')
    
    const sql = `SELECT * FROM ${table} WHERE ${conditions} LIMIT 1`
    const rows = await this.query<T>(sql, values)
    return rows[0] || null
  }

  static async findMany<T>(
    table: string, 
    where: Record<string, any> = {},
    options: { limit?: number; offset?: number; orderBy?: string } = {}
  ): Promise<T[]> {
    const keys = Object.keys(where)
    const values = Object.values(where)
    let sql = `SELECT * FROM ${table}`
    
    if (keys.length > 0) {
      const conditions = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      sql += ` WHERE ${conditions}`
    }
    
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`
    }
    
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }
    
    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }
    
    return this.query<T>(sql, values)
  }

  static async insert<T>(
    table: string, 
    data: Record<string, any>,
    returning: string = '*'
  ): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ')
    const columns = keys.join(', ')
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING ${returning}`
    const rows = await this.query<T>(sql, values)
    return rows[0]
  }

  static async update<T>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    returning: string = '*'
  ): Promise<T> {
    const dataKeys = Object.keys(data)
    const dataValues = Object.values(data)
    const whereKeys = Object.keys(where)
    const whereValues = Object.values(where)
    
    const setClause = dataKeys.map((key, index) => `${key} = $${index + 1}`).join(', ')
    const whereClause = whereKeys.map((key, index) => 
      `${key} = $${dataKeys.length + index + 1}`
    ).join(' AND ')
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`
    const allValues = [...dataValues, ...whereValues]
    const rows = await this.query<T>(sql, allValues)
    return rows[0]
  }

  static async delete(table: string, where: Record<string, any>): Promise<number> {
    const keys = Object.keys(where)
    const values = Object.values(where)
    const conditions = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ')
    
    const sql = `DELETE FROM ${table} WHERE ${conditions}`
    const result = await this.query(sql, values)
    return result.length
  }
}

// Export pool for direct access if needed
export { pool }