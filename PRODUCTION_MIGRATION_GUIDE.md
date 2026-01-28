# Production Migration Guide

## Vấn đề hiện tại

API `/api/profile/setup` trả về **500 Internal Server Error** khi users setup profile trên production server.

**Nguyên nhân:** Production database thiếu các columns và tables mà code đang sử dụng.

---

## Giải pháp - Chạy Migration trên Production

### Bước 1: SSH vào Production Server

```bash
ssh user@trip.intersnack.com.vn
# hoặc sử dụng credentials production server của bạn
```

### Bước 2: Upload Migration File

Upload file `sql/PRODUCTION_MIGRATION_COMPLETE.sql` lên server:

**Option A: Sử dụng SCP**
```bash
scp sql/PRODUCTION_MIGRATION_COMPLETE.sql user@trip.intersnack.com.vn:/path/to/migrations/
```

**Option B: Sử dụng FTP/SFTP client** (FileZilla, WinSCP, etc.)

**Option C: Copy-paste nội dung** vào server qua text editor

### Bước 3: Backup Database (QUAN TRỌNG!)

Trước khi chạy migration, **BẮT BUỘC** backup database:

```bash
mysqldump -u root -p trips_management > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### Bước 4: Chạy Migration

```bash
mysql -u root -p trips_management < PRODUCTION_MIGRATION_COMPLETE.sql
```

Nhập password khi được yêu cầu.

### Bước 5: Verify Migration

Chạy file check để verify:

```bash
mysql -u root -p trips_management < CHECK_PRODUCTION_DATABASE.sql
```

Kết quả mong đợi:
```
admin_type              | ✅ EXISTS
admin_location_id       | ✅ EXISTS
admin_assigned_at       | ✅ EXISTS
admin_assigned_by       | ✅ EXISTS
vehicle_number          | ✅ EXISTS
driver_name             | ✅ EXISTS
locations               | ✅ EXISTS
temp_trips              | ✅ EXISTS
pending_admin_assignments | ✅ EXISTS
admin_audit_log         | ✅ EXISTS
sp_grant_admin_role     | ✅ EXISTS
sp_revoke_admin_role    | ✅ EXISTS
```

---

## Migration bao gồm:

### 1. **Tạo 4 tables mới:**
   - `locations` - Danh sách địa điểm (HCM Office, 3 factories)
   - `temp_trips` - Trips tạm cho optimization workflow
   - `pending_admin_assignments` - Yêu cầu phân quyền admin chờ duyệt
   - `admin_audit_log` - Log các thao tác admin

### 2. **Thêm columns vào users table:**
   - `admin_type` ENUM('admin', 'super_admin', 'location_admin')
   - `admin_location_id` VARCHAR(255) - Location admin được phân công
   - `admin_assigned_at` TIMESTAMP - Thời điểm được phân quyền
   - `admin_assigned_by` VARCHAR(255) - Người phân quyền

### 3. **Thêm columns vào vehicles table:**
   - `vehicle_number` VARCHAR(50)
   - `vehicle_type` VARCHAR(50)
   - `driver_name` VARCHAR(255)
   - `driver_phone` VARCHAR(20)

### 4. **Stored procedures:**
   - `sp_grant_admin_role` - Gán quyền admin cho user
   - `sp_revoke_admin_role` - Thu hồi quyền admin

### 5. **Insert 4 locations:**
   - `hcm-office` - Ho Chi Minh Office
   - `phan-thiet-factory` - Phan Thiet Factory
   - `long-an-factory` - Long An Factory
   - `tay-ninh-factory` - Tay Ninh Factory

### 6. **Performance indexes:**
   - Composite indexes cho trips, temp_trips, join_requests tables

---

## Sau khi Migration thành công

### 1. Test Profile Setup

Truy cập: https://trip.intersnack.com.vn/setup

Điền thông tin profile và submit. Nếu thành công → redirect về `/dashboard` không có lỗi 500.

### 2. Restart Application (nếu cần)

Nếu dùng PM2:
```bash
pm2 restart trips-app
```

Nếu dùng Docker:
```bash
docker-compose restart
```

### 3. Check Logs

```bash
# PM2 logs
pm2 logs trips-app

# Docker logs
docker-compose logs -f
```

---

## Rollback (Nếu có vấn đề)

Nếu gặp lỗi sau migration, restore từ backup:

```bash
mysql -u root -p trips_management < backup_before_migration_YYYYMMDD_HHMMSS.sql
```

---

## Files liên quan

- `sql/PRODUCTION_MIGRATION_COMPLETE.sql` - Migration script chính (CHẠY FILE NÀY)
- `sql/CHECK_PRODUCTION_DATABASE.sql` - Script verify database sau migration
- `sql/FIX_ALL_ADMIN_ISSUES.sql` - Fix admin issues (đã include trong COMPLETE)
- `sql/CHECK_LOCATIONS.sql` - Check locations trong database

---

## Support

Nếu gặp vấn đề trong quá trình migration:

1. **Kiểm tra error logs** của MySQL
2. **Check database permissions** - User cần quyền CREATE, ALTER, DROP
3. **Verify database connection** từ application code
4. **Check environment variables** trên production server (.env file)

---

## Checklist

- [ ] Đã backup database
- [ ] Upload migration file lên server
- [ ] Chạy migration script thành công
- [ ] Verify migration với CHECK script
- [ ] Test profile setup trên web
- [ ] Restart application
- [ ] Monitor logs không có lỗi
