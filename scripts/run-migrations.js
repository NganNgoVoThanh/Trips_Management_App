// scripts/run-migrations.js
// Script to manually run database migrations

const { runDatabaseMigrations } = require('../lib/database-migration');

console.log('🚀 Starting database migrations...\n');

runDatabaseMigrations()
  .then(() => {
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
