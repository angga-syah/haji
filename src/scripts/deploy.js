#!/usr/bin/env node

// src/scripts/deploy.js
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
  log(`🚀 ${message}`, colors.cyan)
}

// Deployment configurations
const deploymentConfigs = {
  vercel: {
    name: 'Vercel',
    command: 'npx vercel --prod',
    envVars: ['DATABASE_URL', 'JWT_SECRET'],
    buildCommand: 'npm run build',
    description: 'Deploy to Vercel (recommended for Next.js)'
  },
  netlify: {
    name: 'Netlify',
    command: 'npx netlify deploy --prod',
    envVars: ['DATABASE_URL', 'JWT_SECRET'],
    buildCommand: 'npm run build',
    description: 'Deploy to Netlify'
  },
  railway: {
    name: 'Railway',
    command: 'railway up',
    envVars: ['DATABASE_URL', 'JWT_SECRET'],
    buildCommand: 'npm run build',
    description: 'Deploy to Railway with PostgreSQL'
  },
  docker: {
    name: 'Docker',
    command: 'docker build -t invoice-management .',
    envVars: ['DATABASE_URL', 'JWT_SECRET'],
    buildCommand: 'npm run build',
    description: 'Build Docker image'
  }
}

class DeploymentManager {
  constructor() {
    this.rootDir = process.cwd()
    this.buildDir = path.join(this.rootDir, '.next')
  }

