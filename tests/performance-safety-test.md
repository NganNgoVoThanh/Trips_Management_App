# Performance Safety Test Plan

## Mục tiêu: Đảm bảo 100% các thay đổi không phá vỡ logic

---

## Test Suite 1: Database Layer Tests

### 1.1 Pagination Backward Compatibility
**Test:** getTrips() without pagination parameters
```javascript
// Old code (no parameters)
const trips1 = await fabricService.getTrips()

// Should return: First 100 trips (default)
// Expected: Array of trips, length <= 100
```

**Test:** getTrips() with filters but no pagination
```javascript
const trips2 = await fabricService.getTrips({
  status: 'approved',
  userId: 'user123'
})

// Should return: Filtered trips, max 100
// Expected: Same filtering logic as before
```

**Test:** getTrips() with explicit pagination
```javascript
const trips3 = await fabricService.getTrips({
  limit: 50,
  offset: 0
})

// Should return: First 50 trips
// Expected: Exactly 50 trips or fewer
```

---

### 1.2 Batch Methods vs Individual Methods
**Test:** getTripsByIds() returns same data as multiple getTripById()
```javascript
const ids = ['trip1', 'trip2', 'trip3']

// Old way
const tripsOld = await Promise.all(
  ids.map(id => fabricService.getTripById(id))
)

// New way
const tripsNew = await fabricService.getTripsByIds(ids)

// Expected: tripsOld and tripsNew should be identical
// Compare: trip IDs, userIds, status, all fields
```

**Test:** getTempTripsByGroupIds() returns same data as multiple getTempTripsByGroupId()
```javascript
const groupIds = ['group1', 'group2', 'group3']

// Old way
const tempTripsOld = {}
for (const gid of groupIds) {
  tempTripsOld[gid] = await fabricService.getTempTripsByGroupId(gid)
}

// New way
const tempTripsNew = await fabricService.getTempTripsByGroupIds(groupIds)

// Expected: tempTripsOld and tempTripsNew contain same trips per group
```

---

### 1.3 Caching Transparency
**Test:** Cached data returns identical results
```javascript
// First call (cache miss)
const location1 = await getTripsForLocationAdmin('HCM Office')

// Clear trips, re-insert same trips
// Second call (cache hit)
const location2 = await getTripsForLocationAdmin('HCM Office')

// Expected: location1 === location2 (same trips)
```

---

## Test Suite 2: API Routes Tests

### 2.1 Optimization Creation (Promise.all)
**Test:** Sequential vs Parallel temp trip creation
```javascript
// Setup: Create test proposal with 5 trips
const proposal = {
  trips: [trip1, trip2, trip3, trip4, trip5],
  proposedDepartureTime: '08:00',
  vehicleType: 'car-7'
}

// Call optimize API
const response = await fetch('/api/optimize', {
  method: 'POST',
  body: JSON.stringify({ proposals: [proposal] })
})

// Expected:
// - 5 temp trips created
// - All have same optimizedGroupId
// - All have departureTime = '08:00'
// - All have vehicleType = 'car-7'
// - All have parentTripId set correctly
```

**Verify:**
```sql
SELECT COUNT(*) FROM temp_trips WHERE optimized_group_id = ?
-- Should return: 5

SELECT DISTINCT departure_time FROM temp_trips WHERE optimized_group_id = ?
-- Should return: Only '08:00'
```

---

### 2.2 Optimization Approval (Batch Fetch)
**Test:** Batch vs Individual trip fetching
```javascript
// Setup: Create optimization group with 3 trips
const groupId = 'test-group-123'

// Old way simulation
const tripsOld = await Promise.all(
  ['trip1', 'trip2', 'trip3'].map(id => getTripById(id))
)

// New way (API call)
const response = await fetch(`/api/optimize/${groupId}/approve`, {
  method: 'POST'
})

const result = await response.json()

// Expected:
// - All 3 trips returned
// - Trips have status 'optimized'
// - All trips have same optimizedGroupId
```

---

## Test Suite 3: React Component Tests

