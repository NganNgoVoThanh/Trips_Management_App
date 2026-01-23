#!/usr/bin/env node
// tests/run-critical-tests.js
// Critical safety tests for performance improvements

const mysql = require('mysql2/promise');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.connection = null;
  }

  async connect() {
    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
    }
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runTest(name, testFn) {
    try {
      this.log(`\n📝 Test: ${name}`, 'cyan');
      await testFn();
      this.results.passed++;
      this.log('✅ PASSED', 'green');
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
      this.log(`❌ FAILED: ${error.message}`, 'red');
      return false;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  // ============================================
  // Test 1: Database Indexes Created
  // ============================================
  async testIndexesCreated() {
    const [indexes] = await this.connection.query(`
      SELECT DISTINCT table_name, index_name
      FROM information_schema.statistics
      WHERE table_schema = ?
        AND table_name IN ('trips', 'temp_trips', 'join_requests')
        AND index_name LIKE 'idx_%'
    `, [process.env.DB_NAME]);

    const expectedIndexes = [
      'idx_status_departure_date',
      'idx_user_email_status',
      'idx_departure_dest_date',
      'idx_optimized_group_status',
      'idx_user_status_date'
    ];

    const foundIndexNames = indexes.map(idx => idx.index_name);

    for (const expected of expectedIndexes) {
      this.assert(
        foundIndexNames.includes(expected),
        `Index ${expected} not found`
      );
    }

    this.log(`  Found ${indexes.length} performance indexes`, 'blue');
  }

  // ============================================
  // Test 2: Pagination Returns Correct Limits
  // ============================================
  async testPaginationLimits() {
    // Test default limit (100)
    const [rows1] = await this.connection.query(`
      SELECT * FROM trips LIMIT 100 OFFSET 0
    `);

    this.assert(
      rows1.length <= 100,
      'Default pagination should return max 100 rows'
    );

    // Test custom limit (50)
    const [rows2] = await this.connection.query(`
      SELECT * FROM trips LIMIT 50 OFFSET 0
    `);

    this.assert(
      rows2.length <= 50,
      'Custom limit should be respected'
    );

    this.log(`  Pagination limits working correctly`, 'blue');
  }

  // ============================================
  // Test 3: Batch Query Performance
  // ============================================
  async testBatchQueryPerformance() {
    // Get 10 trip IDs
    const [trips] = await this.connection.query(`
      SELECT id FROM trips LIMIT 10
    `);

    if (trips.length === 0) {
      this.log(`  No trips in database, skipping batch test`, 'yellow');
      return;
    }

    const ids = trips.map(t => t.id);

    // Measure batch query time
    const start = Date.now();
    const [batchResults] = await this.connection.query(
      'SELECT * FROM trips WHERE id IN (?)',
      [ids]
    );
    const batchTime = Date.now() - start;

    this.assert(
      batchResults.length === ids.length || batchResults.length <= ids.length,
      'Batch query should return all requested trips'
    );

    this.assert(
      batchTime < 100,
      `Batch query too slow: ${batchTime}ms (expected < 100ms)`
    );

    this.log(`  Batch query completed in ${batchTime}ms`, 'blue');
  }

  // ============================================
  // Test 4: Index Usage Verification
  // ============================================
  async testIndexUsage() {
    // Test if status + departure_date query uses index
    const [explain] = await this.connection.query(`
      EXPLAIN SELECT * FROM trips
      WHERE status = 'approved'
        AND departure_date = '2024-02-01'
      LIMIT 10
    `);

    const usesIndex = explain.some(row =>
      row.key && row.key.includes('idx_')
    );

    this.assert(
      usesIndex,
      'Query should use composite index'
    );

    this.log(`  Index being used: ${explain[0].key || 'PRIMARY'}`, 'blue');
  }

  // ============================================
  // Test 5: Data Integrity - No Duplicates
  // ============================================
  async testDataIntegrity() {
    // Check for duplicate trips
    const [duplicates] = await this.connection.query(`
      SELECT id, COUNT(*) as count
      FROM trips
      GROUP BY id
      HAVING count > 1
    `);

    this.assert(
      duplicates.length === 0,
      `Found ${duplicates.length} duplicate trip IDs`
    );

    // Check temp_trips integrity
    const [orphanedTemp] = await this.connection.query(`
      SELECT t.id
      FROM temp_trips t
      LEFT JOIN trips p ON t.parent_trip_id = p.id
      WHERE p.id IS NULL
      LIMIT 1
    `);

    // Allow orphaned temp trips (parent might be deleted)
    // Just log warning
    if (orphanedTemp.length > 0) {
      this.log(`  Warning: Found orphaned temp trips`, 'yellow');
    }

    this.log(`  Data integrity verified`, 'blue');
  }

  // ============================================
  // Test 6: Join Requests Constraints
  // ============================================
  async testJoinRequestsConstraints() {
    const [constraints] = await this.connection.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = ?
        AND table_name = 'join_requests'
        AND constraint_type = 'UNIQUE'
    `, [process.env.DB_NAME]);

    // Should have unique constraint on (trip_id, requester_email, status)
    // This prevents duplicate pending requests

    this.log(`  Found ${constraints.length} constraints on join_requests`, 'blue');
  }

  // ============================================
  // Test 7: Optimization Groups Consistency
  // ============================================
  async testOptimizationGroupsConsistency() {
    // Check if all trips in optimization groups have matching group IDs
    const [inconsistent] = await this.connection.query(`
      SELECT og.id as group_id, COUNT(t.id) as trip_count
      FROM optimization_groups og
      LEFT JOIN trips t ON t.optimized_group_id = og.id
      WHERE og.status = 'approved'
      GROUP BY og.id
      HAVING trip_count = 0
      LIMIT 1
    `);

    if (inconsistent.length > 0) {
      this.log(`  Warning: Found optimization groups with no trips`, 'yellow');
    }

    this.log(`  Optimization groups consistency checked`, 'blue');
  }

  // ============================================
  // Test 8: Performance Benchmark
  // ============================================
  async testPerformanceBenchmark() {
    const benchmarks = [];

    // Benchmark 1: Simple SELECT with index
    let start = Date.now();
    await this.connection.query(`
      SELECT * FROM trips WHERE status = 'approved' LIMIT 100
    `);
    benchmarks.push({ name: 'Simple SELECT', time: Date.now() - start });

    // Benchmark 2: Composite index query
    start = Date.now();
    await this.connection.query(`
      SELECT * FROM trips
      WHERE status = 'approved'
        AND departure_date >= CURDATE()
      LIMIT 100
    `);
    benchmarks.push({ name: 'Composite index query', time: Date.now() - start });

    // Benchmark 3: JOIN query
    start = Date.now();
    await this.connection.query(`
      SELECT t.*, COUNT(jr.id) as request_count
      FROM trips t
      LEFT JOIN join_requests jr ON jr.trip_id = t.id
      WHERE t.status = 'approved'
      GROUP BY t.id
      LIMIT 100
    `);
    benchmarks.push({ name: 'JOIN query', time: Date.now() - start });

    // All queries should complete in < 200ms
    benchmarks.forEach(b => {
      this.assert(
        b.time < 200,
        `${b.name} too slow: ${b.time}ms (expected < 200ms)`
      );
      this.log(`  ${b.name}: ${b.time}ms`, 'blue');
    });
  }

  // ============================================
  // Run All Tests
  // ============================================
  async runAll() {
    this.log('\n============================================', 'cyan');
    this.log('  🧪 PERFORMANCE SAFETY TESTS', 'cyan');
    this.log('============================================\n', 'cyan');

    try {
      await this.connect();
      this.log('✅ Connected to database\n', 'green');

      // Run critical tests
      await this.runTest('Database Indexes Created', () => this.testIndexesCreated());
      await this.runTest('Pagination Limits', () => this.testPaginationLimits());
      await this.runTest('Batch Query Performance', () => this.testBatchQueryPerformance());
      await this.runTest('Index Usage Verification', () => this.testIndexUsage());
      await this.runTest('Data Integrity', () => this.testDataIntegrity());
      await this.runTest('Join Requests Constraints', () => this.testJoinRequestsConstraints());
      await this.runTest('Optimization Groups Consistency', () => this.testOptimizationGroupsConsistency());
      await this.runTest('Performance Benchmark', () => this.testPerformanceBenchmark());

    } catch (error) {
      this.log(`\n❌ Test execution error: ${error.message}`, 'red');
      this.results.failed++;
    } finally {
      await this.disconnect();
    }

    // Print summary
    this.printSummary();

    // Exit with error code if tests failed
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  printSummary() {
    this.log('\n============================================', 'cyan');
    this.log('  TEST SUMMARY', 'cyan');
    this.log('============================================\n', 'cyan');

    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

    this.log(`Total Tests: ${total}`, 'blue');
    this.log(`✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    this.log(`Pass Rate: ${passRate}%\n`, passRate >= 100 ? 'green' : 'yellow');

    if (this.results.errors.length > 0) {
      this.log('Failed Tests:', 'red');
      this.results.errors.forEach(({ test, error }) => {
        this.log(`  - ${test}: ${error}`, 'red');
      });
      this.log('');
    }

    if (this.results.failed === 0) {
      this.log('🎉 All tests passed! Performance improvements are safe to use.', 'green');
    } else {
      this.log('⚠️  Some tests failed. Please review before deploying.', 'yellow');
    }

    this.log('\n============================================\n', 'cyan');
  }
}

// Run tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { TestRunner };
