# 📋 JOIN REQUEST FLOW - Quy trình Approval

## Tổng quan

Khi user muốn tham gia một chuyến đi đã được approved/optimized, họ phải gửi **Join Request** để admin xét duyệt.

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GIAI ĐOẠN 1: USER GỬI REQUEST                   │
└─────────────────────────────────────────────────────────────────────┘

[User]
  │
  ├─> Xem "Available Trips" (chuyến còn chỗ trống)
  │   └─> Component: available-trips.tsx
  │       ├─ Filter: Chỉ trips có status: approved/auto_approved/optimized
  │       ├─ Filter: Loại chuyến của chính user
  │       ├─ Filter: Chỉ chuyến chưa hết hạn
  │       └─ Hiển thị: số chỗ trống (capacity - driver - passengers)
  │
  ├─> Click "Request to Join" trên 1 trip
  │   └─> Dialog mở ra
  │       ├─ Hiển thị: Trip details (route, date, time, seats available)
  │       ├─ Input: Reason (optional)
  │       └─> Click "Submit Request"
  │
  ├─> POST /api/join-requests
  │   └─> Validations:
  │       ├─ ✓ User authenticated?
  │       ├─ ✓ No pending request for this trip?
  │       ├─ ✓ No approved request for this trip?
  │       ├─ ✓ User không có trip khác cùng ngày?
  │       ├─ ✓ Vehicle còn chỗ? (capacity > currentPassengers + 1)
  │       └─ ✓ User không trong optimized group này rồi?
  │
  ├─> CREATE join_request
  │   └─> Database INSERT:
  │       ├─ id: unique ID
  │       ├─ trip_id: original trip ID
  │       ├─ requester_id: user ID
  │       ├─ requester_name: user name
  │       ├─ requester_email: user email
  │       ├─ reason: lý do (optional)
  │       ├─ status: 'pending' ⏳
  │       ├─ trip_details: {departureLocation, destination, date, time, groupId}
  │       └─ created_at: NOW()
  │
  └─> SEND EMAILS (2 emails)
      │
      ├─> Email 1: TO ADMIN
      │   ├─ To: admin@company.com
      │   ├─ CC: User's manager (nếu có)
      │   ├─ Subject: "🔔 New Trip Join Request"
      │   └─ Body: Trip details + User info + Reason
      │
      └─> Email 2: TO USER (Confirmation)
          ├─ To: user@company.com
          ├─ CC: User's manager (nếu có)
          ├─ Subject: "Trip Join Request Submitted"
          └─ Body: "Your request is awaiting admin approval"

[User UI Updates]
  └─> Available Trips component refreshes
      ├─ Button changes: "Request to Join" → "Cancel" + "Request Pending" badge
      └─ Toast: "Request submitted successfully"


┌─────────────────────────────────────────────────────────────────────┐
│                   GIAI ĐOẠN 2: ADMIN XÉT DUYỆT                      │
└─────────────────────────────────────────────────────────────────────┘

[Admin]
  │
  ├─> Mở Admin Dashboard → Join Requests
  │   └─> Component: join-requests-management.tsx
  │       ├─ Tabs: Pending / Approved / Rejected / Cancelled
  │       ├─ Stats: Total, Pending count, Approved count
  │       └─> Hiển thị danh sách requests
  │
  ├─> Xem request details
  │   ├─ User info: Name, Email, Department
  │   ├─ Trip info: Route, Date, Time
  │   ├─ Reason: Lý do user muốn join
  │   ├─ Current passengers: X/Y seats
  │   └─> 2 Actions: APPROVE hoặc REJECT
  │
  └─> Admin quyết định...


┌──────────────────────────────────────────────────────────────────────┐
│                SCENARIO A: ADMIN APPROVE ✅                          │
└──────────────────────────────────────────────────────────────────────┘