### 3.1 Available Trips Filtering
**Test:** useMemo filtering returns same results as old filterTrips()
```javascript
// Test data
const testTrips = [
  { id: '1', departureLocation: 'HCM Office', destination: 'Phan Thiet Factory', departureDate: '2024-02-01' },
  { id: '2', departureLocation: 'Long An Factory', destination: 'HCM Office', departureDate: '2024-02-02' },
  { id: '3', departureLocation: 'HCM Office', destination: 'Tay Ninh Factory', departureDate: '2024-02-01' },
]

// Test Case 1: Search filter
const searchTerm = 'phan thiet'
const filtered1 = trips.filter(trip =>
  getLocationName(trip.departureLocation).toLowerCase().includes(searchTerm) ||
  getLocationName(trip.destination).toLowerCase().includes(searchTerm)
)
// Expected: Only trip with id='1'

// Test Case 2: Location filter
const locationFilter = 'HCM Office'
const filtered2 = trips.filter(trip =>
  trip.departureLocation === locationFilter || trip.destination === locationFilter
)
// Expected: Trips with id='1', '2', '3'

// Test Case 3: Date filter
const dateFilter = '2024-02-01'
const filtered3 = trips.filter(trip => trip.departureDate === dateFilter)
// Expected: Trips with id='1', '3'

// Test Case 4: Combined filters
const filtered4 = trips
  .filter(trip => getLocationName(trip.departureLocation).toLowerCase().includes('hcm'))
  .filter(trip => trip.departureDate === '2024-02-01')
// Expected: Trips with id='1', '3'
```

---

### 3.2 Passenger Capacity Calculation
**Test:** Available seats calculation with driver seat excluded
```javascript
// Setup: Vehicle with capacity 7 (e.g., van)
const vehicle = { capacity: 7 }

// Scenario 1: 1 passenger in group
const totalPassengers1 = 1
const passengerCapacity1 = vehicle.capacity - 1  // 6
const availableSeats1 = passengerCapacity1 - totalPassengers1  // 5
// Expected: 5 available seats

// Scenario 2: 3 passengers in group
const totalPassengers2 = 3
const passengerCapacity2 = vehicle.capacity - 1  // 6
const availableSeats2 = passengerCapacity2 - totalPassengers2  // 3
// Expected: 3 available seats

// Scenario 3: 6 passengers (full)
const totalPassengers3 = 6
const passengerCapacity3 = vehicle.capacity - 1  // 6
const availableSeats3 = passengerCapacity3 - totalPassengers3  // 0
// Expected: 0 available seats (should NOT show in available trips)
```

---

### 3.3 Re-render Count Test
**Test:** Component should re-render less with useMemo/useCallback
```javascript
// Use React DevTools Profiler or manual counter

let renderCount = 0

function AvailableTrips() {
  renderCount++
  console.log('Render count:', renderCount)

  // ... component code
}

// Test Scenario 1: Type in search box
// Old: Re-renders on EVERY keystroke
// New: Re-renders only when filteredTripsData changes

// Test Scenario 2: Change filters
// Old: Multiple re-renders (useEffect chain)
// New: Single re-render (useMemo recalculates once)

// Expected: 50-80% fewer re-renders
```

---

## Test Suite 4: Integration Tests

### 4.1 End-to-End Trip Optimization Flow
**Test:** Complete optimization workflow
```javascript
// Step 1: Create 5 trips (approved status)
const trips = await createTestTrips(5)

// Step 2: Run optimization
const optimizeResponse = await fetch('/api/optimize', { method: 'POST' })
const { proposalsCreated } = await optimizeResponse.json()

// Step 3: Get optimization groups
const groups = await getOptimizationGroups()

// Step 4: Approve first group
const groupId = groups[0].id
const approveResponse = await fetch(`/api/optimize/${groupId}/approve`, { method: 'POST' })

// Step 5: Verify trips are optimized
const optimizedTrips = await getTrips({ status: 'optimized' })

// Expected:
// - All original trips have status 'optimized'
// - All trips have same optimizedGroupId
// - Temp trips are deleted
// - Notification emails sent
```

---

### 4.2 Join Request Flow
**Test:** User joins available trip
```javascript
// Step 1: Create optimized trip with 2 passengers (car-7 capacity)
const baseTrip = await createOptimizedTrip({ passengers: 2, vehicleType: 'car-7' })

// Step 2: Load available trips
const availableTrips = await fetch('/api/trips/available').then(r => r.json())

// Step 3: Verify trip shows with correct available seats
const trip = availableTrips.find(t => t.id === baseTrip.optimizedGroupId)
// Expected: availableSeats = (7-1) - 2 = 4

// Step 4: Create join request
const joinRequest = await createJoinRequest(baseTrip.id, user2.id)

// Step 5: Admin approves join request
await approveJoinRequest(joinRequest.id)

// Step 6: Reload available trips
const updatedTrips = await fetch('/api/trips/available').then(r => r.json())
const updatedTrip = updatedTrips.find(t => t.id === baseTrip.optimizedGroupId)

// Expected: availableSeats = 4 - 1 = 3
```

