#!/usr/bin/env node

// scripts/setup.js
const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log();
  log('='.repeat(50), 'cyan');
  log(title, 'bright');
  log('='.repeat(50), 'cyan');
}

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${prompt}${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
}

async function testFabricConnection(config) {
  header('Microsoft Fabric Connection Test');
  
  log('\nTesting Fabric connection with config:');
  log(`API URL: ${config.fabricUrl}`);
  log(`Workspace: ${config.workspace}`);
  log(`Lakehouse: ${config.lakehouse}`);
  log(`Token: ${config.token ? '***' + config.token.slice(-4) : 'NOT SET'}`);
  
  try {
    const response = await fetch(
      `${config.fabricUrl}/workspaces/${config.workspace}/lakehouses/${config.lakehouse}`,
      {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      log('\n✅ Fabric connection successful!', 'green');
      return true;
    } else if (response.status === 401) {
      log('\n❌ Authentication failed (401)', 'red');
      log('Your access token may be expired or invalid.', 'yellow');
      log('Please generate a new token.', 'yellow');
      return false;
    } else {
      log(`\n❌ Connection failed with status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`\n❌ Connection error: ${error.message}`, 'red');
    return false;
  }
}

async function setup() {
  header('Trips Management System - Setup Wizard');
  
  log('\nThis wizard will help you set up the Trips Management System.');
  log('Please have the following information ready:');
  log('1. Microsoft Fabric workspace ID and lakehouse ID');
  log('2. Fabric access token');
  log('3. OpenAI or Claude API key');
  
  const continueSetup = await question('\nDo you want to continue? (y/n): ');
  
  if (continueSetup.toLowerCase() !== 'y') {
    log('\nSetup cancelled.', 'yellow');
    process.exit(0);
  }
  
  // Step 1: Environment Configuration
  header('Step 1: Environment Configuration');
  
  const env = {
    // Fabric configuration
    fabricUrl: await question('\nFabric API URL (press Enter for default): ') || 'https://api.fabric.microsoft.com/v1',
    workspace: await question('Fabric Workspace ID [27bbe521-04c2-4251-a56a-3c86f348eaed]: ') || '27bbe521-04c2-4251-a56a-3c86f348eaed',
    lakehouse: await question('Fabric Lakehouse ID [760dc750-d070-4e5a-b0aa-035b60b3420d]: ') || '760dc750-d070-4e5a-b0aa-035b60b3420d',
    token: await question('Fabric Access Token (required): '),
    
    // AI configuration
    aiProvider: await question('\nChoose AI provider (openai/claude) [openai]: ') || 'openai',
    aiKey: await question('AI API Key: '),
    
    // App configuration
    appUrl: await question('\nApplication URL [http://localhost:50001]: ') || 'http://localhost:50001',
  };
  
  // Test Fabric connection
  const fabricConnected = await testFabricConnection(env);
  
  if (!fabricConnected) {
    const continueWithoutFabric = await question('\nContinue with local storage only? (y/n): ');
    if (continueWithoutFabric.toLowerCase() !== 'y') {
      log('\nSetup cancelled.', 'yellow');
      process.exit(1);
    }
  }
  
  // Step 2: Create .env.local file
  header('Step 2: Creating Environment File');
  
  const envContent = `# Microsoft Fabric Configuration
NEXT_PUBLIC_FABRIC_API_URL=${env.fabricUrl}
NEXT_PUBLIC_FABRIC_WORKSPACE=${env.workspace}
NEXT_PUBLIC_FABRIC_LAKEHOUSE=${env.lakehouse}
FABRIC_ACCESS_TOKEN=${env.token}
NEXT_PUBLIC_FABRIC_TOKEN=${env.token}

# AI Configuration
${env.aiProvider === 'openai' ? `NEXT_PUBLIC_OPENAI_API_KEY=${env.aiKey}` : `NEXT_PUBLIC_CLAUDE_API_KEY=${env.aiKey}`}

# Application Configuration
NEXT_PUBLIC_APP_URL=${env.appUrl}
NEXT_PUBLIC_COMPANY_DOMAIN=@intersnack.com.vn

# Email Service (Optional - configure later)
EMAIL_API_KEY=
EMAIL_API_URL=
`;
  
  fs.writeFileSync('.env.local', envContent);
  log('\n✅ Created .env.local file', 'green');
  
  // Step 3: Install dependencies
  header('Step 3: Installing Dependencies');
  
  log('\nInstalling npm packages...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('\n✅ Dependencies installed', 'green');
  } catch (error) {
    log('\n❌ Failed to install dependencies', 'red');
    log('Please run "npm install" manually', 'yellow');
  }
  
  // Step 4: Initialize database
  header('Step 4: Database Initialization');
  
  const initDb = await question('\nInitialize database with demo data? (y/n): ');
  
  if (initDb.toLowerCase() === 'y') {
    log('\nInitializing database and creating demo data...');
    
    // Create a temporary script to run the initialization
    const initScript = `
const { dataSeeder } = require('./lib/data-seeder');

async function init() {
  await dataSeeder.initializeSystem();
}

init().catch(console.error);
`;
    
    fs.writeFileSync('temp-init.js', initScript);
    
    try {
      execSync('node temp-init.js', { stdio: 'inherit' });
      log('\n✅ Database initialized with demo data', 'green');
    } catch (error) {
      log('\n⚠️ Database initialization failed', 'yellow');
      log('The application will create tables on first run', 'yellow');
    } finally {
      // Clean up temp file
      if (fs.existsSync('temp-init.js')) {
        fs.unlinkSync('temp-init.js');
      }
    }
  }
  
  // Step 5: Summary
  header('Setup Complete!');
  
  log('\n✅ Trips Management System is ready!', 'green');
  log('\nAdmin accounts configured:', 'cyan');
  log('  - admin@intersnack.com.vn');
  log('  - manager@intersnack.com.vn');
  log('  - operations@intersnack.com.vn');
  
  log('\nNext steps:', 'yellow');
  log('1. Run the development server: npm run dev');
  log('2. Open http://localhost:50001 in your browser');
  log('3. Login with an @intersnack.com.vn email');
  
  if (!fabricConnected) {
    log('\n⚠️ Note: Running in local storage mode', 'yellow');
    log('Configure Fabric access token to enable cloud storage', 'yellow');
  }
  
  rl.close();
}

// Run setup
setup().catch((error) => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});