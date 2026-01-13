# 🚨 EMERGENCY FIX GUIDE

## ĐỌC KỸ TRƯỚC KHI LÀM!

Bạn cần làm theo ĐÚNG THỨ TỰ dưới đây.

---

## 🔴 VẤN ĐỀ 1: Status chuyển thành Pending Approval

### Bước 1: Kiểm tra status hiện tại

Chạy trong MySQL:

```sql
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;
```

### Bước 2: Dựa vào kết quả để fix

**Nếu thấy tất cả trips đều là `pending_approval`:**

```sql
-- Fix: Set back to 'approved' for old trips
UPDATE trips
SET status = 'approved'
WHERE status = 'pending_approval'
  AND created_at < '2026-01-10 00:00:00';  -- Trips created before today

-- Verify
SELECT status, COUNT(*) FROM trips GROUP BY status;
```

**Nếu status OK (có approved, optimized, etc.):**
→ Skip, không cần fix gì

---

## 🔴 VẤN ĐỀ 2: Total Trips Double Counting

### Check trong MySQL:

```sql
-- Query 1: Check for duplicates
SELECT
    user_email,
    departure_location,
    destination,
    departure_date,
    COUNT(*) as count
FROM trips
GROUP BY user_email, departure_location, destination, departure_date
HAVING COUNT(*) > 1;
```

**Nếu có duplicates:**

```sql
-- Delete duplicates, keep only one
DELETE t1 FROM trips t1
INNER JOIN trips t2
WHERE t1.id > t2.id
  AND t1.user_email = t2.user_email
  AND t1.departure_location = t2.departure_location
  AND t1.destination = t2.destination
  AND t1.departure_date = t2.departure_date;

-- Verify
SELECT COUNT(*) as total_trips FROM trips;
```

**Nếu KHÔNG có duplicates:**
→ Vấn đề nằm ở UI, không phải database

---

## 🔴 VẤN ĐỀ 3: Statistics Navigation Không Hoạt Động

### Kiểm tra pages tồn tại:

**Admin pages cần có:**
- `/admin/statistics/total-trips/page.tsx`
- `/admin/statistics/total-savings/page.tsx`
- `/admin/statistics/optimization-rate/page.tsx`
- `/admin/statistics/active-employees/page.tsx`
- `/admin/statistics/this-month/page.tsx`
- `/admin/statistics/vehicle-utilization/page.tsx`

**User pages cần có:**
- `/dashboard/trips/page.tsx`
- `/dashboard/upcoming/page.tsx`
- `/dashboard/savings/page.tsx`

### Test navigation:

1. Mở browser console (F12)
2. Click vào statistics card
3. Check xem có error gì không
4. Check xem URL có change không

**Nếu URL không change:**
→ onClick bị block, cần debug

**Nếu URL change nhưng 404:**
→ Page không tồn tại, cần tạo

---

## 🔴 VẤN ĐỀ 4: Pending Actions & Recent Optimizations

### Pending Actions showing wrong trips:

**Check trong MySQL:**

```sql
-- Should show trips với status = 'pending_approval' or 'pending_urgent'
SELECT
    id,
    user_name,
    departure_location,
    destination,
    departure_date,
    status
FROM trips
WHERE status IN ('pending_approval', 'pending_urgent')
ORDER BY created_at DESC
LIMIT 5;
```

**Nếu không có trips pending:**
→ Pending Actions sẽ empty → ĐÚNG!

**Nếu có trips pending nhưng UI không hiển thị:**
→ Check browser console for errors

### Recent Optimizations empty:

**Nguyên nhân**: Không có trips với:
1. `status = 'optimized'` VÀ
2. `optimizedGroupId != NULL` VÀ `optimizedGroupId != ''`

**Check trong MySQL:**

```sql
SELECT
    id,
    status,
    optimizedGroupId,
    departure_location,
    destination
FROM trips
WHERE status = 'optimized'
  AND optimizedGroupId IS NOT NULL
  AND optimizedGroupId != ''
LIMIT 10;
```

**Nếu không có rows:**
→ Recent Optimizations PHẢI empty → ĐÚNG!

**Để có data hiển thị:**
1. Tạo trips với status `approved`
2. Run optimization
3. Approve optimization → Trips sẽ có `optimizedGroupId`
4. Recent Optimizations sẽ hiển thị

---

## ✅ CHECKLIST SAU KHI FIX

- [ ] Chạy: `SELECT status, COUNT(*) FROM trips GROUP BY status;`
  - Kết quả: Thấy `approved`, `optimized`, `pending_approval` (hợp lý)
  - KHÔNG thấy: `pending_optimization`, `proposed`, `draft`, `pending`, `confirmed`

- [ ] Chạy: `SELECT COUNT(*) FROM trips;`
  - So sánh với số hiển thị trên UI
  - Nếu khác nhau → Có duplicate hoặc UI bug

- [ ] Test navigation:
  - Admin: Click Total Trips → Go to `/admin/statistics/total-trips`
  - User: Click Total Trips → Go to `/dashboard/trips`

- [ ] Restart app:
  ```bash
  # Stop server (Ctrl+C)
  npm run dev
  ```

- [ ] Check dashboards:
  - Pending Actions: Chỉ show trips cần approval
  - Recent Optimizations: Show nếu có optimized trips

---

## 🆘 NẾU VẪN CÒN LỖI

**PASTE CHO TÔI:**

1. Kết quả query: `SELECT status, COUNT(*) FROM trips GROUP BY status;`
2. Kết quả query: `SELECT COUNT(*) FROM trips;`
3. Screenshot browser console (F12) khi click statistics card
4. Screenshot Pending Actions section
5. Screenshot Recent Optimizations section

TÔI SẼ DEBUG CHÍNH XÁC NGAY!
