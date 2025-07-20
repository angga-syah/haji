// src/electron/main/main.ts
import { app, BrowserWindow, Menu, shell, dialog, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupIPC } from './ipc'
import { PrinterManager } from './printer'

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  function createWindow(): void {
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      center: true,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      ...(process.platform === 'linux' ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: !is.dev, // Disable web security in development only
        allowRunningInsecureContent: false
      }
    })

    // Set up window event handlers
    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
      
      // Open DevTools in development
      if (is.dev) {
        mainWindow?.webContents.openDevTools()
      }
    })

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    // Handle window controls on macOS
    if (process.platform === 'darwin') {
      mainWindow.on('close', (event) => {
        event.preventDefault()
        mainWindow?.hide()
      })
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Load the app
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Setup IPC handlers
    setupIPC(mainWindow)

    // Initialize printer manager
    PrinterManager.initialize()
  }

  // App event handlers
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.spiritofservices.invoice')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Setup protocol for file access
    protocol.registerFileProtocol('app', (request, callback) => {
      const url = request.url.substr(6)
      callback({ path: join(__dirname, url) })
    })

    createWindow()
    createApplicationMenu()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  // Handle second instance
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Security: Prevent navigation to external websites
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl)
      
      // Allow navigation to local development server
      if (is.dev && parsedUrl.origin === process.env['ELECTRON_RENDERER_URL']?.split('/').slice(0, 3).join('/')) {
        return
      }
      
      // Prevent navigation to external websites
      if (parsedUrl.origin !== 'app://local') {
        event.preventDefault()
      }
    })

    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    })
  })

  // Handle certificate errors
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (is.dev) {
      // In development, ignore certificate errors
      event.preventDefault()
      callback(true)
    } else {
      // In production, use default behavior
      callback(false)
    }
  })

  function createApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Invoice',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              mainWindow?.webContents.send('menu-action', 'new-invoice')
            }
          },
          {
            label: 'Open...',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ['openFile'],
                filters: [
                  { name: 'CSV Files', extensions: ['csv'] },
                  { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
                  { name: 'All Files', extensions: ['*'] }
                ]
              })

              if (!result.canceled && result.filePaths.length > 0) {
                mainWindow?.webContents.send('menu-action', 'open-file', result.filePaths[0])
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Print',
            accelerator: 'CmdOrCtrl+P',
            click: () => {
              mainWindow?.webContents.send('menu-action', 'print')
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit()
            }
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: () => {
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'About Invoice Management System',
                message: 'Invoice Management System',
                detail: 'Version 1.0.0\nBuilt with Electron and Next.js\n\n© 2024 Spirit of Services',
                buttons: ['OK']
              })
            }
          },
          {
            label: 'Check for Updates',
            click: () => {
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Updates',
                message: 'You are using the latest version',
                buttons: ['OK']
              })
            }
          },
          { type: 'separator' },
          {
            label: 'Support',
            click: () => {
              shell.openExternal('mailto:support@spiritofservices.com')
            }
          }
        ]
      }
    ]

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      })

      // Window menu
      const windowMenuIndex = template.findIndex(item => item.label === 'Window')
      if (windowMenuIndex !== -1) {
        template[windowMenuIndex].submenu = [
          { role: 'close' },
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ]
      }
    }

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  // Handle app updates (if using auto-updater)
  if (!is.dev) {
    // Add auto-updater logic here if needed
    // Example: autoUpdater.checkForUpdatesAndNotify()
  }

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    
    if (!is.dev) {
      dialog.showErrorBox('Unexpected Error', 
        'An unexpected error occurred. The application will continue running, but you may want to restart it.')
    }
  })

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  })

  // Export for use in other modules
  export function getMainWindow(): BrowserWindow | null {
    return mainWindow
  }

  export function showErrorDialog(title: string, content: string): void {
    if (mainWindow) {
      dialog.showErrorBox(title, content)
    }
  }

  export function showInfoDialog(title: string, message: string, detail?: string): Promise<Electron.MessageBoxReturnValue> {
    return dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title,
      message,
      detail,
      buttons: ['OK']
    })
  }
}