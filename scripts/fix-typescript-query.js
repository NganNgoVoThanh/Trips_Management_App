// Fix TypeScript query type assertions in mysql-service.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'mysql-service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to find query calls that need type assertion
// Match: const [xxx] = await connection.query(...);
// That don't already have 'as any[]'
const pattern = /(const \[[^\]]+\] = await connection\.query\([^)]+\)\s*);(?!\s*as any\[\])/g;

let matches = 0;
content = content.replace(pattern, (match) => {
  matches++;
  // Remove the trailing semicolon and add type assertion
  return match.slice(0, -1) + ' as any[];';
});

if (matches > 0) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed ${matches} query statements in mysql-service.ts`);
} else {
  console.log('✅ No changes needed - all query statements already have type assertions');
}
