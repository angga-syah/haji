// src/app/api/tka-workers/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database'
import { requirePermission } from '@/lib/auth'
import { TKAWorkerValidator, normalizeGender } from '@/lib/import/excel'
import type { CreateTKAWorkerData } from '@/lib/types'

export const runtime = 'nodejs'

interface ImportData {
  nama: string
  passport: string
  divisi?: string
  jenis_kelamin: string
}

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const user = await requirePermission(request, 'tka_workers', 'create')
    
    const formData = await request.formData()
    const dataString = formData.get('data') as string
    
    if (!dataString) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      )
    }

    let importData: ImportData[]
    try {
      importData = JSON.parse(dataString)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON data' },
        { status: 400 }
      )
    }

    if (!Array.isArray(importData) || importData.length === 0) {
      return NextResponse.json(
        { error: 'Data must be a non-empty array' },
        { status: 400 }
      )
    }

    // Limit import size
    if (importData.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 records allowed per import' },
        { status: 400 }
      )
    }

    const results = {
      total: importData.length,
      imported: 0,
      failed: 0,
      errors: [] as Array<{
        row: number
        field: string
        message: string
        data: ImportData
      }>
    }

    // Process imports in transaction
    await Database.transaction(async (client) => {
      for (let i = 0; i < importData.length; i++) {
        const rowNumber = i + 1
        const row = importData[i]

        try {
          // Normalize and validate data
          const normalizedData: CreateTKAWorkerData = {
            nama: row.nama?.trim() || '',
            passport: row.passport?.trim() || '',
            divisi: row.divisi?.trim() || '',
            jenis_kelamin: normalizeGender(row.jenis_kelamin || 'Laki-laki')
          }

          // Validate with business rules
          const validation = TKAWorkerValidator.validate(normalizedData)
          if (!validation.isValid) {
            validation.errors.forEach(error => {
              results.errors.push({
                row: rowNumber,
                field: error.field,
                message: error.message,
                data: row
              })
            })
            results.failed++
            continue
          }

          // Check for duplicate passport
          const existingWorker = await client.query(
            'SELECT id FROM tka_workers WHERE passport = $1',
            [normalizedData.passport]
          )

          if (existingWorker.rows.length > 0) {
            results.errors.push({
              row: rowNumber,
              field: 'passport',
              message: 'Worker with this passport already exists',
              data: row
            })
            results.failed++
            continue
          }

          // Insert the worker
          await client.query(`
            INSERT INTO tka_workers (nama, passport, divisi, jenis_kelamin, created_by)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            normalizedData.nama,
            normalizedData.passport,
            normalizedData.divisi || null,
            normalizedData.jenis_kelamin,
            user.id
          ])

          results.imported++

        } catch (error) {
          console.error(`Error importing row ${rowNumber}:`, error)
          results.errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            data: row
          })
          results.failed++
        }
      }
    })

    return NextResponse.json({
      message: `Import completed. ${results.imported} records imported, ${results.failed} failed.`,
      ...results
    }, { status: 200 })

  } catch (error) {
    console.error('Import API error:', error)
    
    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify permission to read import status/history
    await requirePermission(request, 'tka_workers', 'read')
    
    // Get import template/example
    const template = {
      headers: ['nama', 'passport', 'divisi', 'jenis_kelamin'],
      example: [
        {
          nama: 'John Smith',
          passport: 'A12345678',
          divisi: 'Engineering',
          jenis_kelamin: 'Laki-laki'
        },
        {
          nama: 'Jane Doe',
          passport: 'B87654321',
          divisi: 'Project Management',
          jenis_kelamin: 'Perempuan'
        }
      ],
      validation_rules: {
        nama: 'Required. 2-100 characters.',
        passport: 'Required. 3-20 characters. Must be unique.',
        divisi: 'Optional. Maximum 100 characters.',
        jenis_kelamin: 'Required. Must be "Laki-laki" or "Perempuan".'
      }
    }

    return NextResponse.json({
      template,
      limits: {
        max_file_size: '10MB',
        max_rows: 1000,
        supported_formats: ['CSV', 'Excel (.xlsx, .xls)']
      }
    })

  } catch (error) {
    console.error('Import template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}