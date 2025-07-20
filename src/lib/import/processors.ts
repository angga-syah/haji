// src/lib/import/processors.ts
import { Database } from '@/lib/database'
import type { Company, TKAWorker, JobDescription, CreateCompanyData, CreateTKAWorkerData, CreateJobDescriptionData } from '@/lib/types'
import { 
  CompanyValidator, 
  TKAWorkerValidator, 
  JobDescriptionValidator,
  normalizeGender,
  normalizePhoneNumber,
  validateNPWP
} from './excel'

export interface ProcessResult {
  total: number
  processed: number
  success: number
  failed: number
  errors: Array<{
    row: number
    field?: string
    value?: any
    message: string
    data?: any
  }>
  created: any[]
}

export interface ProcessOptions {
  batchSize?: number
  skipDuplicates?: boolean
  updateExisting?: boolean
  continueOnError?: boolean
  dryRun?: boolean
}

export class BatchProcessor {
  private static readonly DEFAULT_BATCH_SIZE = 50
  private static readonly DELAY_BETWEEN_BATCHES = 100 // ms

  /**
   * Process data in batches with error handling
   */
  static async processBatch<T, R>(
    data: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      continueOnError = true,
      dryRun = false
    } = options

    const result: ProcessResult = {
      total: data.length,
      processed: 0,
      success: 0,
      failed: 0,
      errors: [],
      created: []
    }

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      
      // Process each item in the batch
      for (let j = 0; j < batch.length; j++) {
        const globalIndex = i + j
        const item = batch[j]
        
        try {
          if (!dryRun) {
            const processed = await processor(item, globalIndex)
            result.created.push(processed)
          }
          
          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            row: globalIndex + 1, // 1-based row numbering
            message: error instanceof Error ? error.message : 'Processing error',
            data: item
          })

