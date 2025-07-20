#!/usr/bin/env node

// src/scripts/build-electron.js
const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs').promises
const path = require('path')

const execAsync = promisify(exec)

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

function logStep(message) {
  log(`🔄 ${message}`, colors.cyan)
}

class ElectronBuilder {
  constructor() {
    this.rootDir = process.cwd()
    this.electronDir = path.join(this.rootDir, 'src', 'electron')
    this.buildDir = path.join(this.rootDir, 'dist-electron')
    this.nextBuildDir = path.join(this.rootDir, 'dist')
  }

  async checkPrerequisites() {
    logStep('Checking prerequisites...')
    
    // Check if we're in the right directory
    const packageJsonPath = path.join(this.rootDir, 'package.json')
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
      if (!packageJson.name || !packageJson.name.includes('invoice')) {
        throw new Error('Not in invoice management project directory')
      }
      logSuccess('Project directory verified')
    } catch (error) {
      throw new Error(`Invalid project directory: ${error.message}`)
    }

    // Check if electron directory exists
    try {
      await fs.access(this.electronDir)
      logSuccess('Electron source directory found')
    } catch {
      throw new Error('Electron source directory not found')
    }

    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`)
    }
    logSuccess(`Node.js version: ${nodeVersion}`)

    // Check if required tools are installed
    try {
      await execAsync('npm --version')
      logSuccess('npm found')
    } catch {
      throw new Error('npm not found')
    }
  }

  async cleanBuildDirectories() {
    logStep('Cleaning build directories...')
    
    const dirsToClean = [this.buildDir, this.nextBuildDir]
    
    for (const dir of dirsToClean) {
      try {
        await fs.rm(dir, { recursive: true, force: true })
        logInfo(`Cleaned: ${path.relative(this.rootDir, dir)}`)
      } catch (error) {
        logWarning(`Could not clean ${dir}: ${error.message}`)
      }
    }
  }

  async buildNextJS() {
    logStep('Building Next.js application...')
    
    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.rootDir,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })
      
      if (stderr && !stderr.includes('warn')) {
        logWarning('Next.js build warnings:')
        console.log(stderr)
      }
      
      // Verify build output
      try {
        await fs.access(this.nextBuildDir)
        logSuccess('Next.js build completed')
      } catch {
        throw new Error('Next.js build output not found')
      }
      
    } catch (error) {
      throw new Error(`Next.js build failed: ${error.message}`)
    }
  }

  async buildElectron() {
    logStep('Building Electron application...')
    
    try {
      // Navigate to electron directory and install dependencies
      try {
        await execAsync('npm install', {
          cwd: this.electronDir,
          maxBuffer: 1024 * 1024 * 10
        })
        logInfo('Electron dependencies installed')
      } catch (error) {
        logWarning(`Dependency installation warning: ${error.message}`)
      }

      // Build electron app
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.electronDir,
        maxBuffer: 1024 * 1024 * 10
      })
      
      if (stderr && !stderr.includes('warn')) {
        logWarning('Electron build warnings:')
        console.log(stderr)
      }
      
      logSuccess('Electron build completed')
      
    } catch (error) {
      throw new Error(`Electron build failed: ${error.message}`)
    }
  }

  async packageElectron(platform = 'current') {
    logStep(`Packaging Electron for ${platform}...`)
    
    const platformCommands = {
      'current': 'npm run dist',
      'win': 'npm run build:win',
      'mac': 'npm run build:mac',
      'linux': 'npm run build:linux',
      'all': 'npm run build:all'
    }
    
    const command = platformCommands[platform] || platformCommands['current']
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.electronDir,
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer for packaging
        env: {
          ...process.env,
          DEBUG: 'electron-builder'
        }
      })
      
      if (stderr && !stderr.includes('warn')) {
        logWarning('Packaging warnings:')
        console.log(stderr)
      }
      
      logSuccess(`Electron packaging completed for ${platform}`)
      
    } catch (error) {
      throw new Error(`Electron packaging failed: ${error.message}`)
    }
  }

  async copyResources() {
    logStep('Copying additional resources...')
    
    try {
      // Copy database schema if exists
      const schemaPath = path.join(this.rootDir, 'schema.sql')
      const destSchemaPath = path.join(this.electronDir, 'resources', 'schema.sql')
      
      try {
        await fs.access(schemaPath)
        await fs.mkdir(path.dirname(destSchemaPath), { recursive: true })
        await fs.copyFile(schemaPath, destSchemaPath)
        logInfo('Copied database schema')
      } catch {
        logWarning('Database schema not found, skipping')
      }

      // Copy any additional resources
      const resourcesDir = path.join(this.rootDir, 'resources')
      const destResourcesDir = path.join(this.electronDir, 'build', 'resources')
      
      try {
        await fs.access(resourcesDir)
        await fs.cp(resourcesDir, destResourcesDir, { recursive: true })
        logInfo('Copied additional resources')
      } catch {
        logInfo('No additional resources to copy')
      }
      
    } catch (error) {
      logWarning(`Resource copying warning: ${error.message}`)
    }
  }

  async generateManifest() {
    logStep('Generating build manifest...')
    
    const manifest = {
      buildTime: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      electronVersion: await this.getElectronVersion(),
      features: {
        printing: true,
        dotMatrix: true,
        pdf: true,
        database: 'postgresql',
        auth: 'jwt'
      }
    }
    
    const manifestPath = path.join(this.buildDir, 'build-manifest.json')
    await fs.mkdir(path.dirname(manifestPath), { recursive: true })
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    
    logInfo('Build manifest generated')
  }

  async getElectronVersion() {
    try {
      const electronPackagePath = path.join(this.electronDir, 'package.json')
      const electronPackage = JSON.parse(await fs.readFile(electronPackagePath, 'utf8'))
      return electronPackage.devDependencies?.electron || 'unknown'
    } catch {
      return 'unknown'
    }
  }

  async verifyBuild() {
    logStep('Verifying build...')
    
    const checks = [
      {
        name: 'Next.js dist',
        path: this.nextBuildDir,
        type: 'directory'
      },
      {
        name: 'Electron dist',
        path: path.join(this.electronDir, 'dist'),
        type: 'directory'
      },
      {
        name: 'Package output',
        path: this.buildDir,
        type: 'directory'
      }
    ]
    
    let allValid = true
    
    for (const check of checks) {
      try {
        const stats = await fs.stat(check.path)
        if (check.type === 'directory' && stats.isDirectory()) {
          logSuccess(`✓ ${check.name}`)
        } else if (check.type === 'file' && stats.isFile()) {
          logSuccess(`✓ ${check.name}`)
        } else {
          throw new Error('Type mismatch')
        }
      } catch {
        logError(`✗ ${check.name}`)
        allValid = false
      }
    }
    
    if (!allValid) {
      throw new Error('Build verification failed')
    }
    
    logSuccess('Build verification passed')
  }

  async getBuildInfo() {
    logStep('Gathering build information...')
    
    const info = {
      buildTime: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      sizes: {}
    }
    
    // Get build sizes
    const pathsToCheck = [
      { name: 'nextjs', path: this.nextBuildDir },
      { name: 'electron', path: path.join(this.electronDir, 'dist') },
      { name: 'packages', path: this.buildDir }
    ]
    
    for (const item of pathsToCheck) {
      try {
        const size = await this.getDirectorySize(item.path)
        info.sizes[item.name] = this.formatBytes(size)
      } catch {
        info.sizes[item.name] = 'unknown'
      }
    }
    
    return info
  }

  async getDirectorySize(dirPath) {
    let totalSize = 0
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath)
        } else {
          const stats = await fs.stat(itemPath)
          totalSize += stats.size
        }
      }
    } catch {
      // Ignore errors
    }
    
    return totalSize
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async build(options = {}) {
    const {
      clean = true,
      platform = 'current',
      skipPackaging = false
    } = options
    
    const startTime = Date.now()
    
    try {
      await this.checkPrerequisites()
      
      if (clean) {
        await this.cleanBuildDirectories()
      }
      
      await this.buildNextJS()
      await this.copyResources()
      await this.buildElectron()
      
      if (!skipPackaging) {
        await this.packageElectron(platform)
      }
      
      await this.generateManifest()
      await this.verifyBuild()
      
      const buildTime = Math.round((Date.now() - startTime) / 1000)
      const buildInfo = await this.getBuildInfo()
      
      logSuccess(`🎉 Build completed in ${buildTime}s`)
      
      // Display build information
      logInfo('Build Information:')
      console.log(`  Platform: ${buildInfo.platform}`)
      console.log(`  Architecture: ${buildInfo.arch}`)
      console.log(`  Node.js: ${buildInfo.nodeVersion}`)
      console.log(`  Build sizes:`)
      Object.entries(buildInfo.sizes).forEach(([name, size]) => {
        console.log(`    ${name}: ${size}`)
      })
      
      // Show output location
      if (!skipPackaging) {
        logInfo(`Package output: ${path.relative(this.rootDir, this.buildDir)}`)
      }
      
    } catch (error) {
      logError(`Build failed: ${error.message}`)
      throw error
    }
  }
}

async function main() {
  log('🔨 Invoice Management System - Electron Build', colors.bright)
  log('=' * 60, colors.cyan)
  
  const builder = new ElectronBuilder()
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options = {
    clean: !args.includes('--no-clean'),
    platform: args.find(arg => ['--win', '--mac', '--linux', '--all'].includes(arg))?.slice(2) || 'current',
    skipPackaging: args.includes('--no-package')
  }
  
  try {
    await builder.build(options)
    
  } catch (error) {
    logError(`Build failed: ${error.message}`)
    process.exit(1)
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Invoice Management System - Electron Build

Usage: node build-electron.js [options]

Options:
  --help, -h         Show this help message
  --no-clean         Skip cleaning build directories
  --no-package       Skip packaging step (build only)
  --win              Package for Windows
  --mac              Package for macOS
  --linux            Package for Linux
  --all              Package for all platforms

Examples:
  node build-electron.js                    # Build and package for current platform
  node build-electron.js --win              # Build and package for Windows
  node build-electron.js --no-package       # Build without packaging
  node build-electron.js --no-clean --mac   # Build for macOS without cleaning
`)
  process.exit(0)
}

// Run main function
main()

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Build interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('Build terminated')
  process.exit(1)
})