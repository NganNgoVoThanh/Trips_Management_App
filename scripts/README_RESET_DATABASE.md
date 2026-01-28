# Database Reset Scripts for Testing

Các script để xóa dữ liệu database trước khi test end-to-end.

## 📋 Scripts có sẵn

### 1. Check Database Records
Kiểm tra số lượng records hiện tại trong database.

```bash
node check-database-records.js
```

**Output mẫu:**
```
📊 Current Database Records:

users                     : 15 records
trips                     : 42 records
join_requests             : 8 records
approval_audit_log        : 125 records
admin_override_log        : 3 records
manager_confirmations     : 2 records
optimization_groups       : 5 records
azure_ad_users_cache      : 150 records
```

### 2. Reset Database (Node.js Script)
Xóa toàn bộ dữ liệu users và trips, giữ lại configuration data.

**Cách dùng:**

```bash
# Reset database (không backup)
node scripts/reset-database-for-testing.js

# Reset database VÀ tạo backup trước
node scripts/reset-database-for-testing.js --with-backup

# Reset database NHƯNG giữ lại admin accounts
node scripts/reset-database-for-testing.js --keep-admin

# Cả hai options
node scripts/reset-database-for-testing.js --with-backup --keep-admin
```

**Tính năng:**
- ✅ Xóa toàn bộ users, trips và related data
- ✅ Giữ lại locations, vehicles, và config tables
- ✅ Tự động tạo backup (nếu dùng `--with-backup`)
- ✅ Có thể giữ lại admin accounts (nếu dùng `--keep-admin`)
- ✅ Show before/after counts
- ✅ 3 giây delay để có thể cancel
- ✅ Safe: Disable foreign key checks khi xóa

**Backup files:**
Backup sẽ được lưu tại: `backups/backup-YYYY-MM-DD-HH-MM-SS.sql`

### 3. Reset Database (SQL Script)
Dùng raw SQL để reset database.

```bash
# Method 1: Via mysql CLI
mysql -u username -p database_name < sql/RESET_DATABASE_FOR_TESTING.sql

# Method 2: Interactive
mysql -u username -p
> USE database_name;
> SOURCE sql/RESET_DATABASE_FOR_TESTING.sql;
```

**Lưu ý:** Mặc định sẽ xóa TẤT CẢ users (kể cả admin). Để giữ admin, edit file SQL và uncomment dòng này:

```sql
-- DELETE FROM users WHERE role = 'user';
```

và comment dòng này:

```sql
DELETE FROM users;
```

## 🎯 Khi nào dùng?

### Before End-to-End Testing
Khi bạn muốn test toàn bộ flow từ đầu:
1. User signup → profile setup
2. Create trips → approval workflow
3. Join requests → optimization
4. Admin functions → reporting

### After Demo/Presentation
Xóa test data sau khi demo cho client/team.

### Before Production Deployment
Clean up test data trên staging environment trước khi promote lên production.

## ⚠️ Warnings

### 🚫 KHÔNG BAO GIỜ chạy trên Production!

Các script này sẽ XÓA DỮ LIỆU! Chỉ dùng trên:
- ✅ Local development (localhost)
- ✅ Development server
- ✅ Staging server
- ❌ KHÔNG dùng trên Production!

### Kiểm tra Database trước khi chạy

```bash
# Verify bạn đang connect đúng database
node check-database-records.js
```

### Backup trước khi xóa (Recommended)

Luôn dùng `--with-backup` flag khi chạy script:

```bash
node scripts/reset-database-for-testing.js --with-backup
```

## 📦 Restore từ Backup

Nếu bạn đã tạo backup và muốn restore:

```bash
# Tìm backup file
ls -lt backups/

# Restore
mysql -u username -p database_name < backups/backup-2025-01-28-10-30-45.sql
```

## 🔄 Workflow End-to-End Testing

### Complete Testing Flow:

```bash
# 1. Check current state
node check-database-records.js

# 2. Create backup and reset
node scripts/reset-database-for-testing.js --with-backup --keep-admin

# 3. Verify clean state
node check-database-records.js

# 4. Start testing
npm run dev

# 5. Test scenarios:
#    - First user signup and profile setup
#    - Create trip → manager approval
#    - Join request workflow
#    - Admin approval/rejection
#    - Optimization grouping
#    - Email notifications

# 6. If needed, restore backup
# mysql -u username -p database_name < backups/backup-YYYY-MM-DD-HH-MM-SS.sql
```

## 🗂️ What Gets Deleted vs Preserved

### ❌ DELETED:
- `users` - All user accounts (or only regular users if `--keep-admin`)
- `trips` - All trips
- `join_requests` - All join requests
- `approval_audit_log` - All approval logs
- `admin_override_log` - All override logs
- `manager_confirmations` - All pending confirmations
- `optimization_groups` - All optimization groups
- `azure_ad_users_cache` - Azure AD cache (optional)

### ✅ PRESERVED:
- `locations` - App locations (HCM, Phan Thiet, Long An, Tay Ninh)
- `vehicles` - Vehicle configuration
- `admin_audit_log` - Admin action logs (if exists)
- `pending_admin_assignments` - Pending admin requests (if exists)
- `temp_trips` - Temporary/optimization trips (if exists)
- Stored procedures
- Indexes and constraints

## 🛠️ Troubleshooting

### Error: Cannot delete parent row (foreign key constraint)

Script tự động disable foreign key checks, nhưng nếu vẫn lỗi:

```sql
SET FOREIGN_KEY_CHECKS = 0;
-- Run delete commands
SET FOREIGN_KEY_CHECKS = 1;
```

### Error: Access denied

Đảm bảo user có quyền DELETE:

```sql
GRANT DELETE ON database_name.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

### Script không xóa một số tables

Một số tables có thể chưa tồn tại trong database cũ. Script sẽ skip và show warning, đây là bình thường.

## 📝 NPM Scripts (Optional)

Bạn có thể thêm vào `package.json`:

```json
{
  "scripts": {
    "db:check": "node check-database-records.js",
    "db:reset": "node scripts/reset-database-for-testing.js --with-backup",
    "db:reset:keep-admin": "node scripts/reset-database-for-testing.js --with-backup --keep-admin"
  }
}
```

Sau đó chạy:

```bash
npm run db:check
npm run db:reset
npm run db:reset:keep-admin
```

## 🔐 Security Notes

- Backup files chứa sensitive data → add `backups/` vào `.gitignore`
- Không commit backup files lên git
- Không share backup files qua public channels
- Delete old backups định kỳ

## 📞 Support

Nếu gặp vấn đề:
1. Check database connection trong `.env`
2. Verify MySQL service đang chạy
3. Check user permissions
4. Review error logs
