# 🔧 Hướng dẫn Kết nối MySQL Server Mới

## 📋 Checklist Thông Tin Cần Có

Trước khi bắt đầu, chuẩn bị các thông tin sau:

- [ ] **DB_HOST**: IP hoặc hostname của MySQL server (VD: `192.168.1.100` hoặc `mysql.company.com`)
- [ ] **DB_PORT**: Port (mặc định `3306`)
- [ ] **DB_USER**: Username để connect (VD: `tripsmgm-user`)
- [ ] **DB_PASSWORD**: Password
- [ ] **DB_NAME**: Tên database (VD: `trips_management`)

---

## 🚀 Các Bước Thực Hiện

### **Bước 1: Backup Configuration Hiện Tại**

```bash
# Backup file .env.production
cp .env.production .env.production.backup.$(date +%Y%m%d)

echo "✓ Backup created"
```

---

### **Bước 2: Cập Nhật Thông Tin MySQL**

#### **Option A: Sửa trực tiếp bằng Text Editor**

```bash
# Mở file với editor bạn thích
notepad .env.production
# hoặc
code .env.production
# hoặc
vim .env.production
```

Tìm và thay đổi các dòng:

```env
# MySQL Database Configuration
DB_HOST=your_new_mysql_host          # ← Thay đổi
DB_PORT=3306                          # ← Thay đổi nếu cần
DB_USER=your_new_username            # ← Thay đổi
DB_PASSWORD=your_new_password        # ← Thay đổi
DB_NAME=your_new_database_name       # ← Thay đổi
```

Save file và đóng editor.

#### **Option B: Sử dụng Command Line (Nhanh hơn)**

```bash
# Thay YOUR_VALUE bằng giá trị thực tế
export NEW_HOST="vnicc-lxwb001vh.isrk.local"
export NEW_PORT="3306"
export NEW_USER="tripsmgm-rndus2"
export NEW_PASSWORD="your_password_here"
export NEW_DATABASE="tripsmgm_mydb001"

# Cập nhật file
sed -i "s/^DB_HOST=.*/DB_HOST=$NEW_HOST/" .env.production
sed -i "s/^DB_PORT=.*/DB_PORT=$NEW_PORT/" .env.production
sed -i "s/^DB_USER=.*/DB_USER=$NEW_USER/" .env.production
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$NEW_PASSWORD/" .env.production
sed -i "s/^DB_NAME=.*/DB_NAME=$NEW_DATABASE/" .env.production

echo "✓ Configuration updated"
```

---

### **Bước 3: Test MySQL Connection**

```bash
# Test connection
node test-mysql-connection.js
```

**Kết quả mong đợi:**

```
Testing MySQL connection...

Configuration:
  Host: vnicc-lxwb001vh.isrk.local
  Port: 3306
  User: tripsmgm-rndus2
  Password: ***hidden***
  Database: tripsmgm_mydb001

Attempting to connect...
✓ Connected successfully!

Running test query...
✓ Query result: 2

Checking database tables...
⚠️  Database is empty (no tables found)
   You need to run database initialization

✓ MySQL connection test PASSED
```

---

### **Bước 4: Khởi Tạo Database (Nếu chưa có tables)**

Nếu database mới hoặc rỗng, chạy script khởi tạo:

```bash
# Make script executable (Linux/Mac)
chmod +x init-new-db.sh

# Run initialization
./init-new-db.sh
```

**Hoặc chạy manual:**

```bash
# Load env variables
source .env.production

# Run SQL script
mysql -h "$DB_HOST" \
      -P "$DB_PORT" \
      -u "$DB_USER" \
      -p"$DB_PASSWORD" \
      "$DB_NAME" < init-db.sql

# Verify tables created
mysql -h "$DB_HOST" \
      -P "$DB_PORT" \
      -u "$DB_USER" \
      -p"$DB_PASSWORD" \
      "$DB_NAME" \
      -e "SHOW TABLES;"
```

**Kết quả mong đợi:**

```
+--------------------------------+
| Tables_in_tripsmgm_mydb001    |
+--------------------------------+
| join_requests                  |
| optimization_groups            |
| trips                          |
+--------------------------------+
```

---

### **Bước 5: Build và Restart Application**

```bash
# 1. Build application
npm run build

# 2. Restart production server
npm run pm2:restart:production

# 3. Check status
pm2 status

# 4. View logs
pm2 logs trips-management-system --lines 50
```

---

### **Bước 6: Verify Application**

1. **Mở browser**: http://trip.intersnack.com.vn
2. **Login** với admin account
3. **Check dashboard** - should load without errors
4. **Register a test trip** - should save successfully

