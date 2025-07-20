// src/electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const electronAPI = {
  // ========== APP INFO ==========
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name)
  },

  // ========== WINDOW CONTROLS ==========
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    
    // Window events
    onMaximize: (callback: () => void) => {
      ipcRenderer.on('window-maximized', callback)
      return () => ipcRenderer.removeListener('window-maximized', callback)
    },
    onUnmaximize: (callback: () => void) => {
      ipcRenderer.on('window-unmaximized', callback)
      return () => ipcRenderer.removeListener('window-unmaximized', callback)
    }
  },

  // ========== FILE SYSTEM ==========
  fs: {
    readFile: (filePath: string, options?: { encoding?: string }) => 
      ipcRenderer.invoke('fs:readFile', filePath, options),
    writeFile: (filePath: string, data: string | Buffer, options?: { encoding?: string }) =>
      ipcRenderer.invoke('fs:writeFile', filePath, data, options),
    fileExists: (filePath: string) => ipcRenderer.invoke('fs:fileExists', filePath),
    ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath)
  },

  // ========== DIALOGS ==========
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options: Electron.MessageBoxOptions) =>
      ipcRenderer.invoke('dialog:showMessageBox', options),
    showErrorBox: (title: string, content: string) =>
      ipcRenderer.invoke('dialog:showErrorBox', title, content)
  },

  // ========== FILE OPERATIONS ==========
  file: {
    selectFile: (filters?: Electron.FileFilter[]) =>
      ipcRenderer.invoke('file:selectFile', filters),
    selectSaveLocation: (defaultName?: string, filters?: Electron.FileFilter[]) =>
      ipcRenderer.invoke('file:selectSaveLocation', defaultName, filters),
    openInExplorer: (filePath: string) =>
      ipcRenderer.invoke('file:openInExplorer', filePath),
    openExternal: (url: string) =>
      ipcRenderer.invoke('file:openExternal', url)
  },

  // ========== PRINTER MANAGEMENT ==========
  printer: {
    getPrinters: () => ipcRenderer.invoke('printer:getPrinters'),
    getDefaultPrinter: () => ipcRenderer.invoke('printer:getDefaultPrinter'),
    printPDF: (pdfBuffer: Uint8Array, options: any) =>
      ipcRenderer.invoke('printer:printPDF', pdfBuffer, options),
    printRaw: (data: string, printerName: string, encoding?: string) =>
      ipcRenderer.invoke('printer:printRaw', data, printerName, encoding),
    testPrinter: (printerName: string) =>
      ipcRenderer.invoke('printer:testPrinter', printerName),
    getJobStatus: (jobId: string) =>
      ipcRenderer.invoke('printer:getJobStatus', jobId),
    cancelJob: (jobId: string) =>
      ipcRenderer.invoke('printer:cancelJob', jobId)
  },

  // ========== DATA EXPORT ==========
  export: {
    saveFile: (data: Buffer | string, defaultName: string, filters?: Electron.FileFilter[]) =>
      ipcRenderer.invoke('export:saveFile', data, defaultName, filters)
  },

  // ========== SYSTEM INFO ==========
  system: {
    getInfo: () => ipcRenderer.invoke('system:getInfo')
  },

  // ========== SETTINGS ==========
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },

  // ========== DATABASE BACKUP ==========
  backup: {
    create: (backupPath?: string) => ipcRenderer.invoke('backup:create', backupPath)
  },

  // ========== MENU ACTIONS ==========
  menu: {
    onAction: (callback: (action: string, ...args: any[]) => void) => {
      const handler = (_: any, action: string, ...args: any[]) => callback(action, ...args)
      ipcRenderer.on('menu-action', handler)
      return () => ipcRenderer.removeListener('menu-action', handler)
    }
  },

  // ========== ERROR REPORTING ==========
  error: {
    report: (errorInfo: any) => ipcRenderer.invoke('error:report', errorInfo)
  },

  // ========== DEVELOPMENT HELPERS ==========
  ...(process.env.NODE_ENV === 'development' && {
    dev: {
      openDevTools: () => ipcRenderer.invoke('dev:openDevTools'),
      reload: () => ipcRenderer.invoke('dev:reload'),
      clearCache: () => ipcRenderer.invoke('dev:clearCache')
    }
  })
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Also expose isElectron flag for feature detection
contextBridge.exposeInMainWorld('isElectron', true)

// Version info
contextBridge.exposeInMainWorld('versions', {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron
})

// Platform info
contextBridge.exposeInMainWorld('platform', {
  os: process.platform,
  arch: process.arch
})

// Environment info
contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV
})

// Enhanced error handler for renderer process
window.addEventListener('error', (event) => {
  const errorInfo = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? {
      name: event.error.name,
      message: event.error.message,
      stack: event.error.stack
    } : null,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  // Report error to main process
  ipcRenderer.invoke('error:report', errorInfo)
})

// Enhanced unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const errorInfo = {
    type: 'unhandledRejection',
    reason: event.reason,
    promise: 'Promise object',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  }

  // Report error to main process
  ipcRenderer.invoke('error:report', errorInfo)
})

// Console override for better logging in development
if (process.env.NODE_ENV === 'development') {
  const originalConsole = { ...console }
  
  console.log = (...args) => {
    originalConsole.log('[Renderer]', ...args)
  }
  
  console.error = (...args) => {
    originalConsole.error('[Renderer Error]', ...args)
    
    // Also report errors to main process
    ipcRenderer.invoke('error:report', {
      type: 'console.error',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      url: window.location.href
    })
  }
  
  console.warn = (...args) => {
    originalConsole.warn('[Renderer Warning]', ...args)
  }
}

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('load', () => {
    const perfData = {
      loadTime: Date.now() - performance.timeOrigin,
      domContentLoaded: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    }
    
    console.log('Performance metrics:', perfData)
  })
}

// Memory usage monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const memoryInfo = {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      }
      
      // Log memory usage if it's getting high
      if (memoryInfo.usedJSHeapSize > 100) {
        console.warn('High memory usage:', memoryInfo)
      }
    }
  }, 30000) // Check every 30 seconds
}

// Cleanup on window unload
window.addEventListener('beforeunload', () => {
  // Clean up any listeners or resources
  console.log('Renderer process cleaning up...')
})

console.log('Preload script loaded successfully')

// Type definitions for global objects (this would be in a separate .d.ts file in a real project)
declare global {
  interface Window {
    electronAPI: typeof electronAPI
    isElectron: boolean
    versions: {
      node: string
      chrome: string
      electron: string
    }
    platform: {
      os: string
      arch: string
    }
    env: {
      NODE_ENV: string
    }
  }
}

export {} // Make this a module