// lib/import/csv.ts
interface CSVParseOptions {
  delimiter?: string
  hasHeader?: boolean
  skipEmptyLines?: boolean
  trimWhitespace?: boolean
  encoding?: string
}

interface ParseResult<T> {
  data: T[]
  errors: Array<{
    row: number
    field: string
    value: any
    error: string
  }>
  meta: {
    totalRows: number
    validRows: number
    errorRows: number
    fields: string[]
  }
}

/**
 * CSV Parser for importing data
 */
export class CSVParser {
  private options: Required<CSVParseOptions>

  constructor(options: CSVParseOptions = {}) {
    this.options = {
      delimiter: options.delimiter || ',',
      hasHeader: options.hasHeader ?? true,
      skipEmptyLines: options.skipEmptyLines ?? true,
      trimWhitespace: options.trimWhitespace ?? true,
      encoding: options.encoding || 'utf-8'
    }
  }

  /**
   * Parse CSV string to objects
   */
  parse<T = Record<string, any>>(csvString: string): ParseResult<T> {
    const lines = this.splitLines(csvString)
    const errors: ParseResult<T>['errors'] = []
    const data: T[] = []
    
    if (lines.length === 0) {
      return {
        data: [],
        errors: [],
        meta: {
          totalRows: 0,
          validRows: 0,
          errorRows: 0,
          fields: []
        }
      }
    }

    let headers: string[] = []
    let startIndex = 0

    // Extract headers
    if (this.options.hasHeader) {
      headers = this.parseRow(lines[0])
      if (this.options.trimWhitespace) {
        headers = headers.map(h => h.trim())
      }
      startIndex = 1
    } else {
      // Generate default headers
      const firstRow = this.parseRow(lines[0])
      headers = firstRow.map((_, index) => `column_${index + 1}`)
    }

    // Parse data rows
    for (let i = startIndex; i < lines.length; i++) {
      const lineNumber = i + 1
      const line = lines[i]

      // Skip empty lines if configured
      if (this.options.skipEmptyLines && !line.trim()) {
        continue
      }

      try {
        const values = this.parseRow(line)
        
        // Create object from values
        const row: Record<string, any> = {}
        
        headers.forEach((header, index) => {
          let value = values[index] || ''
          
          if (this.options.trimWhitespace && typeof value === 'string') {
            value = value.trim()
          }
          
          row[header] = value
        })

        data.push(row as T)
      } catch (error) {
        errors.push({
          row: lineNumber,
          field: 'row',
          value: line,
          error: error instanceof Error ? error.message : 'Parse error'
        })
      }
    }

    return {
      data,
      errors,
      meta: {
        totalRows: lines.length - (this.options.hasHeader ? 1 : 0),
        validRows: data.length,
        errorRows: errors.length,
        fields: headers
      }
    }
  }

  /**
   * Parse CSV file from File object
   */
  async parseFile<T = Record<string, any>>(file: File): Promise<ParseResult<T>> {
    const text = await this.readFileAsText(file)
    return this.parse<T>(text)
  }

  /**
   * Parse single CSV row, handling quoted values and delimiters
   */
  private parseRow(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === this.options.delimiter && !inQuotes) {
        // Field separator
        result.push(current)
        current = ''
      } else {
        current += char
      }

      i++
    }

    // Add the last field
    result.push(current)

    return result
  }

  /**
   * Split CSV into lines, handling line breaks within quoted fields
   */
  private splitLines(csvString: string): string[] {
    const lines: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < csvString.length) {
      const char = csvString[i]
      const nextChar = csvString[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '""'
          i += 2
          continue
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          current += char
        }
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // Line break outside quotes
        if (current.trim()) {
          lines.push(current)
        }
        current = ''
        
        // Skip \r\n
        if (char === '\r' && nextChar === '\n') {
          i++
        }
      } else {
        current += char
      }

      i++
    }

    // Add the last line
    if (current.trim()) {
      lines.push(current)
    }

    return lines
  }

  /**
   * Read file as text with proper encoding
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsText(file, this.options.encoding)
    })
  }
}

/**
 * Quick CSV parsing utility
 */
export function parseCSV<T = Record<string, any>>(
  csvString: string, 
  options: CSVParseOptions = {}
): ParseResult<T> {
  const parser = new CSVParser(options)
  return parser.parse<T>(csvString)
}

/**
 * Parse CSV file utility
 */
export async function parseCSVFile<T = Record<string, any>>(
  file: File, 
  options: CSVParseOptions = {}
): Promise<ParseResult<T>> {
  const parser = new CSVParser(options)
  return parser.parseFile<T>(file)
}

/**
 * Convert objects to CSV string
 */
export function objectsToCSV<T extends Record<string, any>>(
  data: T[],
  options: {
    headers?: string[]
    delimiter?: string
    includeHeaders?: boolean
  } = {}
): string {
  const {
    headers,
    delimiter = ',',
    includeHeaders = true
  } = options

  if (data.length === 0) return ''

  // Determine headers
  const csvHeaders = headers || Object.keys(data[0])
  
  // Escape CSV value
  const escapeValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    
    const stringValue = String(value)
    
    // Check if escaping is needed
    if (stringValue.includes(delimiter) || 
        stringValue.includes('"') || 
        stringValue.includes('\n') || 
        stringValue.includes('\r')) {
      // Escape quotes and wrap in quotes
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    
    return stringValue
  }

  const lines: string[] = []

  // Add headers
  if (includeHeaders) {
    lines.push(csvHeaders.map(escapeValue).join(delimiter))
  }

  // Add data rows
  data.forEach(row => {
    const values = csvHeaders.map(header => escapeValue(row[header]))
    lines.push(values.join(delimiter))
  })

  return lines.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(
  data: Record<string, any>[],
  filename: string,
  options?: Parameters<typeof objectsToCSV>[1]
): void {
  const csvContent = objectsToCSV(data, options)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(link.href)
}