          if (!continueOnError) {
            break
          }
        }
        
        result.processed++
      }

      // Add delay between batches to avoid overwhelming the database
      if (i + batchSize < data.length) {
        await this.delay(this.DELAY_BETWEEN_BATCHES)
      }
    }

    return result
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export class CompanyProcessor {
  /**
   * Process company data import
   */
  static async processCompanies(
    companiesData: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    return BatchProcessor.processBatch(
      companiesData,
      async (companyData, index) => {
        // Validate data
        const validation = CompanyValidator.validate(companyData)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
        }

        // Normalize data
        const normalizedData = this.normalizeCompanyData(companyData)
        
        // Check for duplicates
        if (options.skipDuplicates || options.updateExisting) {
          const existing = await Database.findOne<Company>('companies', { 
            npwp: normalizedData.npwp 
          })
          
          if (existing) {
            if (options.skipDuplicates) {
              throw new Error(`Company with NPWP ${normalizedData.npwp} already exists (skipped)`)
            }
            
            if (options.updateExisting) {
              return await Database.update<Company>('companies', {
                ...normalizedData,
                updated_at: new Date().toISOString()
              }, { id: existing.id })
            }
          }
        }

        // Create new company
        return await Database.insert<Company>('companies', {
          ...normalizedData,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      },
      options
    )
  }

  private static normalizeCompanyData(data: any): CreateCompanyData {
    return {
      company_name: String(data.company_name || data.nama_perusahaan || '').trim(),
      npwp: String(data.npwp || '').replace(/\D/g, ''), // Remove non-digits
      idtku: String(data.idtku || data.id_tku || '').trim(),
      address: String(data.address || data.alamat || '').trim(),
      contact_phone: data.contact_phone || data.telepon ? 
        normalizePhoneNumber(String(data.contact_phone || data.telepon)) : undefined,
      contact_email: data.contact_email || data.email || undefined
    }
  }
}

export class TKAWorkerProcessor {
  /**
   * Process TKA worker data import
   */
  static async processTKAWorkers(
    workersData: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    return BatchProcessor.processBatch(
      workersData,
      async (workerData, index) => {
        // Validate data
        const validation = TKAWorkerValidator.validate(workerData)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
        }

        // Normalize data
        const normalizedData = this.normalizeTKAWorkerData(workerData)
        
        // Check for duplicates
        if (options.skipDuplicates || options.updateExisting) {
          const existing = await Database.findOne<TKAWorker>('tka_workers', { 
            passport: normalizedData.passport 
          })
          
          if (existing) {
            if (options.skipDuplicates) {
              throw new Error(`TKA worker with passport ${normalizedData.passport} already exists (skipped)`)
            }
            
            if (options.updateExisting) {
              return await Database.update<TKAWorker>('tka_workers', {
                ...normalizedData,
                updated_at: new Date().toISOString()
              }, { id: existing.id })
            }
          }
        }

        // Create new TKA worker
        return await Database.insert<TKAWorker>('tka_workers', {
          ...normalizedData,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      },
      options
    )
  }

  private static normalizeTKAWorkerData(data: any): CreateTKAWorkerData {
    return {
      nama: String(data.nama || data.name || data.full_name || '').trim(),
      passport: String(data.passport || data.passport_number || '').trim().toUpperCase(),
      divisi: data.divisi || data.division || data.department || undefined,
      jenis_kelamin: normalizeGender(String(data.jenis_kelamin || data.gender || 'Laki-laki'))
    }
  }
}

export class JobDescriptionProcessor {
  /**
   * Process job description data import
   */
  static async processJobDescriptions(
    jobsData: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    return BatchProcessor.processBatch(
      jobsData,
      async (jobData, index) => {
        // Validate data
        const validation = JobDescriptionValidator.validate(jobData)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
        }

        // Normalize data
        const normalizedData = this.normalizeJobDescriptionData(jobData)
        
        // Validate company exists
        const company = await Database.findOne<Company>('companies', { 
          id: normalizedData.company_id 
        })
        if (!company) {
          throw new Error(`Company with ID ${normalizedData.company_id} not found`)
        }

        // Check for duplicates
        if (options.skipDuplicates || options.updateExisting) {
          const existing = await Database.findOne<JobDescription>('job_descriptions', { 
            company_id: normalizedData.company_id,
            job_name: normalizedData.job_name
          })
          
          if (existing) {
            if (options.skipDuplicates) {
              throw new Error(`Job "${normalizedData.job_name}" already exists for this company (skipped)`)
            }
            
            if (options.updateExisting) {
              return await Database.update<JobDescription>('job_descriptions', {
                ...normalizedData,
                updated_at: new Date().toISOString()
              }, { id: existing.id })
            }
          }
        }

        // Create new job description
        return await Database.insert<JobDescription>('job_descriptions', {
          ...normalizedData,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      },
      options
    )
  }

  private static normalizeJobDescriptionData(data: any): CreateJobDescriptionData {
    return {
      company_id: String(data.company_id || '').trim(),
      job_name: String(data.job_name || data.nama_pekerjaan || '').trim(),
      job_description: String(data.job_description || data.deskripsi || data.description || '').trim(),
      price: Number(data.price || data.harga || 0),
      sort_order: data.sort_order || data.urutan || 0
    }
  }
}

export class ImportManager {
  /**
   * Import companies from parsed data
   */
  static async importCompanies(
    data: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    console.log(`Starting import of ${data.length} companies...`)
    
    const result = await CompanyProcessor.processCompanies(data, createdBy, options)
    
    console.log(`Company import completed: ${result.success} success, ${result.failed} failed`)
    return result
  }

  /**
   * Import TKA workers from parsed data
   */
  static async importTKAWorkers(
    data: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    console.log(`Starting import of ${data.length} TKA workers...`)
    
    const result = await TKAWorkerProcessor.processTKAWorkers(data, createdBy, options)
    
    console.log(`TKA worker import completed: ${result.success} success, ${result.failed} failed`)
    return result
  }

  /**
   * Import job descriptions from parsed data
   */
  static async importJobDescriptions(
    data: any[],
    createdBy: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    console.log(`Starting import of ${data.length} job descriptions...`)
    
    const result = await JobDescriptionProcessor.processJobDescriptions(data, createdBy, options)
    
    console.log(`Job description import completed: ${result.success} success, ${result.failed} failed`)
    return result
  }

  /**
   * Get import template for companies
   */
  static getCompanyTemplate(): Record<string, any>[] {
    return [
      {
        company_name: 'PT Example Technology',
        npwp: '123456789012345',
        idtku: 'IDTKU001',
        address: 'Jl. Example No. 123, Jakarta',
        contact_phone: '+62-21-12345678',
        contact_email: 'contact@example.com'
      }
    ]
  }

  /**
   * Get import template for TKA workers
   */
  static getTKAWorkerTemplate(): Record<string, any>[] {
    return [
      {
        nama: 'John Smith',
        passport: 'A12345678',
        divisi: 'Engineering',
        jenis_kelamin: 'Laki-laki'
      },
      {
        nama: 'Jane Doe',
        passport: 'B87654321',
        divisi: 'Management',
        jenis_kelamin: 'Perempuan'
      }
    ]
  }

  /**
   * Get import template for job descriptions
   */
  static getJobDescriptionTemplate(): Record<string, any>[] {
    return [
      {
        company_id: 'uuid-company-id-here',
        job_name: 'Technical Consultant',
        job_description: 'Providing technical consultation services',
        price: 15000000,
        sort_order: 1
      }
    ]
  }

  /**
   * Validate import file format
   */
  static validateImportFormat(
    data: any[],
    type: 'companies' | 'tka_workers' | 'job_descriptions'
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('Import data must be a non-empty array')
      return { valid: false, errors }
    }

    const requiredFields = {
      companies: ['company_name', 'npwp', 'idtku', 'address'],
      tka_workers: ['nama', 'passport'],
      job_descriptions: ['company_id', 'job_name', 'job_description', 'price']
    }

    const required = requiredFields[type]
    const firstRow = data[0]

    for (const field of required) {
      if (!(field in firstRow)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default ImportManager