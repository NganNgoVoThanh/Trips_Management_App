# 🧪 Join Request Testing & Troubleshooting Guide

## Tóm tắt vấn đề đã fix

### Vấn đề ban đầu:
- ❌ Admin page không hiển thị join requests
- ✅ Users nhận được email confirmation
- ❓ Không rõ requests có được lưu vào database không

### Root Cause đã phát hiện:
**Database schema mismatch** - Code cố gắng INSERT với 2 columns không tồn tại:
- `requester_manager_email` (MISSING)
- `requester_manager_name` (MISSING)

→ MySQL INSERT fails silently
→ Không có record nào trong database
→ Admin page trống

### Giải pháp đã áp dụng:
```sql
ALTER TABLE join_requests
  ADD COLUMN requester_manager_email VARCHAR(255) NULL,
  ADD COLUMN requester_manager_name VARCHAR(255) NULL;
```

---

## 📋 Kiểm tra hiện trạng

### 1. Kiểm tra Database Schema

```bash
node scripts/test-join-request-insert.js
```

**Expected output:**
- ✅ Foreign key constraint on `trip_id` exists
- ✅ Test INSERT succeeds
- ✅ Columns `requester_manager_email` and `requester_manager_name` exist

### 2. Kiểm tra Database hiện có bao nhiêu records

```sql
SELECT COUNT(*) as total FROM join_requests;
SELECT id, requester_name, status, created_at
FROM join_requests
ORDER BY created_at DESC
LIMIT 10;
```

**Nếu COUNT = 0:**
- ⚠️ Database hoàn toàn trống
- 💡 **ĐÂY LÀ LÝ DO ADMIN PAGE TRỐNG**
- 👉 Cần users submit join requests qua UI

### 3. Test API Endpoint

```bash
node scripts/test-api-join-requests.js
```

**Script này sẽ:**
1. Kiểm tra database state
2. Tạo 1 test record (nếu database trống)
3. Verify service layer có thể đọc records
4. In ra hướng dẫn test tiếp theo

---

## 🚀 Hướng dẫn Test End-to-End

### Test Flow 1: User Submit Join Request

#### Bước 1: User đăng nhập
1. Mở browser
2. Truy cập: `http://localhost:50001`
3. Đăng nhập với user account (NOT admin)

#### Bước 2: Tìm available trip để join
1. Vào Dashboard → Available Trips tab
2. Tìm một trip có seats available
3. Click "Request to Join" button

#### Bước 3: Submit join request
1. Nhập reason (optional)
2. Click "Submit Request"
3. **✅ Check:** Toast notification "Request submitted"
4. **✅ Check:** Email confirmation received

#### Bước 4: Verify trong Database
```sql
SELECT * FROM join_requests
WHERE requester_email = 'your-user-email@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- ✅ Record tồn tại
- ✅ `status = 'pending'`
- ✅ `trip_id` matches trip you requested
- ✅ `requester_manager_email` populated (nếu user có manager)
- ✅ `created_at` là thời gian vừa submit

**Nếu record KHÔNG TỒN TẠI:**
1. Mở Browser DevTools → Network tab
2. Tìm request `POST /api/join-requests`
3. Check status code:
   - `201 Created` → Success, check database lại
   - `400 Bad Request` → Check request body
   - `401 Unauthorized` → User not authenticated
   - `500 Server Error` → Check server logs

4. Check Browser Console for errors
5. Check server terminal for logs

#### Bước 5: Verify Server Logs
Trong terminal đang chạy `npm run dev`, tìm:
```
✅ Join request saved to MySQL: jr_...
📧 Join request confirmation sent to user@example.com
📧 Admin notification sent to admin@example.com
```

**Nếu thấy lỗi:**
```
❌ Error saving join request to MySQL: ...
```
→ Copy full error message và check:
- Foreign key constraint violations
- Column not found errors
- Connection errors

---

### Test Flow 2: Admin View Requests

#### Bước 1: Admin đăng nhập
1. Logout current user
2. Login với admin account
3. Vào Dashboard → Admin Panel → Join Requests tab

#### Bước 2: Check UI hiển thị
**✅ Nên thấy:**
- Stats cards (Total, Pending, Approved, Rejected)
- Tabs: All / Pending / Approved / Rejected / Cancelled
- List of join requests với thông tin:
  - Requester name & email
  - Trip details (from → to)
  - Date & time
  - Status badge
  - Action buttons (Approve / Reject)

**❌ Nếu KHÔNG thấy gì:**

##### Debug Step 1: Check Browser Network Tab
1. Mở DevTools → Network
2. Refresh page
3. Tìm request `GET /api/join-requests`
4. Click vào request → Check:
   - **Status Code:**
     - `200 OK` → Check Response tab
     - `401 Unauthorized` → Admin not logged in
     - `500 Server Error` → Check server logs

   - **Response:**
     - `[]` (empty array) → Database trống
     - `[{...}, {...}]` → Data tồn tại, lỗi ở component
     - Error object → Check error message

##### Debug Step 2: Check Browser Console
Tìm errors:
```
Error fetching join requests: ...
⚠️ getJoinRequests called on server side
```

##### Debug Step 3: Verify Database
```sql
SELECT COUNT(*) FROM join_requests;
```

Nếu `COUNT = 0`:
- Database hoàn toàn trống
- Admin page ĐÚNG là trống
- **Solution:** Cần users submit requests trước

Nếu `COUNT > 0` nhưng admin page trống:
- Database có data
- API hoặc component có vấn đề
- Continue to Debug Step 4

##### Debug Step 4: Test API Direct
```bash
# Test if API works (requires authentication)
curl -X GET http://localhost:50001/api/join-requests \
  -H "Cookie: your-session-cookie" \
  -H "Content-Type: application/json"
