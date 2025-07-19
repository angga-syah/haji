// stores/settingsStore.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSetting } from '@/lib/types'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  itemsPerPage: number
  dateFormat: string
  currencyFormat: string
  language: 'id' | 'en'
  autoSave: boolean
  autoSaveInterval: number // in seconds
  showTutorial: boolean
  compactMode: boolean
}

interface PrintSettings {
  defaultPrinter: string
  paperSize: 'a4' | 'letter' | 'dotmatrix'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  fontSize: number
  includeCompanyLogo: boolean
  includeBankDetails: boolean
}

interface SystemSettings {
  vatPercentage: number
  invoiceNumberPrefix: string
  invoiceNumberSuffix: string
  defaultBankAccountId: string
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
    logo?: string
  }
  emailSettings: {
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPassword: string
    fromEmail: string
    fromName: string
  }
}

interface SettingsState {
  // Settings data
  userPreferences: UserPreferences
  printSettings: PrintSettings
  systemSettings: SystemSettings
  appSettings: Record<string, any>
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Actions
  setUserPreferences: (preferences: Partial<UserPreferences>) => void
  setPrintSettings: (settings: Partial<PrintSettings>) => void
  setSystemSettings: (settings: Partial<SystemSettings>) => void
  setAppSetting: (key: string, value: any) => void
  setAppSettings: (settings: Record<string, any>) => void
  
  // Async actions
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  resetToDefaults: () => void
  
  // Getters
  getSetting: (key: string, defaultValue?: any) => any
  getVATPercentage: () => number
  getDateFormat: () => string
  getCurrencyFormat: () => string
  
  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  itemsPerPage: 20,
  dateFormat: 'DD/MM/YYYY',
  currencyFormat: 'id-ID',
  language: 'id',
  autoSave: true,
  autoSaveInterval: 30,
  showTutorial: true,
  compactMode: false
}

const defaultPrintSettings: PrintSettings = {
  defaultPrinter: '',
  paperSize: 'a4',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  fontSize: 10,
  includeCompanyLogo: true,
  includeBankDetails: true
}

const defaultSystemSettings: SystemSettings = {
  vatPercentage: 11.00,
  invoiceNumberPrefix: 'INV',
  invoiceNumberSuffix: '',
  defaultBankAccountId: '',
  companyInfo: {
    name: 'Spirit of Services',
    address: 'Jakarta Office, Indonesia',
    phone: '',
    email: '',
    logo: undefined
  },
  emailSettings: {
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Spirit of Services'
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      userPreferences: defaultUserPreferences,
      printSettings: defaultPrintSettings,
      systemSettings: defaultSystemSettings,
      appSettings: {},
      isLoading: false,
      error: null,

      setUserPreferences: (preferences) => {
        const current = get().userPreferences
        set({ 
          userPreferences: { ...current, ...preferences }
        })
      },

      setPrintSettings: (settings) => {
        const current = get().printSettings
        set({ 
          printSettings: { ...current, ...settings }
        })
      },

      setSystemSettings: (settings) => {
        const current = get().systemSettings
        set({ 
          systemSettings: { ...current, ...settings }
        })
      },

      setAppSetting: (key, value) => {
        const current = get().appSettings
        set({
          appSettings: { ...current, [key]: value }
        })
      },

      setAppSettings: (settings) => {
        set({ appSettings: settings })
      },

      loadSettings: async () => {
        set({ isLoading: true, error: null })
        
        try {
          // Load settings from API
          const response = await fetch('/api/settings')
          if (!response.ok) {
            throw new Error('Failed to load settings')
          }
          
          const data = await response.json()
          
          // Update stores with loaded data
          if (data.userPreferences) {
            set({ userPreferences: { ...defaultUserPreferences, ...data.userPreferences } })
          }
          
          if (data.systemSettings) {
            set({ systemSettings: { ...defaultSystemSettings, ...data.systemSettings } })
          }
          
          if (data.appSettings) {
            set({ appSettings: data.appSettings })
          }
          
        } catch (error) {
          console.error('Error loading settings:', error)
          set({ error: error instanceof Error ? error.message : 'Failed to load settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      saveSettings: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const { userPreferences, systemSettings, appSettings } = get()
          
          const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userPreferences,
              systemSettings,
              appSettings
            })
          })
          
          if (!response.ok) {
            throw new Error('Failed to save settings')
          }
          
        } catch (error) {
          console.error('Error saving settings:', error)
          set({ error: error instanceof Error ? error.message : 'Failed to save settings' })
        } finally {
          set({ isLoading: false })
        }
      },

      resetToDefaults: () => {
        set({
          userPreferences: defaultUserPreferences,
          printSettings: defaultPrintSettings,
          systemSettings: defaultSystemSettings,
          appSettings: {}
        })
      },

      getSetting: (key, defaultValue = null) => {
        const { appSettings } = get()
        return appSettings[key] ?? defaultValue
      },

      getVATPercentage: () => {
        const { systemSettings } = get()
        return systemSettings.vatPercentage
      },

      getDateFormat: () => {
        const { userPreferences } = get()
        return userPreferences.dateFormat
      },

      getCurrencyFormat: () => {
        const { userPreferences } = get()
        return userPreferences.currencyFormat
      },

      setError: (error) => set({ error }),

      clearError: () => set({ error: null })
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        printSettings: state.printSettings,
        // Don't persist system settings - load from server
      }),
    }
  )
)