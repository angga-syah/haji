// hooks/business/useInvoiceWorkflow.ts
import { useState, useCallback, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/ui/useLocalStorage'
import { useInvoiceCalculation } from './useInvoiceCalculation'
import { useGenerateInvoiceNumber } from '@/hooks/api/useInvoices'
import { useCompanies } from '@/hooks/api/useCompanies'
import { useTKAWorkers } from '@/hooks/api/useTKAWorkers'
import { useJobDescriptions } from '@/hooks/api/useJobDescriptions'
import { useBankAccounts } from '@/hooks/api/useBankAccounts'
import type { CreateInvoiceData, CreateInvoiceLineData } from '@/lib/types'

// ========== TYPES ==========
interface WorkflowStep {
  id: string
  title: string
  completed: boolean
  optional?: boolean
}

interface InvoiceWorkflowState {
  currentStep: number
  company_id: string
  invoice_date: string
  notes: string
  bank_account_id: string
  lines: CreateInvoiceLineData[]
  invoice_number: string
}

interface ValidationError {
  field: string
  message: string
}

interface StepValidation {
  isValid: boolean
  errors: ValidationError[]
  canProceed: boolean
}

// ========== WORKFLOW STEPS ==========
const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'company', title: 'Select Company', completed: false },
  { id: 'details', title: 'Invoice Details', completed: false },
  { id: 'lines', title: 'Line Items', completed: false },
  { id: 'review', title: 'Review & Submit', completed: false, optional: true }
]

// ========== MAIN HOOK ==========
export function useInvoiceWorkflow() {
  // Workflow state
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state with persistence
  const [formData, setFormData, clearFormData] = useLocalStorage<InvoiceWorkflowState>(
    'invoice-draft',
    {
      currentStep: 0,
      company_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      notes: '',
      bank_account_id: '',
      lines: [],
      invoice_number: ''
    }
  )
  
  // API hooks
  const { refetch: generateNumber } = useGenerateInvoiceNumber()
  const { data: companiesData } = useCompanies({ limit: 100 })
  const { data: bankAccountsData } = useBankAccounts({ limit: 50 })
  
  // Selected company data
  const selectedCompany = companiesData?.companies?.find(c => c.id === formData.company_id)
  
  // Job descriptions for selected company
  const { data: jobDescriptionsData } = useJobDescriptions(formData.company_id)
  
  // Invoice calculations
  const calculations = useInvoiceCalculation(formData.lines)
  
  // ========== NAVIGATION ==========
  const nextStep = useCallback(() => {
    if (currentStep < WORKFLOW_STEPS.length - 1) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      setFormData(prev => ({ ...prev, currentStep: newStep }))
    }
  }, [currentStep, setFormData])
  
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      setFormData(prev => ({ ...prev, currentStep: newStep }))
    }
  }, [currentStep, setFormData])
  
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < WORKFLOW_STEPS.length) {
      setCurrentStep(stepIndex)
      setFormData(prev => ({ ...prev, currentStep: stepIndex }))
    }
  }, [setFormData])
  
  // ========== FORM UPDATES ==========
  const updateField = useCallback((field: keyof InvoiceWorkflowState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [setFormData])
  
  const updateCompany = useCallback(async (companyId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      company_id: companyId,
      lines: [] // Clear lines when company changes
    }))
    
    // Generate new invoice number
    try {
      const { data } = await generateNumber()
      if (data?.invoice_number) {
        setFormData(prev => ({ ...prev, invoice_number: data.invoice_number }))
      }
    } catch (error) {
      console.error('Failed to generate invoice number:', error)
    }
  }, [setFormData, generateNumber])
  
  const addLine = useCallback((line: Omit<CreateInvoiceLineData, 'baris'>) => {
    setFormData(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          ...line,
          baris: prev.lines.length + 1
        }
      ]
    }))
  }, [setFormData])
  
  const updateLine = useCallback((index: number, updates: Partial<CreateInvoiceLineData>) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, ...updates } : line
      )
    }))
  }, [setFormData])
  
  const removeLine = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }))
  }, [setFormData])
  
  const reorderLines = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newLines = [...prev.lines]
      const [removed] = newLines.splice(fromIndex, 1)
      newLines.splice(toIndex, 0, removed)
      
      // Update baris numbers
      return {
        ...prev,
        lines: newLines.map((line, index) => ({
          ...line,
          baris: index + 1
        }))
      }
    })
  }, [setFormData])
  
  // ========== VALIDATION ==========
  const validateStep = useCallback((stepIndex: number): StepValidation => {
    const errors: ValidationError[] = []
    
    switch (stepIndex) {
      case 0: // Company selection
        if (!formData.company_id) {
          errors.push({ field: 'company_id', message: 'Please select a company' })
        }
        break
        
      case 1: // Invoice details
        if (!formData.invoice_date) {
          errors.push({ field: 'invoice_date', message: 'Invoice date is required' })
        }
        if (!formData.invoice_number) {
          errors.push({ field: 'invoice_number', message: 'Invoice number is required' })
        }
        break
        
      case 2: // Line items
        if (formData.lines.length === 0) {
          errors.push({ field: 'lines', message: 'At least one line item is required' })
        }
        
        // Validate each line
        formData.lines.forEach((line, index) => {
          if (!line.tka_id) {
            errors.push({ field: `lines.${index}.tka_id`, message: `Line ${index + 1}: TKA worker is required` })
          }
          if (!line.job_description_id) {
            errors.push({ field: `lines.${index}.job_description_id`, message: `Line ${index + 1}: Job description is required` })
          }
          if (!line.quantity || line.quantity <= 0) {
            errors.push({ field: `lines.${index}.quantity`, message: `Line ${index + 1}: Valid quantity is required` })
          }
        })
        break
        
      case 3: // Review (optional validation)
        // All previous validations should pass
        for (let i = 0; i < 3; i++) {
          const stepValidation = validateStep(i)
          errors.push(...stepValidation.errors)
        }
        break
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      canProceed: errors.length === 0
    }
  }, [formData])
  
  // ========== STEP COMPLETION ==========
  const stepCompletion = useCallback(() => {
    return WORKFLOW_STEPS.map((_, index) => {
      const validation = validateStep(index)
      return {
        ...WORKFLOW_STEPS[index],
        completed: validation.isValid
      }
    })
  }, [validateStep])
  
  // ========== AUTO-SAVE ==========
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      // Auto-save draft to localStorage (already handled by useLocalStorage)
      console.log('Auto-saved invoice draft')
    }, 30000) // Every 30 seconds
    
    return () => clearInterval(autoSaveInterval)
  }, [])
  
  // ========== RESET WORKFLOW ==========
  const resetWorkflow = useCallback(() => {
    setCurrentStep(0)
    clearFormData()
  }, [clearFormData])
  
  // ========== PREPARE SUBMISSION DATA ==========
  const prepareSubmissionData = useCallback((): CreateInvoiceData => {
    return {
      company_id: formData.company_id,
      invoice_date: formData.invoice_date,
      notes: formData.notes || undefined,
      bank_account_id: formData.bank_account_id || undefined,
      lines: formData.lines
    }
  }, [formData])
  
  // ========== AUTO-COMPLETE FIELDS ==========
  const autoCompleteFields = useCallback(() => {
    // Auto-set default bank account if not selected
    if (!formData.bank_account_id && bankAccountsData?.bank_accounts) {
      const defaultBank = bankAccountsData.bank_accounts.find(bank => bank.is_default)
      if (defaultBank) {
        updateField('bank_account_id', defaultBank.id)
      }
    }
  }, [formData.bank_account_id, bankAccountsData, updateField])
  
  // Auto-complete when data becomes available
  useEffect(() => {
    autoCompleteFields()
  }, [autoCompleteFields])
  
  // ========== RETURN OBJECT ==========
  return {
    // Current state
    currentStep,
    steps: stepCompletion(),
    formData,
    isSubmitting,
    
    // Related data
    selectedCompany,
    availableCompanies: companiesData?.companies || [],
    availableJobDescriptions: jobDescriptionsData?.job_descriptions || [],
    availableBankAccounts: bankAccountsData?.bank_accounts || [],
    
    // Calculations
    calculations,
    
    // Navigation
    nextStep,
    previousStep,
    goToStep,
    canGoNext: validateStep(currentStep).canProceed,
    canGoPrevious: currentStep > 0,
    
    // Form updates
    updateField,
    updateCompany,
    addLine,
    updateLine,
    removeLine,
    reorderLines,
    
    // Validation
    validateStep,
    currentStepValidation: validateStep(currentStep),
    
    // Workflow control
    resetWorkflow,
    prepareSubmissionData,
    setIsSubmitting,
    
    // Utilities
    hasUnsavedChanges: formData.lines.length > 0 || formData.company_id !== '',
    completionPercentage: Math.round((stepCompletion().filter(s => s.completed).length / WORKFLOW_STEPS.length) * 100)
  }
}

