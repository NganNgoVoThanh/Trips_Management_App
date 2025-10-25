#!/usr/bin/env node

// scripts/init-fabric.js
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes
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

async function testFabricConnection(token) {
  const workspace = '27bbe521-04c2-4251-a56a-3c86f348eaed';
  const lakehouse = '760dc750-d070-4e5a-b0aa-035b60b3420d';
  
  try {
    const response = await fetch(
      `https://api.fabric.microsoft.com/v1/workspaces/${workspace}/lakehouses/${lakehouse}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      log('\n✅ Fabric connection successful!', 'green');
      return true;
    } else if (response.status === 401) {
      log('\n❌ Token is invalid or expired', 'red');
      return false;
    } else {
      log(`\n❌ Connection failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`\n❌ Network error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  header('Microsoft Fabric Setup for Trips Management');
  
  log('\nThis wizard will help you set up Microsoft Fabric connection.');
  log('\nYou will need:');
  log('1. Access to https://app.fabric.microsoft.com');
  log('2. A valid access token');
  
  const proceed = await question('\nDo you want to continue? (y/n): ');
  
  if (proceed.toLowerCase() !== 'y') {
    log('\nSetup cancelled.', 'yellow');
    process.exit(0);
  }
  
  header('Step 1: Get Access Token');
  
  log('\nTo get your access token:');
  log('1. Open: https://app.fabric.microsoft.com', 'cyan');
  log('2. Press F12 to open Developer Tools');
  log('3. Go to Network tab');
  log('4. Refresh the page (F5)');
  log('5. Find any request to api.fabric.microsoft.com');
  log('6. Look for Authorization: Bearer eyJ... in headers');
  log('7. Copy the token (without "Bearer ")');
  
  await question('\nPress Enter when you have the token ready...');
  
  const token = await question('\nPaste your token here: ');
  
  if (!token || token.length < 100) {
    log('\n❌ Invalid token format', 'red');
    process.exit(1);
  }
  
  header('Step 2: Test Connection');
  
  log('\nTesting Fabric connection...');
  const isConnected = await testFabricConnection(token);
  
  if (!isConnected) {
    const retry = await question('\nRetry with a different token? (y/n): ');
    if (retry.toLowerCase() === 'y') {
      main(); // Restart
      return;
    }
    process.exit(1);
  }
  
  header('Step 3: Update Configuration');
  
  // Check if .env.local exists
  let envContent = '';
  if (fs.existsSync('.env.local')) {
    envContent = fs.readFileSync('.env.local', 'utf8');
    log('\nUpdating existing .env.local file...');
  } else {
    log('\nCreating new .env.local file...');
  }
  
  // Update or add token
  const tokenLines = [
    `FABRIC_ACCESS_TOKEN=${token}`,
    `NEXT_PUBLIC_FABRIC_TOKEN=${token}`
  ];
  
  // Update existing or append
  tokenLines.forEach(line => {
    const key = line.split('=')[0];
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent += '\n' + line;
    }
  });
  
  // Ensure other required variables
  if (!envContent.includes('NEXT_PUBLIC_FABRIC_WORKSPACE')) {
    envContent += '\nNEXT_PUBLIC_FABRIC_WORKSPACE=27bbe521-04c2-4251-a56a-3c86f348eaed';
  }
  if (!envContent.includes('NEXT_PUBLIC_FABRIC_LAKEHOUSE')) {
    envContent += '\nNEXT_PUBLIC_FABRIC_LAKEHOUSE=760dc750-d070-4e5a-b0aa-035b60b3420d';
  }
  if (!envContent.includes('NEXT_PUBLIC_COMPANY_DOMAIN')) {
    envContent += '\nNEXT_PUBLIC_COMPANY_DOMAIN=@intersnack.com.vn';
  }
  
  fs.writeFileSync('.env.local', envContent.trim());
  log('✅ Configuration updated', 'green');
  
  header('Step 4: Create Tables');
  
  log('\nNow you need to create tables in Fabric:');
  log('\n1. Go to your lakehouse:', 'cyan');
  log('   https://app.fabric.microsoft.com/groups/27bbe521-04c2-4251-a56a-3c86f348eaed/lakehouses/760dc750-d070-4e5a-b0aa-035b60b3420d');
  log('\n2. Click "SQL endpoint" tab');
  log('3. Click "New SQL query"');
  log('4. Run the following SQL:\n');
  
  const createTableSQL = `
CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50),
  userName VARCHAR(100),
  userEmail VARCHAR(100),
  departureLocation VARCHAR(50),
  destination VARCHAR(50),
  departureDate DATE,
  departureTime VARCHAR(10),
  returnDate DATE,
  returnTime VARCHAR(10),
  status VARCHAR(20),
  vehicleType VARCHAR(20),
  estimatedCost DECIMAL(10,2),
  notified BIT,
  createdAt DATETIME2,
  updatedAt DATETIME2
);

CREATE TABLE IF NOT EXISTS optimization_groups (
  id VARCHAR(50) PRIMARY KEY,
  trips NVARCHAR(MAX),
  proposedDepartureTime VARCHAR(10),
  vehicleType VARCHAR(20),
  estimatedSavings DECIMAL(10,2),
  status VARCHAR(20),
  createdBy VARCHAR(50),
  createdAt DATETIME2,
  approvedBy VARCHAR(50),
  approvedAt DATETIME2
);`;
  
  log(createTableSQL, 'cyan');
  
  header('Setup Complete!');
  
  log('\n✅ Fabric connection configured!', 'green');
  log('\nNext steps:');
  log('1. Create tables in Fabric (SQL above)');
  log('2. Restart your dev server: npm run dev');
  log('3. Test login at: http://localhost:50001');
  log('\nTest accounts:');
  log('  Admin: admin@intersnack.com.vn', 'cyan');
  log('  User: ngan.ngo@intersnack.com.vn', 'cyan');
  
  rl.close();
}

// Run
main().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});