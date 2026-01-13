# 🔄 Database Migration Guide - Trip Status Cleanup

## Vấn đề hiện tại

Database đang có trips với **old statuses** không còn hợp lệ:
- `draft`
- `pending`
- `pending_optimization`
- `proposed`
- `confirmed`

Các status này gây lỗi: `Data truncated for column 'status' at row 1`

## Giải pháp Migration

### ⚠️ LƯU Ý QUAN TRỌNG

`DEFAULT 'pending_approval'` trong ALTER TABLE chỉ áp dụng cho:
- **NEW records** khi INSERT mà không chỉ định status
- **KHÔNG** thay đổi existing records

Existing records sẽ **GIỮ NGUYÊN** giá trị hiện tại!

---

## 📋 Các bước thực hiện

### Bước 1: Backup database (KHUYẾN NGHỊ)

```bash
mysqldump -u root -p trips_management > backup_before_migration.sql
```

### Bước 2: Chạy migration script

**Option A: Qua SQL file**
```bash
mysql -u root -p trips_management < sql/migrate-trip-statuses.sql
```

**Option B: Qua MySQL CLI**
```sql
-- Connect to database
USE trips_management;

-- Update old statuses (mapping logic)
UPDATE trips SET status = 'approved' WHERE status = 'pending_optimization';
UPDATE trips SET status = 'approved' WHERE status = 'proposed';
UPDATE trips SET status = 'pending_approval' WHERE status = 'draft';
UPDATE trips SET status = 'pending_approval' WHERE status = 'pending';
UPDATE trips SET status = 'approved' WHERE status = 'confirmed';

-- Verify changes
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;

-- Update ENUM (removes old values, DEFAULT only for new inserts)
ALTER TABLE trips
MODIFY COLUMN status ENUM(
  'pending_approval',
  'pending_urgent',
  'auto_approved',
  'approved',
  'approved_solo',
  'optimized',
  'rejected',
  'cancelled',
  'expired'
) DEFAULT 'pending_approval';

-- Verify no old statuses remain
SELECT COUNT(*) as old_statuses_count
FROM trips
WHERE status IN ('draft', 'pending', 'pending_optimization', 'proposed', 'confirmed');
-- Should return 0
```

### Bước 3: Restart application

```bash
npm run dev
```

---

## 🎯 Status Mapping Logic

| Old Status | New Status | Lý do |
|-----------|-----------|-------|
| `draft` | `pending_approval` | Trip đang soạn thảo → Chờ approval |
| `pending` | `pending_approval` | Legacy pending → Standardize |
| `pending_optimization` | `approved` | Đã được approve, chờ optimize → Keep as approved |
| `proposed` | `approved` | Optimization proposal → Keep trip as approved |
| `confirmed` | `approved` | Legacy confirmed → Standardize |

---

## ✅ Verification

Sau khi migration, check:

### 1. Database status distribution
```sql
SELECT status, COUNT(*) as count
FROM trips
GROUP BY status
ORDER BY count DESC;
```

**Expected result**: Chỉ thấy 9 statuses mới:
- `pending_approval`
- `pending_urgent`
- `auto_approved`
- `approved`
- `approved_solo`
- `optimized`
- `rejected`
- `cancelled`
- `expired`

### 2. No old statuses
```sql
SELECT COUNT(*) FROM trips
WHERE status NOT IN (
  'pending_approval', 'pending_urgent', 'auto_approved',
  'approved', 'approved_solo', 'optimized',
  'rejected', 'cancelled', 'expired'
);
```

**Expected result**: `0`

### 3. Test application
1. Login as admin
2. Go to `/admin/dashboard`
3. Should see stats without errors
4. Try "Run Optimization" → Should work without `Data truncated` error

---

## 🔧 Rollback (if needed)

If migration fails:

```bash
# Restore from backup
mysql -u root -p trips_management < backup_before_migration.sql

# Or revert ENUM manually
ALTER TABLE trips
MODIFY COLUMN status ENUM(
  'pending', 'confirmed', 'optimized', 'cancelled', 'draft',
  'approved', 'rejected',
  'pending_approval', 'pending_urgent', 'auto_approved', 'approved_solo',
  'pending_optimization', 'proposed', 'expired'
) DEFAULT 'pending';
```

---

## 📝 Post-Migration Checklist

- [ ] Database migration completed successfully
- [ ] Application restarted
- [ ] Admin can view dashboard without errors
- [ ] Can create new trips (should have `pending_approval` status)
- [ ] Can run optimization without `Data truncated` error
- [ ] Recent Optimizations section displays data (if any)
- [ ] Pending Actions section displays correctly

---

## 🆘 Troubleshooting

### Error: "Data truncated for column 'status'"
**Cause**: Database still has old ENUM values
**Fix**: Re-run ALTER TABLE command

### Error: Cannot update trips
**Cause**: Some trips still have old status values
**Fix**: Re-run UPDATE commands for those specific statuses

### Pending Actions showing wrong trips
**Cause**: Trips may have been updated with old statuses before migration
**Fix**: Check database and update manually if needed

---

## 📞 Support

Nếu có vấn đề, check:
1. MySQL error logs
2. Application console logs
3. Browser console (F12)