---

## Test Suite 5: Performance Regression Tests

### 5.1 Query Performance
**Test:** Verify indexes improve query speed
```sql
-- Before indexes
EXPLAIN SELECT * FROM trips WHERE status = 'approved' AND departure_date = '2024-02-01';
-- Check: Should use idx_status_departure_date index

-- Measure query time
SET profiling = 1;
SELECT * FROM trips WHERE status = 'approved' AND departure_date = '2024-02-01';
SHOW PROFILES;
-- Expected: < 10ms for 10,000 rows

-- Test composite index
SELECT * FROM trips
WHERE departure_location = 'HCM Office'
  AND destination = 'Phan Thiet Factory'
  AND departure_date = '2024-02-01';
-- Expected: Uses idx_departure_dest_date
```

---

### 5.2 API Response Time
**Test:** Measure API response times
```javascript
// Test 1: Get trips (with pagination)
console.time('getTrips')
const trips = await fetch('/api/trips?limit=100').then(r => r.json())
console.timeEnd('getTrips')
// Expected: < 200ms

// Test 2: Get available trips
console.time('availableTrips')
const available = await fetch('/api/trips/available').then(r => r.json())
console.timeEnd('availableTrips')
// Expected: < 500ms

// Test 3: Create optimization
console.time('optimize')
const optimize = await fetch('/api/optimize', { method: 'POST', body: JSON.stringify(proposals) })
console.timeEnd('optimize')
// Expected: < 2000ms (for 10 proposals)
```

---

### 5.3 Frontend Render Performance
**Test:** Measure component render times
```javascript
// Use React DevTools Profiler

// Test 1: Initial load of Available Trips
// Expected: < 500ms from mount to render complete

// Test 2: Filter change
// Expected: < 50ms to re-filter 100 trips

// Test 3: Search typing
// Expected: No lag, smooth typing
```

---

## Test Suite 6: Data Integrity Tests

### 6.1 Pagination Data Completeness
**Test:** Verify no data loss with pagination
```javascript
// Get all trips with pagination
let allTrips = []
let offset = 0
const limit = 100

while (true) {
  const batch = await fabricService.getTrips({ limit, offset })
  if (batch.length === 0) break
  allTrips.push(...batch)
  offset += limit
}

// Get count from database
const [result] = await connection.query('SELECT COUNT(*) as count FROM trips')
const totalCount = result[0].count

// Expected: allTrips.length === totalCount
```

---

### 6.2 Batch Fetch Data Completeness
**Test:** Verify batch methods return all data
```javascript
// Create 100 trips
const tripIds = []
for (let i = 0; i < 100; i++) {
  const trip = await createTrip()
  tripIds.push(trip.id)
}

// Fetch in batch
const batchTrips = await fabricService.getTripsByIds(tripIds)

// Expected: batchTrips.length === 100
// Expected: All trip IDs present
```

---

## Test Suite 7: Edge Cases

### 7.1 Empty Results
**Test:** Handle empty results gracefully
```javascript
// Test 1: No trips match filter
const trips1 = await fabricService.getTrips({ status: 'nonexistent_status' })
// Expected: [] (empty array, not null or error)

// Test 2: Batch fetch with no matching IDs
const trips2 = await fabricService.getTripsByIds(['fake1', 'fake2'])
// Expected: [] (empty array)

// Test 3: Available trips with no seats
const available = await fetch('/api/trips/available').then(r => r.json())
// Expected: Only trips with availableSeats > 0
```

---

### 7.2 Large Datasets
**Test:** Performance with 10,000+ records
```javascript
// Insert 10,000 test trips
await insertBulkTrips(10000)

// Test 1: Pagination works
const page1 = await fabricService.getTrips({ limit: 100, offset: 0 })
const page50 = await fabricService.getTrips({ limit: 100, offset: 4900 })
// Expected: Both return 100 trips, different trips

// Test 2: Batch fetch 1000 IDs
const ids = Array.from({ length: 1000 }, (_, i) => `trip-${i}`)
console.time('batchFetch1000')
const trips = await fabricService.getTripsByIds(ids)
console.timeEnd('batchFetch1000')
// Expected: < 500ms
```