[Admin] Click "Approve"
  │
  ├─> POST /api/join-requests/[id]/approve
  │   └─> Input: admin notes (optional)
  │
  ├─> START DATABASE TRANSACTION
  │   │
  │   ├─> Step 1: Update join_request
  │   │   └─ UPDATE join_requests
  │   │      SET status = 'approved' ✅
  │   │          admin_notes = '...'
  │   │          processed_by = adminId
  │   │          processed_at = NOW()
  │   │      WHERE id = ? AND status = 'pending'
  │   │
  │   ├─> Step 2: Verify original trip still exists
  │   │   └─ SELECT id FROM trips WHERE id = ? FOR UPDATE
  │   │      (Lock row to prevent race conditions)
  │   │
  │   └─> Step 3: CREATE NEW TRIP for user
  │       └─> Determine trip status based on original trip:
  │
  │           ┌──────────────────────────────────────────────┐
  │           │  IF Original Trip = 'optimized'              │
  │           ├──────────────────────────────────────────────┤
  │           │  → New Trip Status: 'optimized' ✅           │
  │           │  → isInstantJoin: TRUE                       │
  │           │  → managerApprovalStatus: 'approved'         │
  │           │  → NO MANAGER APPROVAL NEEDED                │
  │           └──────────────────────────────────────────────┘
  │
  │           ┌──────────────────────────────────────────────┐
  │           │  ELSE (approved/auto_approved/approved_solo) │
  │           ├──────────────────────────────────────────────┤
  │           │  IF User has manager assigned:               │
  │           │    IF < 24 hours until departure:            │
  │           │      → Status: 'pending_urgent' ⚠️           │
  │           │    ELSE:                                     │
  │           │      → Status: 'pending_approval' ⏳         │
  │           │    → managerApprovalStatus: 'pending'        │
  │           │    → MANAGER APPROVAL NEEDED                 │
  │           │  ELSE (no manager):                          │
  │           │    → Status: 'auto_approved' ✅              │
  │           │    → NO APPROVAL NEEDED                      │
  │           └──────────────────────────────────────────────┘
  │
  │       INSERT INTO trips (
  │         id: new unique ID,
  │         userId: requester.id,
  │         userName: requester.name,
  │         userEmail: requester.email,
  │         status: (determined above),
  │         optimizedGroupId: original trip's groupId,
  │         parentTripId: original trip ID,
  │         departureLocation: same as original,
  │         destination: same as original,
  │         departureDate: same as original,
  │         departureTime: same as original,
  │         vehicleType: same as original,
  │         managerEmail: fetched from users table,
  │         managerName: fetched from users table,
  │         dataType: 'raw'
  │       )
  │
  └─> COMMIT TRANSACTION ✅


┌────────────────────────────────────────────────────────────────────┐
│          SCENARIO A.1: INSTANT JOIN (Optimized Trip)               │
└────────────────────────────────────────────────────────────────────┘

  [After Approval Commit]
    │
    ├─> SEND EMAIL TO USER
    │   ├─ To: user@company.com
    │   ├─ CC: manager@company.com
    │   ├─ Subject: "🎉 Trip Join Request Approved - Trip CONFIRMED!"
    │   ├─ Status: ✅ CONFIRMED
    │   └─ Body: "Your trip is CONFIRMED and ready! No manager approval needed."
    │
    └─> SEND FYI EMAIL TO MANAGER
        ├─ To: manager@company.com
        ├─ Subject: "[FYI] {userName} Joined Optimized Trip"
        ├─ Status: ℹ️ For Information Only
        └─ Body: "No action required. This is just for your information."

  [User Experience]
    └─> User sees trip in "My Trips" immediately
        ├─ Status: ✅ Optimized
        ├─ Message: "Your trip is confirmed!"
        └─> Can view trip details, no further action needed


┌────────────────────────────────────────────────────────────────────┐
│          SCENARIO A.2: NORMAL APPROVAL (Needs Manager)             │
└────────────────────────────────────────────────────────────────────┘

  [After Approval Commit]
    │
    ├─> SEND EMAIL TO USER
    │   ├─ To: user@company.com
    │   ├─ CC: manager@company.com
    │   ├─ Subject: "✅ Trip Approved - Manager Approval Required"
    │   ├─ Status: ⏳ PENDING MANAGER APPROVAL
    │   └─ Body: "Admin approved your join request.
    │             Now waiting for manager approval."
    │
    └─> SEND ACTION EMAIL TO MANAGER
        ├─ To: manager@company.com
        ├─ CC: user@company.com
        ├─ Subject: "[ACTION REQUIRED] Trip Approval Request"
        ├─ Contains: Approve/Reject buttons with unique URLs
        ├─ Expires: 48 hours
        └─ Body: Trip details + approval links

  [User Experience]
    └─> User sees trip in "My Trips" as PENDING
        ├─ Status: ⏳ Pending Manager Approval
        ├─ Message: "Waiting for {managerName} to approve"
        └─> Can cancel the trip if needed

  [Manager Approval Flow]
    └─> Manager clicks Approve/Reject in email
        └─> Goes to /api/trips/[id]/approve or /reject
            ├─ If APPROVE:
            │   ├─ Trip status: 'pending' → 'approved' or 'optimized'
            │   └─ Email to user: "Trip approved by manager!"
            │
            └─ If REJECT:
                ├─ Trip status: 'pending' → 'rejected'
                └─ Email to user: "Trip rejected by manager"


