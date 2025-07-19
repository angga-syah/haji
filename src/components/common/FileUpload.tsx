// components/common/FileUpload.tsx
'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { cn } from '@/lib/utils'
import { FILE_UPLOAD } from '@/lib/constants'

interface FileUploadProps {
  onFileSelect: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<void>
  acceptedTypes?: string[]
  maxFiles?: number
  maxSize?: number // in bytes
  multiple?: boolean
  disabled?: boolean
  className?: string
  dragAndDrop?: boolean
  showPreview?: boolean
  autoUpload?: boolean
}

interface UploadedFile {
  file: File
  preview?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  progress?: number
}

export function FileUpload({
  onFileSelect,
  onUpload,
  acceptedTypes = ['.xlsx', '.xls', '.csv'],
  maxFiles = 5,
  maxSize = FILE_UPLOAD.MAX_SIZE,
  multiple = false,
  disabled = false,
  className,
  dragAndDrop = true,
  showPreview = true,
  autoUpload = false
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`
    }

    // Check file type
    if (acceptedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.includes(fileExtension)) {
        return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
      }
    }

    return null
  }

  const handleFileSelection = (files: FileList) => {
    const fileArray = Array.from(files)
    
    // Limit number of files
    const filesToProcess = multiple ? fileArray.slice(0, maxFiles) : [fileArray[0]]
    
    const validFiles: File[] = []
    const newUploadedFiles: UploadedFile[] = []

    filesToProcess.forEach(file => {
      const error = validateFile(file)
      
      if (error) {
        newUploadedFiles.push({
          file,
          status: 'error',
          error
        })
      } else {
        validFiles.push(file)
        newUploadedFiles.push({
          file,
          status: 'pending',
          preview: createPreview(file)
        })
      }
    })

    setUploadedFiles(prev => multiple ? [...prev, ...newUploadedFiles] : newUploadedFiles)
    
    if (validFiles.length > 0) {
      onFileSelect(validFiles)
      
      if (autoUpload && onUpload) {
        handleUpload(validFiles)
      }
    }
  }

  const createPreview = (file: File): string | undefined => {
    if (!showPreview) return undefined
    
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    
    return undefined
  }

  const handleUpload = async (files?: File[]) => {
    if (!onUpload) return
    
    const filesToUpload = files || uploadedFiles
      .filter(uf => uf.status === 'pending')
      .map(uf => uf.file)
    
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    
    try {
      // Update status to uploading
      setUploadedFiles(prev =>
        prev.map(uf =>
          filesToUpload.includes(uf.file)
            ? { ...uf, status: 'uploading' as const, progress: 0 }
            : uf
        )
      )

      await onUpload(filesToUpload)

      // Update status to success
      setUploadedFiles(prev =>
        prev.map(uf =>
          filesToUpload.includes(uf.file)
            ? { ...uf, status: 'success' as const, progress: 100 }
            : uf
        )
      )
    } catch (error) {
      // Update status to error
      setUploadedFiles(prev =>
        prev.map(uf =>
          filesToUpload.includes(uf.file)
            ? { 
                ...uf, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed' 
              }
            : uf
        )
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files)
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleRetry = (index: number) => {
    const file = uploadedFiles[index]?.file
    if (file && onUpload) {
      handleUpload([file])
    }
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'uploading':
        return <LoadingSpinner size="sm" />
      case 'success':
        return '✅'
      case 'error':
        return '❌'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        onDragOver={dragAndDrop ? handleDragOver : undefined}
        onDragLeave={dragAndDrop ? handleDragLeave : undefined}
        onDrop={dragAndDrop ? handleDrop : undefined}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver && 'border-blue-500 bg-blue-50',
          !isDragOver && 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          
          <div>
            <p className="text-sm text-gray-600">
              {dragAndDrop ? 'Drag and drop files here, or' : 'Select files to upload'}
            </p>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="mt-2"
            >
              Browse Files
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>Accepted formats: {acceptedTypes.join(', ')}</div>
            <div>Max file size: {formatFileSize(maxSize)}</div>
            {multiple && <div>Max files: {maxFiles}</div>}
          </div>
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Selected Files</h4>
            {!autoUpload && onUpload && (
              <Button
                size="sm"
                onClick={() => handleUpload()}
                disabled={isUploading || uploadedFiles.every(f => f.status !== 'pending')}
                loading={isUploading}
              >
                Upload All
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {/* Preview */}
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-sm">
                    📄
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </div>
                  {uploadedFile.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {uploadedFile.error}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <div className="text-lg">
                    {getStatusIcon(uploadedFile.status)}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-1">
                    {uploadedFile.status === 'error' && onUpload && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(index)}
                      >
                        Retry
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="text-center text-sm text-gray-600">
          <LoadingSpinner size="sm" className="inline mr-2" />
          Uploading files...
        </div>
      )}
    </div>
  )
}