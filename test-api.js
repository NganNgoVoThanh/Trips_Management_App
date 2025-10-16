// test-api.js
const BASE_URL = 'http://localhost:50001';

async function testAPI() {
  console.log('🔍 PHASE 2: API ENDPOINTS TEST\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      console.log('   ✅ Health check passed');
      results.passed++;
    } else {
      console.log('   ❌ Health check failed:', response.status);
      results.failed++;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    results.failed++;
  }
  
  // Test 2: GET Trips
  console.log('\n2️⃣ Testing GET /api/trips...');
  try {
    const response = await fetch(`${BASE_URL}/api/trips`);
    if (response.ok) {
      const trips = await response.json();
      console.log(`   ✅ GET trips passed (${trips.length} trips)`);
      results.passed++;
      results.tests.push({ endpoint: 'GET /api/trips', count: trips.length });
    } else {
      console.log('   ❌ GET trips failed:', response.status);
      results.failed++;
    }
  } catch (error) {
    console.log('   ❌ GET trips error:', error.message);
    results.failed++;
  }
  
  // Test 3: POST Trip (Create)
  console.log('\n3️⃣ Testing POST /api/trips...');
  try {
    const testTrip = {
      userId: 'test-user-001',
      userName: 'Test User',
      userEmail: 'test@intersnack.com.vn',
      departureLocation: 'HCM Office',
      destination: 'Phan Thiet Factory',
      departureDate: getDateString(5), // 5 days from now
      departureTime: '08:00',
      returnDate: getDateString(5),
      returnTime: '17:00',
      status: 'pending',
      vehicleType: 'car-4',
      estimatedCost: 1200000,
      notified: false
    };
    
    const response = await fetch(`${BASE_URL}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTrip)
    });
    
    if (response.ok) {
      const createdTrip = await response.json();
      console.log(`   ✅ POST trip passed (ID: ${createdTrip.id})`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/trips', tripId: createdTrip.id });
      
      // Store for cleanup
      global.testTripId = createdTrip.id;
    } else {
      const error = await response.json();
      console.log('   ❌ POST trip failed:', error);
      results.failed++;
    }
  } catch (error) {
    console.log('   ❌ POST trip error:', error.message);
    results.failed++;
  }
  
  // Test 4: GET Trip by ID
  if (global.testTripId) {
    console.log('\n4️⃣ Testing GET /api/trips/[id]...');
    try {
      const response = await fetch(`${BASE_URL}/api/trips/${global.testTripId}`);
      if (response.ok) {
        const trip = await response.json();
        console.log(`   ✅ GET trip by ID passed`);
        console.log(`      User: ${trip.userName}`);
        console.log(`      Route: ${trip.departureLocation} → ${trip.destination}`);
        results.passed++;
      } else {
        console.log('   ❌ GET trip by ID failed:', response.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ GET trip by ID error:', error.message);
      results.failed++;
    }
  }
  
  // Test 5: UPDATE Trip
  if (global.testTripId) {
    console.log('\n5️⃣ Testing PATCH /api/trips/[id]...');
    try {
      const response = await fetch(`${BASE_URL}/api/trips/${global.testTripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      
      if (response.ok) {
        console.log('   ✅ UPDATE trip passed (status: confirmed)');
        results.passed++;
      } else {
        console.log('   ❌ UPDATE trip failed:', response.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ UPDATE trip error:', error.message);
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Total: ${results.passed + results.failed}`);
  console.log('='.repeat(50));
  
  if (results.failed === 0) {
    console.log('\n✅ PHASE 2 PASSED!\n');
  } else {
    console.log('\n⚠️ PHASE 2 HAD FAILURES!\n');
  }
  
  return results;
}

function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// Run if server is running
testAPI().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  console.error('\n⚠️ Make sure dev server is running: npm run dev');
});