┌──────────────────────────────────────────────────────────────────────┐
│                SCENARIO B: ADMIN REJECT ❌                           │
└──────────────────────────────────────────────────────────────────────┘

[Admin] Click "Reject"
  │
  ├─> Input admin notes (REQUIRED)
  │   └─ Example: "Vehicle already at full capacity"
  │
  ├─> POST /api/join-requests/[id]/reject
  │   └─> UPDATE join_requests
  │       SET status = 'rejected' ❌
  │           admin_notes = '...'
  │           processed_by = adminId
  │           processed_at = NOW()
  │       WHERE id = ?
  │
  └─> SEND EMAIL TO USER
      ├─ To: user@company.com
      ├─ CC: manager@company.com
      ├─ Subject: "❌ Trip Join Request Rejected"
      ├─ Body: Trip details + Rejection reason
      └─ Status: ❌ REJECTED

  [User Experience]
    └─> Available Trips component updates
        ├─ Shows "Request rejected" badge
        ├─ Displays rejection reason
        └─> Button changes back to "Request to Join" (can request again)


┌──────────────────────────────────────────────────────────────────────┐
│                  SCENARIO C: USER CANCEL ⛔                          │
└──────────────────────────────────────────────────────────────────────┘

[User] Click "Cancel Request" (only for PENDING requests)
  │
  ├─> POST /api/join-requests/[id]/cancel
  │   └─> Validation: Only requester can cancel own request
  │   └─> Validation: Only pending requests can be cancelled
  │
  ├─> UPDATE join_requests
  │   SET status = 'cancelled' ⛔
  │   WHERE id = ? AND status = 'pending'
  │
  └─> SEND NOTIFICATION TO ADMIN (system log)
      └─ Admin dashboard shows "Cancelled by user"

  [User Experience]
    └─> Available Trips component updates
        ├─ Badge removed
        └─> Button back to "Request to Join"
```

---

## 📊 Database Changes Summary

### Join Request Lifecycle:

```
CREATE → pending ⏳
   ↓
   ├─→ ADMIN APPROVE → approved ✅
   │   └─→ Create NEW trip for user
   │       ├─ IF optimized: trip.status = 'optimized' ✅
   │       └─ ELSE: trip.status = 'pending_approval' ⏳
   │
   ├─→ ADMIN REJECT → rejected ❌
   │   └─→ No trip created
   │
   └─→ USER CANCEL → cancelled ⛔
       └─→ No trip created
```

### Trip Created on Approval:

```sql
INSERT INTO trips (
  id,                    -- New unique ID
  userId,                -- Requester's ID
  userName,              -- Requester's name
  userEmail,             -- Requester's email
  status,                -- 'optimized' OR 'pending_approval' OR 'auto_approved'
  optimizedGroupId,      -- Same as original trip
  parentTripId,          -- Original trip ID
  departureLocation,     -- Copied from original
  destination,           -- Copied from original
  departureDate,         -- Copied from original
  departureTime,         -- Copied from original
  vehicleType,           -- Copied from original
  managerEmail,          -- From users table
  managerName,           -- From users table
  dataType,              -- 'raw'
  created_at,
  updated_at
)
```

---

## 🔐 Validations & Security

### Request Creation Validations:
1. ✓ User must be authenticated
2. ✓ No duplicate pending request for same trip
3. ✓ No already approved request for same trip
4. ✓ User không có trip khác cùng ngày
5. ✓ User không trong optimized group này rồi
6. ✓ Vehicle capacity check: `(currentPassengers + approvedRequests + 1) <= capacity`

### Approval Validations:
1. ✓ Only pending requests can be approved
2. ✓ Original trip must still exist
3. ✓ Transaction ensures atomicity (all or nothing)

### Cancellation Validations:
1. ✓ Only pending requests can be cancelled
2. ✓ Only requester can cancel their own request

---

## 📧 Email Notifications Matrix

| Event | User Email | Manager Email | Admin Email | Notes |
|-------|------------|---------------|-------------|-------|
| **Request Created** | ✅ Confirmation | ℹ️ CC (FYI) | ✅ New request notification | Manager CC'd for visibility |
| **Instant Join Approved** | ✅ Confirmed! | ℹ️ FYI only | - | Manager doesn't need to approve |
| **Normal Approval** | ✅ Pending manager | ⚠️ ACTION REQUIRED | - | Manager must approve |
| **Rejected** | ❌ Rejection + reason | ℹ️ CC | - | Admin notes included |
| **Cancelled** | - | - | ℹ️ System log | No emails sent |

---

## 🎯 Key Decision Points

### 1. Instant Join vs Normal Approval?

```
IF original trip status = 'optimized':
  ✅ INSTANT JOIN
  ├─ User trip: status = 'optimized'
  ├─ Manager: FYI email only
  └─ User: Trip confirmed immediately
