// Fix TypeScript - add 'as any[]' ONLY to query destructuring assignments
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'mysql-service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: Match ONLY query destructuring that needs type assertion
// const [xxx] = await connection.query(...);
// const [xxx] = await poolInstance.query(...);
// const [xxx] = await pool.query(...);
const patterns = [
  // connection.query
  /(const \[[^\]]+\] = await connection\.query\([^)]+\);)/g,
  // poolInstance.query
  /(const \[[^\]]+\] = await poolInstance\.query\([^)]+\);)/g,
  // pool.query
  /(const \[[^\]]+\] = await pool\.query\([^)]+\);)/g,
];

let totalMatches = 0;

patterns.forEach(pattern => {
  content = content.replace(pattern, (match) => {
    // Only add if doesn't already have type assertion
    if (!match.includes(' as any[]')) {
      totalMatches++;
      return match.replace(');', ') as any[];');
    }
    return match;
  });
});

fs.writeFileSync(filePath, content, 'utf8');
console.log(`✅ Added type assertions to ${totalMatches} query statements`);
