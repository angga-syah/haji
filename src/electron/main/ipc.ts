// src/electron/main/ipc.ts
import { ipcMain, BrowserWindow, dialog, shell, app } from 'electron'
import { readFile, writeFile, access, constants } from 'fs/promises'
import { join, dirname } from 'path'
import { PrinterManager } from './printer'

export function setupIPC(mainWindow: BrowserWindow): void {
  // ========== APP INFO ==========
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getName', () => {
    return app.getName()
  })

  ipcMain.handle('app:getPath', (_, name: string) => {
    return app.getPath(name as any)
  })

  // ========== WINDOW CONTROLS ==========
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized()
  })

  // ========== FILE SYSTEM ==========
  ipcMain.handle('fs:readFile', async (_, filePath: string, options?: { encoding?: string }) => {
    try {
      const content = await readFile(filePath, options?.encoding as any || 'utf8')
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string | Buffer, options?: { encoding?: string }) => {
    try {
      await writeFile(filePath, data, options?.encoding as any || 'utf8')
      return true
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('fs:fileExists', async (_, filePath: string) => {
    try {
      await access(filePath, constants.F_OK)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:ensureDir', async (_, dirPath: string) => {
    try {
      const { mkdir } = await import('fs/promises')
      await mkdir(dirPath, { recursive: true })
      return true
    } catch (error) {
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // ========== DIALOGS ==========
  ipcMain.handle('dialog:showOpenDialog', async (_, options: Electron.OpenDialogOptions) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options)
      return result
    } catch (error) {
      throw new Error(`Dialog error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('dialog:showSaveDialog', async (_, options: Electron.SaveDialogOptions) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options)
      return result
    } catch (error) {
      throw new Error(`Dialog error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('dialog:showMessageBox', async (_, options: Electron.MessageBoxOptions) => {
    try {
      const result = await dialog.showMessageBox(mainWindow, options)
      return result
    } catch (error) {
      throw new Error(`Dialog error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('dialog:showErrorBox', (_, title: string, content: string) => {
    dialog.showErrorBox(title, content)
  })

  // ========== FILE OPERATIONS ==========
  ipcMain.handle('file:selectFile', async (_, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [
        { name: 'All Files', extensions: ['*'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('file:selectSaveLocation', async (_, defaultName?: string, filters?: Electron.FileFilter[]) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: filters || [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    return result.filePath
  })

  ipcMain.handle('file:openInExplorer', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return true
    } catch (error) {
      console.error('Error opening file in explorer:', error)
      return false
    }
  })

  ipcMain.handle('file:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url)
      return true
    } catch (error) {
      console.error('Error opening external URL:', error)
      return false
    }
  })

  // ========== PRINTER MANAGEMENT ==========
  ipcMain.handle('printer:getPrinters', async () => {
    try {
      return await PrinterManager.getPrinters()
    } catch (error) {
      throw new Error(`Failed to get printers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('printer:getDefaultPrinter', async () => {
    try {
      return await PrinterManager.getDefaultPrinter()
    } catch (error) {
      throw new Error(`Failed to get default printer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('printer:printPDF', async (_, pdfBuffer: Uint8Array, options: any) => {
    try {
      return await PrinterManager.printPDF(pdfBuffer, options)
    } catch (error) {
      throw new Error(`Failed to print PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('printer:printRaw', async (_, data: string, printerName: string, encoding?: string) => {
    try {
      return await PrinterManager.printRaw(data, printerName, encoding)
    } catch (error) {
      throw new Error(`Failed to print raw data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('printer:testPrinter', async (_, printerName: string) => {
    try {
      return await PrinterManager.testPrinter(printerName)
    } catch (error) {
      console.error('Printer test error:', error)
      return false
    }
  })

  ipcMain.handle('printer:getJobStatus', async (_, jobId: string) => {
    try {
      return await PrinterManager.getJobStatus(jobId)
    } catch (error) {
      console.error('Error getting job status:', error)
      return null
    }
  })

  ipcMain.handle('printer:cancelJob', async (_, jobId: string) => {
    try {
      return await PrinterManager.cancelJob(jobId)
    } catch (error) {
      console.error('Error cancelling job:', error)
      return false
    }
  })

  // ========== DATA EXPORT ==========
  ipcMain.handle('export:saveFile', async (_, data: Buffer | string, defaultName: string, filters?: Electron.FileFilter[]) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultName,
        filters: filters || [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      await writeFile(result.filePath, data)
      
      return { 
        success: true, 
        filePath: result.filePath,
        canceled: false
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        canceled: false
      }
    }
  })

  // ========== SYSTEM INFO ==========
  ipcMain.handle('system:getInfo', () => {
    const os = require('os')
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      osVersion: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime()
    }
  })

  // ========== SETTINGS ==========
  ipcMain.handle('settings:get', async (_, key: string) => {
    try {
      const { app } = await import('electron')
      const userDataPath = app.getPath('userData')
      const settingsPath = join(userDataPath, 'settings.json')
      
      try {
        const content = await readFile(settingsPath, 'utf8')
        const settings = JSON.parse(content)
        return settings[key]
      } catch {
        return null
      }
    } catch (error) {
      console.error('Error getting setting:', error)
      return null
    }
  })

  ipcMain.handle('settings:set', async (_, key: string, value: any) => {
    try {
      const { app } = await import('electron')
      const userDataPath = app.getPath('userData')
      const settingsPath = join(userDataPath, 'settings.json')
      
      let settings = {}
      try {
        const content = await readFile(settingsPath, 'utf8')
        settings = JSON.parse(content)
      } catch {
        // File doesn't exist or is invalid, start with empty object
      }

      settings[key] = value
      
      // Ensure directory exists
      const { mkdir } = await import('fs/promises')
      await mkdir(dirname(settingsPath), { recursive: true })
      
      await writeFile(settingsPath, JSON.stringify(settings, null, 2))
      return true
    } catch (error) {
      console.error('Error setting setting:', error)
      return false
    }
  })

  ipcMain.handle('settings:getAll', async () => {
    try {
      const { app } = await import('electron')
      const userDataPath = app.getPath('userData')
      const settingsPath = join(userDataPath, 'settings.json')
      
      try {
        const content = await readFile(settingsPath, 'utf8')
        return JSON.parse(content)
      } catch {
        return {}
      }
    } catch (error) {
      console.error('Error getting all settings:', error)
      return {}
    }
  })

  // ========== DATABASE BACKUP ==========
  ipcMain.handle('backup:create', async (_, backupPath?: string) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultName = `invoice-backup-${timestamp}.sql`
      
      let filePath = backupPath
      if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
          defaultPath: defaultName,
          filters: [
            { name: 'SQL Files', extensions: ['sql'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, canceled: true }
        }

        filePath = result.filePath
      }

      // This would be implemented to backup the database
      // For now, return a placeholder
      await writeFile(filePath, `-- Database backup created at ${new Date().toISOString()}\n-- Placeholder backup file`)
      
      return { 
        success: true, 
        filePath,
        canceled: false
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        canceled: false
      }
    }
  })

  // ========== DEVELOPMENT HELPERS ==========
  if (process.env.NODE_ENV === 'development') {
    ipcMain.handle('dev:openDevTools', () => {
      mainWindow.webContents.openDevTools()
    })

    ipcMain.handle('dev:reload', () => {
      mainWindow.reload()
    })

    ipcMain.handle('dev:clearCache', async () => {
      await mainWindow.webContents.session.clearCache()
      return true
    })
  }

  // ========== ERROR HANDLING ==========
  ipcMain.handle('error:report', async (_, errorInfo: any) => {
    console.error('Renderer error:', errorInfo)
    
    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
    }
    
    return true
  })

  console.log('IPC handlers registered successfully')
}