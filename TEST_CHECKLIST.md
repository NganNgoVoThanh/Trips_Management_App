# Test Checklist - Kiểm tra các fixes

## Chuẩn bị
- [ ] Server đang chạy: `npm run dev`
- [ ] Đăng nhập vào hệ thống với tài khoản Admin

---

## Test 1: Pending Actions - Admin-created trips không xuất hiện

### Bước 1: Kiểm tra trạng thái hiện tại
1. [ ] Mở `/admin/dashboard`
2. [ ] Xem section "Pending Actions"
3. [ ] Ghi lại số lượng pending: **____** items

### Bước 2: Tạo trip mới cho employee
1. [ ] Vào `/management`
2. [ ] Click tab "Create Trip"
3. [ ] Chọn một employee bất kỳ
4. [ ] Điền thông tin trip:
   - Departure: Hanoi
   - Destination: Danang
   - Date: Ngày mai
   - Time: 09:00
5. [ ] Click "Create Trip"
6. [ ] Chờ confirmation "Trip created and auto-approved successfully"

### Bước 3: Verify Pending Actions
1. [ ] Quay lại `/admin/dashboard`
2. [ ] Refresh trang (F5)
3. [ ] Xem section "Pending Actions"
4. [ ] **EXPECTED:** Số lượng pending KHÔNG tăng
5. [ ] **EXPECTED:** Trip vừa tạo KHÔNG xuất hiện trong danh sách

### Bước 4: Verify trip status
1. [ ] Vào `/management` → tab "All Trips"
2. [ ] Tìm trip vừa tạo (tên employee + Hanoi → Danang)
3. [ ] **EXPECTED:** Status = `approved` hoặc `auto_approved`
4. [ ] **EXPECTED:** Badge màu xanh (green)

---

## Test 2: Statistics Cards Navigation - Admin Dashboard

### Test từng card
Mở `/admin/dashboard` và click lần lượt vào các cards:

#### Row 1:
1. [ ] **Total Trips**
   - Click → `/admin/statistics/total-trips`
   - **EXPECTED:** Navigate đúng, không reload về home

2. [ ] **Pending Approvals**
   - Click → `/admin/approvals`
   - **EXPECTED:** Navigate đúng, hiện danh sách pending trips

3. [ ] **Join Requests**
   - Click → `/admin/join-requests`
   - **EXPECTED:** Navigate đúng, hiện join requests

4. [ ] **Total Savings**
   - Click → `/admin/statistics/total-savings`
   - **EXPECTED:** Navigate đúng, không reload

#### Row 2:
5. [ ] **Optimization Rate**
   - Click → `/admin/statistics/optimization-rate`
   - **EXPECTED:** Navigate đúng

6. [ ] **Active Employees**
   - Click → `/admin/statistics/active-employees`
   - **EXPECTED:** Navigate đúng

7. [ ] **This Month**
   - Click → `/admin/statistics/this-month`
   - **EXPECTED:** Navigate đúng

8. [ ] **Vehicle Utilization**
   - Click → `/admin/statistics/vehicle-utilization`
   - **EXPECTED:** Navigate đúng

---

## Test 3: Statistics Cards Navigation - User Dashboard

### Đăng nhập lại với tài khoản User (không phải Admin)
1. [ ] Logout khỏi admin account
2. [ ] Login với user account

### Test từng card
Mở `/dashboard` và click lần lượt vào các cards:

1. [ ] **Total Trips**
   - Click → `/dashboard/trips`
   - **EXPECTED:** Navigate đúng, hiện danh sách trips của user

2. [ ] **Upcoming Trips**
   - Click → `/dashboard/upcoming`
   - **EXPECTED:** Navigate đúng, hiện upcoming trips

3. [ ] **Money Saved**
   - Click → `/dashboard/savings`
   - **EXPECTED:** Navigate đúng, hiện savings details

4. [ ] **Optimization Rate**
   - Click → `/dashboard/activity`
   - **EXPECTED:** Navigate đúng, hiện activity log

---

## Test 4: Pending Actions - User-created trips VẪN xuất hiện

### Bước 1: Tạo trip với user account
1. [ ] Login với user account (không phải admin)
2. [ ] Vào `/dashboard` → tab "Register Trip"
3. [ ] Điền thông tin trip:
   - Departure: HCMC
   - Destination: Hanoi
   - Date: Ngày mai
   - Time: 10:00
4. [ ] Submit trip
5. [ ] **EXPECTED:** Trip status = `pending_approval` hoặc `pending_urgent`

### Bước 2: Verify Pending Actions (Admin)
1. [ ] Logout, login lại với admin account
2. [ ] Vào `/admin/dashboard`
3. [ ] Xem section "Pending Actions"
4. [ ] **EXPECTED:** Trip của user vừa tạo PHẢI xuất hiện trong danh sách
5. [ ] **EXPECTED:** Số Pending Approvals phải tăng

---

## Tổng kết Test Results

### Test 1: Admin-created trips
- [ ] ✅ PASS - Trip không xuất hiện trong Pending Actions
- [ ] ❌ FAIL - Trip vẫn xuất hiện (CHÚ Ý: Cần fix thêm!)

### Test 2: Admin Statistics Navigation
- [ ] ✅ PASS - Tất cả 8 cards navigate đúng
- [ ] ❌ FAIL - Card nào không work: _______________

### Test 3: User Statistics Navigation
- [ ] ✅ PASS - Tất cả 4 cards navigate đúng
- [ ] ❌ FAIL - Card nào không work: _______________

### Test 4: User-created trips
- [ ] ✅ PASS - Trip xuất hiện trong Pending Actions
- [ ] ❌ FAIL - Trip không xuất hiện (CHÚ Ý: Cần fix!)

---

## Debugging

### Nếu Test 1 FAIL (Admin-created trip vẫn xuất hiện):
1. Kiểm tra database:
```sql
SELECT id, user_name, status, created_by_admin, auto_approved
FROM trips
WHERE departure_location = 'Hanoi'
AND destination = 'Danang'
ORDER BY created_at DESC LIMIT 1;
```

2. Expected values:
   - `created_by_admin` = 1 hoặc true
   - `status` = 'approved' hoặc 'auto_approved'
   - `auto_approved` = 1 hoặc true

### Nếu Navigation FAIL (refresh về home):
1. Mở Developer Console (F12)
2. Click vào card
3. Xem Console errors
4. Chụp lại error message

---

## Next Steps (nếu có lỗi)

Nếu bất kỳ test nào FAIL, vui lòng:
1. ✅ Check lại console log
2. ✅ Check database values
3. ✅ Báo lại cho tôi chi tiết test nào fail và error message