---

## Test Suite 8: Concurrent Operations

### 8.1 Race Conditions
**Test:** Multiple users joining same trip simultaneously
```javascript
// Setup: Trip with 1 available seat
const trip = await createTripWithSeats(1)

// Simulate 3 users requesting to join at the same time
const requests = await Promise.all([
  createJoinRequest(trip.id, user1.id),
  createJoinRequest(trip.id, user2.id),
  createJoinRequest(trip.id, user3.id)
])

// Admin approves all 3 (should handle race condition)
const approvals = await Promise.all(
  requests.map(r => approveJoinRequest(r.id))
)

// Expected:
// - Only 1 approval succeeds (first one)
// - Other 2 fail with "no seats available"
// - Trip shows 0 available seats after
```

---

## Automated Test Script

```javascript
// tests/run-safety-tests.js
const { fabricService } = require('../lib/fabric-client')

async function runAllTests() {
  console.log('🧪 Starting Performance Safety Tests...\n')

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  }

  // Test 1: Pagination
  try {
    console.log('Test 1: Pagination backward compatibility...')
    const trips = await fabricService.getTrips()
    assert(Array.isArray(trips), 'Should return array')
    assert(trips.length <= 100, 'Should respect default limit')
    results.passed++
    console.log('✅ PASSED\n')
  } catch (err) {
    results.failed++
    results.errors.push({ test: 'Pagination', error: err.message })
    console.log('❌ FAILED:', err.message, '\n')
  }

  // Test 2: Batch Methods
  try {
    console.log('Test 2: Batch methods return same data...')
    const ids = ['trip1', 'trip2', 'trip3']
    const individual = await Promise.all(ids.map(id => fabricService.getTripById(id)))
    const batch = await fabricService.getTripsByIds(ids)
    assert(individual.length === batch.length, 'Same number of trips')
    results.passed++
    console.log('✅ PASSED\n')
  } catch (err) {
    results.failed++
    results.errors.push({ test: 'Batch Methods', error: err.message })
    console.log('❌ FAILED:', err.message, '\n')
  }

  // ... more tests

  console.log('\n============================================')
  console.log('Test Results:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)

  if (results.errors.length > 0) {
    console.log('\nErrors:')
    results.errors.forEach(({ test, error }) => {
      console.log(`- ${test}: ${error}`)
    })
  }

  return results
}

module.exports = { runAllTests }
```

---

## Manual Testing Checklist

### Admin Dashboard
- [ ] Load < 1 second
- [ ] All statistics display correctly
- [ ] Filters work (status, date, location)
- [ ] Search works (user name, email)
- [ ] Pagination controls work

### Available Trips
- [ ] Shows only trips with available seats
- [ ] Correct seat calculation (excluding driver)
- [ ] Search by location works
- [ ] Date filter works
- [ ] Request to join works
- [ ] Shows pending/approved status correctly

### Optimization
- [ ] Create optimization proposals
- [ ] Shows proposed departure times
- [ ] Shows vehicle types
- [ ] Shows estimated savings
- [ ] Approve optimization works
- [ ] Reject optimization works
- [ ] Notifications sent to users

### Join Requests
- [ ] User can request to join
- [ ] Admin sees all requests
- [ ] Approve creates new trip
- [ ] Reject with reason works
- [ ] User sees approval/rejection

---

## Success Criteria

✅ All 40+ automated tests pass
✅ No breaking changes detected
✅ Performance improvements verified (5-10x faster)
✅ No data loss or corruption
✅ All edge cases handled
✅ Concurrent operations safe
✅ Manual testing checklist complete

---

## Rollback Plan (If Issues Found)

If any critical issues are detected:

1. Revert code changes:
```bash
git revert <commit-hash>
```

2. Drop indexes:
```sql
DROP INDEX idx_status_departure_date ON trips;
DROP INDEX idx_user_email_status ON trips;
-- ... etc
```

3. Clear cache:
```javascript
cacheService.clear()
```

4. Restart server:
```bash
npm run dev
```