```

**Expected:** JSON array of join requests

#### Bước 3: Test Filter
1. Click "Pending" tab → Chỉ thấy pending requests
2. Click "All" tab → Thấy tất cả requests
3. Click "Approved" tab → Thấy approved requests (nếu có)

---

### Test Flow 3: Admin Approve Request

#### Bước 1: Select a pending request
1. Tìm request với status "Pending"
2. Click "Approve" button

#### Bước 2: Add admin notes (optional)
1. Dialog mở ra
2. Nhập admin notes nếu muốn
3. Click "Approve Request"

#### Bước 3: Verify approval success
**✅ Check UI:**
- Toast notification "Request Approved"
- Request disappears from "Pending" tab
- Request appears in "Approved" tab with green badge

**✅ Check Database:**
```sql
SELECT id, status, admin_notes, processed_by, processed_at
FROM join_requests
WHERE id = 'jr_...';
```

Expected:
- `status = 'approved'`
- `processed_by` = admin user ID
- `processed_at` = current timestamp
- `admin_notes` = your notes (if provided)

**✅ Check New Trip Created:**
```sql
SELECT id, user_id, user_name, status, parent_trip_id, optimized_group_id
FROM trips
WHERE parent_trip_id = 'original-trip-id'
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- New trip created for requester
- `parent_trip_id` references original trip
- Status depends on original trip:
  - `optimized` → Instant join (no manager approval needed)
  - `pending_approval` / `pending_urgent` → Manager approval required
  - `auto_approved` → No manager (auto-approved)

**✅ Check Emails Sent:**

1. **Requester email:**
   - Subject: "Trip Join Request Approved"
   - Content depends on join type:
     - Instant join → "Trip CONFIRMED"
     - Normal flow → "Manager Approval Required"

2. **Manager email (CC):**
   - Included in requester email as CC
   - FYI for instant join
   - Action required for normal flow

---

## 🐛 Common Issues & Solutions

### Issue 1: "Database is empty, admin page shows nothing"

**Cause:** No users have submitted join requests yet

**Solution:**
1. Have a regular user (not admin) submit a join request
2. Follow "Test Flow 1" above
3. Then check admin page again

**Quick Test:**
```bash
# Create a test record
node scripts/test-api-join-requests.js
# This creates 1 test record, then check admin page
```

---

### Issue 2: "POST /api/join-requests returns 500 error"

**Possible causes:**
1. **Foreign key constraint** - `trip_id` doesn't exist
2. **Column not found** - Missing `requester_manager_email` or `requester_manager_name`
3. **User not authenticated** - Session expired

**Debug:**
```bash
# Check server logs
npm run dev

# Look for:
❌ Error saving join request to MySQL: ...
```

**Solutions:**
- FK constraint → Use valid trip ID from available trips
- Column missing → Run schema fix again:
  ```sql
  ALTER TABLE join_requests
    ADD COLUMN IF NOT EXISTS requester_manager_email VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS requester_manager_name VARCHAR(255) NULL;
  ```
- Auth issue → Re-login

---

### Issue 3: "Email sent but database empty"

**Cause:** This was the ORIGINAL BUG - emails sent before database save fails

**Fixed by:** Adding `requester_manager_email` and `requester_manager_name` columns

**Verify fix:**
```sql
DESCRIBE join_requests;
-- Should show requester_manager_email and requester_manager_name
```

---

### Issue 4: "Admin page loads but shows empty list"

**Debug checklist:**

1. **Check database has records:**
   ```sql
   SELECT COUNT(*) FROM join_requests;
   ```

2. **Check API returns data:**
   - Open DevTools → Network → `GET /api/join-requests`
   - Response should be array of objects, not `[]`