ELSE:
  ⏳ NORMAL APPROVAL
  ├─ User trip: status = 'pending_approval' or 'auto_approved'
  ├─ Manager: ACTION REQUIRED email
  └─ User: Waiting for manager approval
```

### 2. Urgent vs Normal Pending?

```
IF hours until departure < 24:
  ⚠️ URGENT
  └─ Trip status: 'pending_urgent'
ELSE:
  ⏳ NORMAL
  └─ Trip status: 'pending_approval'
```

### 3. Manager Approval Needed?

```
IF user has manager assigned:
  ✅ YES - Send approval email
ELSE:
  ❌ NO - Auto-approve (status = 'auto_approved')
```

---

## 🔄 Available Seats Update

Sau khi admin approve join request:

```
BEFORE:
  Trip Group: 3 passengers
  Vehicle: car-7 (capacity = 7, passengers = 6)
  Available Seats: 6 - 3 = 3

AFTER APPROVAL:
  Trip Group: 4 passengers (3 + 1 new)
  Vehicle: car-7 (capacity = 7, passengers = 6)
  Available Seats: 6 - 4 = 2
```

**Note:** Available seats tự động update vì:
- New trip được tạo với cùng `optimizedGroupId`
- Component `groupTrips()` đếm tất cả trips trong group
- `totalPassengers = groupTrips.length` (includes new trip)

---

## 📱 UI Components Involved

### User Side:
1. **available-trips.tsx** - View available trips, request to join
2. **trip-registration.tsx** - Create own trips
3. **upcoming-trips.tsx** - View own trips & approval status

### Admin Side:
1. **join-requests-management.tsx** - Manage all join requests
2. **trip-management.tsx** - View all trips
3. **management-dashboard.tsx** - Stats and overview

---

## ⚠️ Important Notes

1. **Race Condition Prevention**: Uses database transactions with row locking
2. **Capacity Check**: Done both at request creation AND approval
3. **Email Reliability**: Emails sent AFTER transaction commit (not part of transaction)
4. **Status Tracking**: Multiple status fields track different approval stages:
   - `join_request.status` - Admin approval status
   - `trip.status` - Trip overall status
   - `trip.managerApprovalStatus` - Manager approval status

5. **Optimized Trip Advantage**:
   - Skip manager approval
   - Instant confirmation
   - Faster for users
   - Encourages carpooling

---

## 🚀 Performance Considerations

1. **Indexes** on join_requests table:
   - `idx_trip_status` - Fast filtering by trip + status
   - `idx_requester_status` - Fast user request lookups
   - `idx_status_created` - Fast admin dashboard sorting

2. **Batch Operations**:
   - `getTripsByIds()` for fetching multiple trips
   - Reduces N+1 query problems

3. **Caching**:
   - Location names cached
   - User info cached during session

---

**Tóm lại:** Join Request flow có 2 nhánh chính:
- **Nhánh 1 (Instant Join):** Optimized trip → Admin approve → User trip confirmed ngay ✅
- **Nhánh 2 (Normal):** Approved trip → Admin approve → Manager approve → User trip confirmed ⏳

Cả 2 nhánh đều đảm bảo capacity check và email notifications đầy đủ! 🎉