// ========== WORKFLOW STEP COMPONENT PROPS ==========
export interface WorkflowStepProps {
  workflow: ReturnType<typeof useInvoiceWorkflow>
  onNext: () => void
  onPrevious: () => void
}

// ========== STEP VALIDATORS ==========
export const StepValidators = {
  validateCompanyStep: (companyId: string) => {
    return {
      isValid: !!companyId,
      errors: companyId ? [] : [{ field: 'company_id', message: 'Company is required' }]
    }
  },
  
  validateDetailsStep: (invoiceDate: string, invoiceNumber: string) => {
    const errors: ValidationError[] = []
    if (!invoiceDate) errors.push({ field: 'invoice_date', message: 'Invoice date is required' })
    if (!invoiceNumber) errors.push({ field: 'invoice_number', message: 'Invoice number is required' })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  validateLinesStep: (lines: CreateInvoiceLineData[]) => {
    const errors: ValidationError[] = []
    
    if (lines.length === 0) {
      errors.push({ field: 'lines', message: 'At least one line item is required' })
    }
    
    lines.forEach((line, index) => {
      if (!line.tka_id) {
        errors.push({ field: `lines.${index}.tka_id`, message: `Line ${index + 1}: TKA worker is required` })
      }
      if (!line.job_description_id) {
        errors.push({ field: `lines.${index}.job_description_id`, message: `Line ${index + 1}: Job description is required` })
      }
      if (!line.quantity || line.quantity <= 0) {
        errors.push({ field: `lines.${index}.quantity`, message: `Line ${index + 1}: Valid quantity is required` })
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}