3. **Check authentication:**
   - Admin logged in?
   - Session valid?
   - Check response status code

4. **Check filter:**
   - Default filter is "All" now
   - Try switching between tabs

5. **Check component state:**
   - Open React DevTools
   - Find `JoinRequestsManagement` component
   - Check `requests` state - should be array

---

### Issue 5: "Approve button doesn't work"

**Possible causes:**
1. Next.js 15 params issue (ALREADY FIXED)
2. Request already processed
3. Network error

**Debug:**
```javascript
// Check browser console for:
Error approving join request: ...
Only pending requests can be approved
```

**Verify route file:**
```typescript
// app/api/join-requests/[id]/approve/route.ts
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }  // ✅ Must be Promise
) {
  const { id } = await context.params;  // ✅ Must await
  // ...
}
```

---

## 📊 Database Verification Queries

### Check all join requests
```sql
SELECT
  id,
  trip_id,
  requester_name,
  requester_email,
  status,
  created_at,
  processed_at
FROM join_requests
ORDER BY created_at DESC;
```

### Check pending requests
```sql
SELECT * FROM join_requests WHERE status = 'pending';
```

### Check approved requests and their trips
```sql
SELECT
  jr.id as request_id,
  jr.requester_name,
  jr.status as request_status,
  jr.created_at as requested_at,
  jr.processed_at as approved_at,
  t.id as trip_id,
  t.status as trip_status,
  t.parent_trip_id
FROM join_requests jr
LEFT JOIN trips t ON t.parent_trip_id = jr.trip_id AND t.user_id = jr.requester_id
WHERE jr.status = 'approved'
ORDER BY jr.created_at DESC;
```

### Check foreign key constraints
```sql
SELECT
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'join_requests'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## 🔧 Emergency Fix Commands

### Reset all join requests (CAUTION!)
```sql
-- Delete all join requests
DELETE FROM join_requests;

-- Reset auto-increment (if using)
ALTER TABLE join_requests AUTO_INCREMENT = 1;
```

### Fix schema if columns missing
```sql
ALTER TABLE join_requests
  ADD COLUMN IF NOT EXISTS requester_manager_email VARCHAR(255) NULL AFTER requester_department,
  ADD COLUMN IF NOT EXISTS requester_manager_name VARCHAR(255) NULL AFTER requester_manager_email;
```

### Check table structure
```sql
DESCRIBE join_requests;
SHOW CREATE TABLE join_requests;
```

---

## ✅ Checklist: Join Request Flow Working?

### User Submission
- [ ] User can see available trips
- [ ] "Request to Join" button visible
- [ ] Form opens with trip details
- [ ] Submit succeeds with toast notification
- [ ] Email confirmation received
- [ ] Database record created (`SELECT * FROM join_requests`)
- [ ] Server logs show successful save

### Admin View
- [ ] Admin can login
- [ ] Join Requests tab visible in admin panel
- [ ] Stats cards show correct numbers
- [ ] Request list displays all requests
- [ ] Filters work (All, Pending, Approved, etc.)
- [ ] Request details visible (name, email, trip, date)

### Admin Actions
- [ ] Approve button works
- [ ] Reject button works
- [ ] Admin notes can be added
- [ ] Status updates in database
- [ ] New trip created for user (on approve)
- [ ] Emails sent to requester and manager
- [ ] Request moves to correct tab after action

### Complete Flow
- [ ] User submits → Database record created
- [ ] Admin sees → Request visible on admin page
- [ ] Admin approves → Trip created for user
- [ ] User sees → New trip in "My Trips"
- [ ] Emails sent → User and manager notified

---

## 📞 Need Help?

If all tests fail and you're stuck:

1. **Check server is running:**
   ```bash
   npm run dev
   ```

2. **Check database connection:**
   ```bash
   node -e "const mysql = require('mysql2/promise'); require('dotenv').config(); (async () => { const conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME }); console.log('✅ Connected'); await conn.end(); })();"
   ```

3. **Check .env file has correct credentials:**
   ```
   DB_HOST=...
   DB_USER=...
   DB_PASSWORD=...
   DB_NAME=...
   ```

4. **Review docs:**
   - [`docs/JOIN_REQUEST_DATABASE_FIX.md`](JOIN_REQUEST_DATABASE_FIX.md) - Schema fix details
   - [`docs/JOIN_REQUEST_FLOW.md`](JOIN_REQUEST_FLOW.md) - Complete flow diagram
   - [`docs/JOIN_REQUEST_BUG_FIX.md`](JOIN_REQUEST_BUG_FIX.md) - Previous bug fix

---

**Created:** 2026-01-23
**Last Updated:** 2026-01-23
**Status:** Active - Use this guide for testing and troubleshooting
