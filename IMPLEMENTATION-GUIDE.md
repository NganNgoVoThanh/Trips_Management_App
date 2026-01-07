# Trip Status Migration - Implementation Guide

## 📋 Overview

This guide provides step-by-step instructions to complete the trip status migration from old status names to the new simplified status scheme.

---

## ✅ Completed Steps

1. ✅ Created database migration script: `scripts/migrate-trip-status.js`
2. ✅ Created status configuration: `lib/trip-status-config.ts`
3. ✅ Updated TypeScript interfaces in `lib/mysql-service.ts`
4. ✅ Created optimization helper: `lib/optimization-helper.ts`
5. ✅ Updated `/api/trips/submit/route.ts` with new status logic

---

## 🔄 Remaining Implementation Steps

### Step 1: Run Database Migration

```bash
node scripts/migrate-trip-status.js
```

This will:
- Backup existing trips table
- Update status ENUM with new values
- Migrate existing trip statuses
- Show before/after status distribution

### Step 2: Update `/api/trips/approve/route.ts`

Add imports:
```typescript
import { TripStatus } from '@/lib/trip-status-config';
import { checkOptimizationPotential } from '@/lib/optimization-helper';
```

Replace the approval logic (around line 240-250):
```typescript
// OLD:
await fabricService.updateTrip(tripId, {
  status: 'approved'
});

// NEW:
// Step 1: Update manager approval status
await fabricService.updateTrip(tripId, {
  manager_approval_status: 'approved',
  manager_approved_by: managerEmail,
  manager_approval_at: new Date().toISOString()
});

// Step 2: Check if trip can be optimized
const canOptimize = await checkOptimizationPotential(tripId);

// Step 3: Set appropriate status
const newStatus: TripStatus = canOptimize ? 'approved' : 'approved_solo';

await fabricService.updateTrip(tripId, {
  status: newStatus
});

console.log(`✓ Trip ${tripId} status: ${newStatus} (can optimize: ${canOptimize})`);
```

### Step 3: Update `/api/optimize/route.ts`

Replace the POST handler:
```typescript
export async function POST(request: NextRequest) {
  try {
    // Get trips that can be optimized
    const tripsToOptimize = await fabricService.getTrips({
      status: 'approved',  // NEW: Only 'approved' trips
      dataType: 'raw'
    });

    if (tripsToOptimize.length === 0) {
      return NextResponse.json({
        message: 'No trips available for optimization',
        availableTrips: 0
      });
    }

    console.log(`🔄 Running AI optimization for ${tripsToOptimize.length} trips`);

    // Update status to pending_optimization
    for (const trip of tripsToOptimize) {
      await fabricService.updateTrip(trip.id, {
        status: 'pending_optimization'
      });
    }

    // Run AI optimizer
    const proposals = await aiOptimizer.optimizeTrips(tripsToOptimize);

    if (proposals.length === 0) {
      // No optimizations found - revert to solo
      for (const trip of tripsToOptimize) {
        await fabricService.updateTrip(trip.id, {
          status: 'approved_solo'
        });
      }

      return NextResponse.json({
        message: 'No optimization opportunities found',
        tripsProcessed: tripsToOptimize.length
      });
    }

    // Create proposals and update trips to 'proposed' status
    for (const proposal of proposals) {
      const groupId = await fabricService.createOptimizationGroup({
        proposedDepartureTime: proposal.proposedDepartureTime,
        vehicleType: proposal.vehicleType,
        estimatedSavings: proposal.estimatedSavings,
        status: 'proposed'
      });

      // Create TEMP trips
      for (const trip of proposal.trips) {
        await fabricService.createTrip({
          ...trip,
          status: 'draft',
          dataType: 'temp',
          optimizedGroupId: groupId,
          departureTime: proposal.proposedDepartureTime,
          vehicleType: proposal.vehicleType
        });
      }

      // Update RAW trips to 'proposed'
      for (const trip of proposal.trips) {
        await fabricService.updateTrip(trip.id, {
          status: 'proposed',
          optimizedGroupId: groupId
        });
      }
    }

    return NextResponse.json({
      success: true,
      proposalsCreated: proposals.length,
      tripsAffected: proposals.reduce((sum, p) => sum + p.trips.length, 0),
      proposals
    });

  } catch (error: any) {
    console.error('❌ Optimization error:', error);
    return NextResponse.json(
      { error: error.message || 'Optimization failed' },
      { status: 500 }
    );
  }
}
```

### Step 4: Update `/api/optimize/approve/route.ts`

No major changes needed, but add logging for new status:
```typescript
console.log(`✅ Admin approving optimization - trips will be marked as 'optimized'`);
```

The `fabricService.approveOptimization()` should update trips to `status = 'optimized'`.

### Step 5: Update `/api/optimize/reject/route.ts`

Update the rejection logic:
```typescript
// After rejecting, trips should go back to 'approved_solo'
await fabricService.rejectOptimization(groupId);
// This should update RAW trips: status = 'approved_solo'
```

### Step 6: Update UI Components

#### 6.1 Update status color functions

In all UI components that display trip status, replace status checking with:

```typescript
import {
  getStatusBadge,
  getStatusLabel,
  getStatusIcon
} from '@/lib/trip-status-config';

// Usage:
<Badge className={getStatusBadge(trip.status)}>
  {getStatusIcon(trip.status)} {getStatusLabel(trip.status)}
</Badge>
```

#### 6.2 Key files to update:

1. **`components/dashboard/trip-registration.tsx`** (lines 166-212)
   - Update success toast messages with new status labels

2. **`components/dashboard/upcoming-trips.tsx`** (lines 146-157)
   - Replace status color function with `getStatusBadge()`

3. **`components/admin/trip-management.tsx`** (lines 192-205)
   - Replace `getStatusColor()` with `getStatusBadge()`
   - Update filter options (lines 240-256)

4. **`app/dashboard/trips/page.tsx`** (lines 138-146)
   - Replace status color function

5. **`components/admin/trip-optimization.tsx`**
   - Update proposal status display

#### 6.3 Example update for `trip-management.tsx`:

```typescript
// OLD:
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-50 text-green-700'
    case 'optimized': return 'bg-blue-50 text-blue-700'
    case 'pending': return 'bg-yellow-50 text-yellow-700'
    case 'cancelled': return 'bg-red-50 text-red-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

// NEW:
import { getStatusBadge, getStatusLabel, getStatusIcon } from '@/lib/trip-status-config';

// Use directly in JSX:
<Badge className={getStatusBadge(trip.status)}>
  {getStatusIcon(trip.status)} {getStatusLabel(trip.status)}
</Badge>
```

### Step 7: Update Filter Options

In admin components with status filters, update to new status values:

```typescript
<SelectContent>
  <SelectItem value="all">All Status</SelectItem>
  <SelectItem value="pending_approval">Pending Approval</SelectItem>
  <SelectItem value="pending_urgent">Pending (Urgent)</SelectItem>
  <SelectItem value="auto_approved">Auto-Approved</SelectItem>
  <SelectItem value="approved">Approved</SelectItem>
  <SelectItem value="approved_solo">Approved (Solo)</SelectItem>
  <SelectItem value="pending_optimization">Pending Optimization</SelectItem>
  <SelectItem value="proposed">Proposed</SelectItem>
  <SelectItem value="optimized">Optimized</SelectItem>
  <SelectItem value="rejected">Rejected</SelectItem>
  <SelectItem value="cancelled">Cancelled</SelectItem>
</SelectContent>
```

---

## 🧪 Testing Checklist

### 1. Database Migration
- [ ] Run migration script successfully
- [ ] Verify backup table created
- [ ] Check status distribution before/after
- [ ] Verify no data loss

### 2. Trip Submission Flow
- [ ] Test normal trip submission (> 24h) → `pending_approval`
- [ ] Test urgent trip submission (< 24h) → `pending_urgent`
- [ ] Test auto-approved (no manager) → `auto_approved`

### 3. Manager Approval Flow
- [ ] Test manager approves isolated trip → `approved_solo`
- [ ] Test manager approves with similar trips → `approved`
- [ ] Test manager rejects trip → `rejected`
- [ ] Test token expiration → `expired`

### 4. Optimization Flow
- [ ] Test admin runs optimization on approved trips → `pending_optimization`
- [ ] Test AI creates proposals → trips become `proposed`
- [ ] Test admin approves proposal → `optimized`
- [ ] Test admin rejects proposal → `approved_solo`

### 5. UI Display
- [ ] Verify all status badges display correctly
- [ ] Verify status colors match config
- [ ] Verify status icons appear
- [ ] Verify filters work with new status values

---

## 🔍 Troubleshooting

### Issue: Migration fails with ENUM error
**Solution:** Check if any trips have old status values not handled in migration script.

```sql
-- Find trips with unexpected status
SELECT status, COUNT(*) FROM trips GROUP BY status;
```

### Issue: TypeScript errors after migration
**Solution:** Ensure all imports use the new `TripStatus` type:

```typescript
import { TripStatus } from '@/lib/trip-status-config';
```

### Issue: UI not displaying new statuses
**Solution:** Clear Next.js cache and rebuild:

```bash
rm -rf .next
npm run build
npm run dev
```

### Issue: Trips stuck in old status
**Solution:** Manually update via SQL:

```sql
UPDATE trips
SET status = 'pending_approval'
WHERE status = 'pending';
```

---

## 📝 Rollback Plan

If issues occur, rollback steps:

1. Restore from backup table:
```sql
-- Find backup table name
SHOW TABLES LIKE 'trips_backup_%';

-- Restore
DROP TABLE trips;
CREATE TABLE trips AS SELECT * FROM trips_backup_XXXXXX;
```

2. Revert code changes:
```bash
git checkout HEAD -- lib/trip-status-config.ts
git checkout HEAD -- lib/mysql-service.ts
git checkout HEAD -- app/api/trips/submit/route.ts
```

---

## ✅ Final Verification

After completing all steps:

1. Check trip counts by status:
```sql
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;
```

2. Verify no trips are in old status values:
```sql
SELECT * FROM trips
WHERE status NOT IN (
  'pending_approval', 'pending_urgent', 'auto_approved',
  'approved', 'approved_solo', 'pending_optimization',
  'proposed', 'optimized', 'rejected', 'cancelled', 'expired', 'draft'
);
```

3. Test complete flow end-to-end:
   - User submits trip
   - Manager approves via email
   - Admin runs optimization
   - Admin approves/rejects proposal
   - Verify status transitions are correct

---

## 📞 Support

If you encounter issues during implementation:

1. Check logs in browser console and server console
2. Verify database schema matches expected ENUM values
3. Ensure all imports are correct
4. Check that fabricService methods handle new status values

Good luck with the implementation! 🚀