  async checkPrerequisites() {
    logStep('Checking deployment prerequisites...')
    
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

    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`)
    }
    logSuccess(`Node.js version: ${nodeVersion}`)

    // Check if git is installed and repo is clean
    try {
      await execAsync('git --version')
      logSuccess('Git found')
      
      const { stdout: status } = await execAsync('git status --porcelain')
      if (status.trim()) {
        logWarning('Git repository has uncommitted changes')
        logInfo('Consider committing changes before deployment')
      } else {
        logSuccess('Git repository is clean')
      }
    } catch {
      logWarning('Git not found or not a git repository')
    }
  }

  async validateEnvironment(requiredVars = []) {
    logStep('Validating environment variables...')
    
    const missingVars = []
    const presentVars = []
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        presentVars.push(varName)
      } else {
        missingVars.push(varName)
      }
    }
    
    if (presentVars.length > 0) {
      logSuccess(`Found environment variables: ${presentVars.join(', ')}`)
    }
    
    if (missingVars.length > 0) {
      logWarning(`Missing environment variables: ${missingVars.join(', ')}`)
      logInfo('These may need to be set in your deployment platform')
    }
    
    return { missing: missingVars, present: presentVars }
  }

  async runTests() {
    logStep('Running tests...')
    
    try {
      // Check if test script exists
      const packageJson = JSON.parse(await fs.readFile(path.join(this.rootDir, 'package.json'), 'utf8'))
      
      if (packageJson.scripts && packageJson.scripts.test) {
        const { stdout, stderr } = await execAsync('npm test', {
          cwd: this.rootDir,
          timeout: 300000 // 5 minutes timeout
        })
        
        if (stderr && !stderr.includes('PASS')) {
          logWarning('Test warnings:')
          console.log(stderr)
        }
        
        logSuccess('All tests passed')
      } else {
        logInfo('No test script found, skipping tests')
      }
    } catch (error) {
      throw new Error(`Tests failed: ${error.message}`)
    }
  }

  async buildApplication() {
    logStep('Building application...')
    
    try {
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.rootDir,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 600000 // 10 minutes timeout
      })
      
      if (stderr && !stderr.includes('warn')) {
        logWarning('Build warnings:')
        console.log(stderr)
      }
      
      // Verify build output
      try {
        await fs.access(this.buildDir)
        logSuccess('Application build completed')
      } catch {
        throw new Error('Build output not found')
      }
      
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`)
    }
  }

  async optimizeBuild() {
    logStep('Optimizing build...')
    
    try {
      // Check build size
      const buildSize = await this.getDirectorySize(this.buildDir)
      logInfo(`Build size: ${this.formatBytes(buildSize)}`)
      
      // Check for large files
      const largeFiles = await this.findLargeFiles(this.buildDir, 5 * 1024 * 1024) // 5MB
      if (largeFiles.length > 0) {
        logWarning('Large files detected:')
        largeFiles.forEach(file => {
          console.log(`  ${file.path} (${this.formatBytes(file.size)})`)
        })
      }
      
      // Bundle analyzer (if available)
      try {
        await execAsync('npx @next/bundle-analyzer', {
          cwd: this.rootDir,
          timeout: 30000
        })
        logInfo('Bundle analysis completed')
      } catch {
        logInfo('Bundle analyzer not available, skipping')
      }
      
    } catch (error) {
      logWarning(`Build optimization warning: ${error.message}`)
    }
  }

  async createDockerfile() {
    logStep('Creating Dockerfile...')
    
    const dockerfileContent = `# Invoice Management System Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`
    
    const dockerfilePath = path.join(this.rootDir, 'Dockerfile')
    await fs.writeFile(dockerfilePath, dockerfileContent)
    
    logSuccess('Dockerfile created')
  }

  async createDockerIgnore() {
    const dockerignoreContent = `# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
.next
dist
dist-electron
out

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage

# IDE files
.vscode
.idea

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Git
.git
.gitignore

# Documentation
README.md
docs

# Tests
**/*.test.js
**/*.spec.js
__tests__

# Backups
backups
*.backup
`
    
    const dockerignorePath = path.join(this.rootDir, '.dockerignore')
    await fs.writeFile(dockerignorePath, dockerignoreContent)
    
    logInfo('Docker ignore file created')
  }

  async deployToVercel() {
    logStep('Deploying to Vercel...')
    
    try {
      // Check if Vercel CLI is installed
      try {
        await execAsync('npx vercel --version')
      } catch {
        logInfo('Installing Vercel CLI...')
        await execAsync('npm install -g vercel')
      }
      
      // Deploy
      const { stdout, stderr } = await execAsync('npx vercel --prod --yes', {
        cwd: this.rootDir,
        timeout: 600000 // 10 minutes
      })
      
      if (stderr) {
        logWarning('Deployment warnings:')
        console.log(stderr)
      }
      
      // Extract deployment URL
      const lines = stdout.split('\n')
      const deploymentUrl = lines.find(line => line.includes('https://'))
      
      if (deploymentUrl) {
        logSuccess(`Deployed to: ${deploymentUrl.trim()}`)
      } else {
        logSuccess('Deployment completed')
      }
      
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error.message}`)
    }
  }

  async deployToRailway() {
    logStep('Deploying to Railway...')
    
    try {
      // Check if Railway CLI is installed
      try {
        await execAsync('railway --version')
      } catch {
        throw new Error('Railway CLI not found. Install it from https://docs.railway.app/develop/cli')
      }
      
      // Deploy
      const { stdout, stderr } = await execAsync('railway up', {
        cwd: this.rootDir,
        timeout: 600000 // 10 minutes
      })
      
      if (stderr) {
        logWarning('Deployment warnings:')
        console.log(stderr)
      }
      
      logSuccess('Railway deployment completed')
      
    } catch (error) {
      throw new Error(`Railway deployment failed: ${error.message}`)
    }
  }

  async buildDocker() {
    logStep('Building Docker image...')
    
    try {
      // Check if Docker is installed
      try {
        await execAsync('docker --version')
      } catch {
        throw new Error('Docker not found. Please install Docker first.')
      }
      
      // Create Dockerfile if it doesn't exist
      const dockerfilePath = path.join(this.rootDir, 'Dockerfile')
      try {
        await fs.access(dockerfilePath)
      } catch {
        await this.createDockerfile()
        await this.createDockerIgnore()
      }
      
      // Build image
      const imageName = 'invoice-management:latest'
      const { stdout, stderr } = await execAsync(`docker build -t ${imageName} .`, {
        cwd: this.rootDir,
        timeout: 1200000 // 20 minutes
      })
      
      if (stderr && !stderr.includes('Successfully')) {
        logWarning('Docker build warnings:')
        console.log(stderr)
      }
      
      logSuccess(`Docker image built: ${imageName}`)
      
      // Show image size
      try {
        const { stdout: sizeOutput } = await execAsync(`docker images ${imageName} --format "table {{.Size}}"`)
        const lines = sizeOutput.trim().split('\n')
        if (lines.length > 1) {
          logInfo(`Image size: ${lines[1]}`)
        }
      } catch {
        // Ignore size check errors
      }
      
    } catch (error) {
      throw new Error(`Docker build failed: ${error.message}`)
    }
  }

  async generateDeploymentReport() {
    logStep('Generating deployment report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      buildSize: 'unknown',
      gitCommit: 'unknown',
      deploymentType: 'unknown'
    }
    
    // Get build size
    try {
      const buildSize = await this.getDirectorySize(this.buildDir)
      report.buildSize = this.formatBytes(buildSize)
    } catch {
      // Ignore
    }
    
    // Get git commit
    try {
      const { stdout } = await execAsync('git rev-parse HEAD')
      report.gitCommit = stdout.trim()
    } catch {
      // Ignore
    }
    
    const reportPath = path.join(this.rootDir, 'deployment-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    logInfo('Deployment report generated')
    return report
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

  async findLargeFiles(dirPath, threshold) {
    const largeFiles = []
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          const subFiles = await this.findLargeFiles(itemPath, threshold)
          largeFiles.push(...subFiles)
        } else {
          const stats = await fs.stat(itemPath)
          if (stats.size > threshold) {
            largeFiles.push({
              path: path.relative(this.rootDir, itemPath),
              size: stats.size
            })
          }
        }
      }
    } catch {
      // Ignore errors
    }
    
    return largeFiles
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  async deploy(target, options = {}) {
    const {
      skipTests = false,
      skipBuild = false,
      skipOptimization = false
    } = options
    
    const startTime = Date.now()
    
    try {
      await this.checkPrerequisites()
      
      const config = deploymentConfigs[target]
      if (!config) {
        throw new Error(`Unknown deployment target: ${target}`)
      }
      
      logInfo(`Deploying to ${config.name}`)
      logInfo(`Description: ${config.description}`)
      
      await this.validateEnvironment(config.envVars)
      
      if (!skipTests) {
        await this.runTests()
      }
      
      if (!skipBuild) {
        await this.buildApplication()
      }
      
      if (!skipOptimization) {
        await this.optimizeBuild()
      }
      
      // Deploy based on target
      switch (target) {
        case 'vercel':
          await this.deployToVercel()
          break
        case 'railway':
          await this.deployToRailway()
          break
        case 'docker':
          await this.buildDocker()
          break
        default:
          throw new Error(`Deployment method for ${target} not implemented`)
      }
      
      await this.generateDeploymentReport()
      
      const deployTime = Math.round((Date.now() - startTime) / 1000)
      logSuccess(`🎉 Deployment completed in ${deployTime}s`)
      
    } catch (error) {
      logError(`Deployment failed: ${error.message}`)
      throw error
    }
  }
}

async function main() {
  log('🚀 Invoice Management System - Deployment', colors.bright)
  log('=' * 60, colors.cyan)
  
  const deployer = new DeploymentManager()
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  const target = args[0] || 'vercel'
  const options = {
    skipTests: args.includes('--skip-tests'),
    skipBuild: args.includes('--skip-build'),
    skipOptimization: args.includes('--skip-optimization')
  }
  
  try {
    await deployer.deploy(target, options)
    
  } catch (error) {
    logError(`Deployment failed: ${error.message}`)
    process.exit(1)
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Invoice Management System - Deployment

Usage: node deploy.js [target] [options]

Targets:
  vercel                 Deploy to Vercel (default)
  railway                Deploy to Railway
  netlify                Deploy to Netlify  
  docker                 Build Docker image

Options:
  --help, -h             Show this help message
  --skip-tests           Skip running tests
  --skip-build           Skip build step
  --skip-optimization    Skip build optimization

Environment Variables:
  DATABASE_URL           PostgreSQL connection string
  JWT_SECRET             JWT signing secret
  
Examples:
  node deploy.js                           # Deploy to Vercel
  node deploy.js railway                   # Deploy to Railway
  node deploy.js docker                    # Build Docker image
  node deploy.js vercel --skip-tests       # Deploy to Vercel without tests
`)
  process.exit(0)
}

if (args.includes('--list')) {
  console.log('\nAvailable deployment targets:')
  Object.entries(deploymentConfigs).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.description}`)
  })
  process.exit(0)
}

// Run main function
main()

// Handle process termination
process.on('SIGINT', () => {
  logWarning('Deployment interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('Deployment terminated')
  process.exit(1)
})