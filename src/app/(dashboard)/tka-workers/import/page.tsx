// src/app/(dashboard)/tka-workers/import/page.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/common/FileUpload'
import { PageTitle } from '@/components/common/PageTitle'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { parseCSVFile } from '@/lib/import/csv'
import { parseExcelFile } from '@/lib/import/excel'
import { TKAWorkerValidator, normalizeGender } from '@/lib/import/excel'
import { useAuth } from '@/hooks/ui/useAuth'
import Link from 'next/link'

interface ImportRow {
  nama: string
  passport: string
  divisi?: string
  jenis_kelamin: string
  [key: string]: any
}

interface ImportResult {
  total: number
  success: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
    data: ImportRow
  }>
  successful: ImportRow[]
}

export default function TKAWorkersImportPage() {
  const router = useRouter()
  const { canCreateTKAWorkers } = useAuth()
  
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewData, setPreviewData] = useState<ImportRow[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload')

  // Check permissions
  if (!canCreateTKAWorkers()) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">You don't have permission to import TKA workers.</p>
        <Link href="/tka-workers">
          <Button variant="outline" className="mt-4">Back to TKA Workers</Button>
        </Link>
      </div>
    )
  }

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setIsProcessing(true)
    setImportResult(null)
    
    try {
      let parseResult
      
      if (selectedFile.name.endsWith('.csv')) {
        parseResult = await parseCSVFile<ImportRow>(selectedFile, {
          hasHeader: true,
          skipEmptyLines: true,
          trimWhitespace: true
        })
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        parseResult = await parseExcelFile<ImportRow>(selectedFile, {
          hasHeader: true,
          skipEmptyRows: true,
          trimWhitespace: true,
          maxRows: 1000
        })
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.')
      }

      if (parseResult.errors.length > 0) {
        console.warn('Parse errors:', parseResult.errors)
      }

      // Process and validate data
      const processedData = parseResult.data.map((row, index) => {
        // Normalize field names (case insensitive)
        const normalized: ImportRow = {
          nama: row.nama || row.Nama || row.name || row.Name || '',
          passport: row.passport || row.Passport || row.passport_number || row['Passport Number'] || '',
          divisi: row.divisi || row.Divisi || row.division || row.Division || '',
          jenis_kelamin: normalizeGender(row.jenis_kelamin || row['Jenis Kelamin'] || row.gender || row.Gender || 'Laki-laki')
        }
        
        return normalized
      })

      setPreviewData(processedData.slice(0, 100)) // Limit preview to 100 rows
      setCurrentStep('preview')
      
    } catch (error) {
      console.error('File processing error:', error)
      alert(error instanceof Error ? error.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleImport = async () => {
    if (!file || previewData.length === 0) return
    
    setIsProcessing(true)
    
    try {
      // Validate all data first
      const validationResults = previewData.map((row, index) => {
        const validation = TKAWorkerValidator.validate(row)
        return {
          index,
          row,
          isValid: validation.isValid,
          errors: validation.errors
        }
      })

      const validRows = validationResults.filter(r => r.isValid).map(r => r.row)
      const invalidRows = validationResults.filter(r => !r.isValid)

      // Import valid rows
      const formData = new FormData()
      formData.append('data', JSON.stringify(validRows))

      const response = await fetch('/api/tka-workers/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }

      const result = await response.json()

      setImportResult({
        total: previewData.length,
        success: result.imported,
        failed: invalidRows.length + (result.errors?.length || 0),
        errors: [
          ...invalidRows.flatMap(r => 
            r.errors.map(error => ({
              row: r.index + 1,
              field: error.field,
              message: error.message,
              data: r.row
            }))
          ),
          ...(result.errors || [])
        ],
        successful: validRows.slice(0, result.imported)
      })

      setCurrentStep('result')
      
    } catch (error) {
      console.error('Import error:', error)
      alert(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      ['nama', 'passport', 'divisi', 'jenis_kelamin'],
      ['John Smith', 'A12345678', 'Engineering', 'Laki-laki'],
      ['Jane Doe', 'B87654321', 'Project Management', 'Perempuan']
    ]

    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tka-workers-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const resetImport = () => {
    setFile(null)
    setPreviewData([])
    setImportResult(null)
    setCurrentStep('upload')
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Import TKA Workers"
        description="Import TKA worker data from CSV or Excel files"
        action={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={downloadTemplate}>
              Download Template
            </Button>
            <Link href="/tka-workers">
              <Button variant="outline">Back to TKA Workers</Button>
            </Link>
          </div>
        }
      />

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['upload', 'preview', 'result'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep === step ? 'bg-blue-600 text-white' : 
                ['upload', 'preview', 'result'].indexOf(currentStep) > index ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}
            `}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${currentStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
              {step === 'upload' ? 'Upload File' : step === 'preview' ? 'Preview Data' : 'Import Results'}
            </span>
            {index < 2 && (
              <div className={`ml-4 w-8 h-0.5 ${
                ['upload', 'preview', 'result'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".csv,.xlsx,.xls"
              maxSize={10 * 1024 * 1024} // 10MB
              disabled={isProcessing}
            />
            
            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
                <span className="ml-3">Processing file...</span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">File Requirements</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Maximum rows: 1,000</li>
                <li>• Required columns: nama, passport, jenis_kelamin</li>
                <li>• Optional columns: divisi</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {currentStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Data ({previewData.length} rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">No</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Nama</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Passport</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Divisi</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Jenis Kelamin</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.nama}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.passport}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.divisi || '-'}</td>
                      <td className="border border-gray-300 px-4 py-2">{row.jenis_kelamin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.length > 10 && (
              <p className="text-sm text-gray-600 mt-2">
                Showing first 10 rows of {previewData.length} total rows
              </p>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={resetImport}>
                Upload Different File
              </Button>
              <Button 
                onClick={handleImport} 
                loading={isProcessing}
                disabled={isProcessing || previewData.length === 0}
              >
                Import {previewData.length} Records
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Step */}
      {currentStep === 'result' && importResult && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                  <p className="text-sm text-blue-800">Total Records</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <p className="text-sm text-green-800">Successfully Imported</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <p className="text-sm text-red-800">Failed</p>
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={resetImport}>
                  Import Another File
                </Button>
                <Link href="/tka-workers">
                  <Button>View TKA Workers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Import Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Row</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Field</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Error</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.slice(0, 20).map((error, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-2">{error.row}</td>
                          <td className="border border-gray-300 px-4 py-2">{error.field}</td>
                          <td className="border border-gray-300 px-4 py-2 text-red-600">{error.message}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            {JSON.stringify(error.data)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {importResult.errors.length > 20 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Showing first 20 errors of {importResult.errors.length} total errors
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}