---

## 🔍 Troubleshooting

### **Lỗi: ECONNREFUSED (Connection refused)**

```
❌ Error: connect ECONNREFUSED 192.168.1.100:3306
```

**Nguyên nhân & Giải pháp:**

1. **MySQL server chưa chạy**
   ```bash
   # Check MySQL status (trên server MySQL)
   sudo systemctl status mysql
   # hoặc
   sudo service mysql status

   # Start MySQL nếu stopped
   sudo systemctl start mysql
   ```

2. **Firewall đang block port 3306**
   ```bash
   # Check firewall (trên server MySQL)
   sudo ufw status

   # Allow port 3306 nếu bị block
   sudo ufw allow 3306/tcp
   ```

3. **MySQL không bind đúng IP**
   ```bash
   # Check MySQL bind address (trên server MySQL)
   cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep bind-address

   # Nếu thấy: bind-address = 127.0.0.1
   # Thay thành: bind-address = 0.0.0.0 (hoặc IP cụ thể)
   # Sau đó restart MySQL:
   sudo systemctl restart mysql
   ```

---

### **Lỗi: ER_ACCESS_DENIED_ERROR (Access denied)**

```
❌ Error: ER_ACCESS_DENIED_ERROR:
   Access denied for user 'username'@'hostname'
```

**Giải pháp:**

1. **Kiểm tra username/password**
   ```bash
   # Test login trực tiếp
   mysql -h YOUR_HOST -u YOUR_USER -p
   ```

2. **Grant permissions (trên server MySQL)**
   ```sql
   -- Connect as root
   mysql -u root -p

   -- Create user nếu chưa có
   CREATE USER 'tripsmgm-user'@'%'
   IDENTIFIED BY 'your_password';

   -- Grant permissions
   GRANT ALL PRIVILEGES ON tripsmgm_mydb001.*
   TO 'tripsmgm-user'@'%';

   FLUSH PRIVILEGES;

   -- Verify
   SHOW GRANTS FOR 'tripsmgm-user'@'%';
   ```

---

### **Lỗi: ER_BAD_DB_ERROR (Database doesn't exist)**

```
❌ Error: ER_BAD_DB_ERROR:
   Unknown database 'tripsmgm_mydb001'
```

**Giải pháp:**

```sql
-- Connect as root
mysql -u root -p

-- Create database
CREATE DATABASE tripsmgm_mydb001
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Verify
SHOW DATABASES;
```

---

### **Lỗi: Application không connect được**

**Check logs:**

```bash
# PM2 logs
pm2 logs trips-management-system --lines 100

# Tìm errors
pm2 logs trips-management-system --err --lines 50
```

**Common issues:**

1. **Forgot to restart after changing .env**
   ```bash
   npm run pm2:restart:production
   ```

2. **Cache issue**
   ```bash
   # Clear Next.js cache
   rm -rf .next

   # Rebuild
   npm run build
   npm run pm2:restart:production
   ```

3. **Environment variables not loaded**
   ```bash
   # Check if PM2 loaded correct env file
   pm2 describe trips-management-system | grep env

   # Update PM2 with new env
   pm2 delete trips-management-system
   npm run pm2:start:production
   ```

---

## 📊 Health Check Checklist

After setup, verify everything works:

- [ ] MySQL connection successful (`node test-mysql-connection.js`)
- [ ] Tables created (3 tables: trips, join_requests, optimization_groups)
- [ ] Application builds without errors (`npm run build`)
- [ ] PM2 shows app running (`pm2 status`)
- [ ] Web interface loads (http://trip.intersnack.com.vn)
- [ ] Can login with admin account
- [ ] Can register a test trip
- [ ] Data persists in MySQL

---

## 🆘 Quick Commands Reference

```bash
# Test connection
node test-mysql-connection.js

# Initialize database
./init-new-db.sh

# Check current config
cat .env.production | grep DB_

# Build and restart
npm run build && npm run pm2:restart:production

# View logs
pm2 logs trips-management-system

# Check MySQL tables
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES;"

# Count records
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SELECT
  (SELECT COUNT(*) FROM trips) as total_trips,
  (SELECT COUNT(*) FROM join_requests) as total_requests,
  (SELECT COUNT(*) FROM optimization_groups) as total_groups;
"
```

---

## 📞 Support

Nếu gặp vấn đề không giải quyết được:

1. Check logs: `pm2 logs trips-management-system --lines 200 > error.log`
2. Test connection: `node test-mysql-connection.js > connection-test.log`
3. Share error logs để được hỗ trợ

---

**Good luck! 🚀**
