# Hướng Dẫn Deploy Production - Trips Management System

## Tổng Quan Các Thay Đổi

### 1. Cấu Hình URLs Production
- **NEXT_PUBLIC_APP_URL**: Đã cập nhật từ `http://localhost:50001` thành `http://trip.intersnack.com.vn`
- **NEXTAUTH_URL**: Đã cập nhật từ `http://localhost:50001` thành `http://trip.intersnack.com.vn`

### 2. Session Management & Auto-Logout
- **Session Timeout**: 30 phút không hoạt động
- **Warning**: Hiển thị cảnh báo 2 phút trước khi hết hạn
- **Persistent Sessions**: Session được lưu và kiểm tra liên tục
- **Activity Tracking**: Tự động theo dõi hoạt động của user (mouse, keyboard, scroll)

### 3. Database Connection Optimization
- **Connection Limit**: Tăng từ 10 lên 20
- **Queue Limit**: Thay đổi từ 0 thành 10 (queue thay vì reject)
- **Timeout Settings**: 20 giây cho connect và acquire
- **Keep-Alive**: Enabled với 10 giây delay
- **Idle Timeout**: 60 giây

### 4. PM2 Configuration
- **Exec Mode**: Đổi từ `cluster` sang `fork` để tránh vấn đề với database pool
- **Stability**: Cải thiện độ ổn định khi nhiều users truy cập

### 5. Next.js Optimization
- **React Strict Mode**: Enabled
- **Compression**: Enabled
- **Security Headers**: Tối ưu hóa
- **Image Optimization**: Modern formats (AVIF, WebP)

---

## Các Bước Deploy Lên Production Server

### Bước 1: Chuẩn Bị

#### 1.1. Kiểm tra file .env.production
```bash
# Mở file .env.production và xác nhận các settings sau:

NEXT_PUBLIC_APP_URL=http://trip.intersnack.com.vn
NEXTAUTH_URL=http://trip.intersnack.com.vn
DB_HOST=vnicc-lxdb001vh.isrk.local
DB_PORT=3306
DB_USER=tripsmgm_rndus1
DB_PASSWORD=Z2drRklW3ehr
DB_NAME=tripsmgm_mydb001
SESSION_MAX_AGE=1800
SESSION_UPDATE_AGE=300
```

#### 1.2. Test Database Connection
Từ production server, test xem có thể kết nối đến database không:

**Windows:**
```cmd
telnet vnicc-lxdb001vh.isrk.local 3306
```

**Hoặc dùng MySQL client:**
```cmd
mysql -h vnicc-lxdb001vh.isrk.local -P 3306 -u tripsmgm_rndus1 -p
```

**Nếu không kết nối được:**
- Kiểm tra firewall settings
- Xác nhận database server có cho phép connections từ production server không
- Có thể cần thay `DB_HOST` bằng IP address thay vì hostname

---

### Bước 2: Build Application

#### 2.1. Chạy build script
```cmd
.\build-production.bat
```

Hoặc manual:
```cmd
npm install
npm run build:production
```

#### 2.2. Kiểm tra build thành công
- Build folder `.next` phải được tạo
- Không có errors trong console
- File size hợp lý (không quá lớn)

---

### Bước 3: Deploy Lên Server

#### 3.1. Copy files lên production server
Copy toàn bộ project folder lên server, bao gồm:
- `.next/` folder (sau khi build)
- `node_modules/` folder
- `public/` folder
- `.env.production` file
- `package.json`
- `next.config.js`
- `ecosystem.config.js`
- Tất cả source code

#### 3.2. Trên production server, cài đặt PM2 (nếu chưa có)
```cmd
npm install -g pm2
```

---

### Bước 4: Start Application

#### 4.1. Start với PM2
```cmd
npm run pm2:start
```

Hoặc trực tiếp:
```cmd
pm2 start ecosystem.config.js --env production
```

#### 4.2. Kiểm tra status
```cmd
pm2 status
npm run pm2:status
```

#### 4.3. Monitor logs
```cmd
pm2 logs trips-management-system
# Hoặc
npm run pm2:logs
```

---

### Bước 5: Verify Deployment

#### 5.1. Kiểm tra server đang chạy
```cmd
pm2 list
```

Expected output:
```
┌─────┬──────────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name                     │ mode        │ ↺      │ status  │ cpu      │
├─────┼──────────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ trips-management-system  │ fork        │ 0       │ online  │ 0%       │
└─────┴──────────────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

#### 5.2. Test application
1. Mở browser và truy cập: `http://trip.intersnack.com.vn`
2. Login với email `admin@intersnack.com.vn`
3. Kiểm tra các chức năng:
   - Login/Logout
   - Tạo trip mới
   - View trips list
   - Admin dashboard (nếu là admin)

#### 5.3. Test session timeout
1. Login vào hệ thống
2. Không thao tác trong 28 phút
3. Sau 28 phút sẽ có popup cảnh báo "Session Expiring Soon"
4. Click "Stay Logged In" để extend session
5. Hoặc không làm gì → tự động logout sau 30 phút

---

### Bước 6: Monitoring & Maintenance

#### 6.1. Monitor logs real-time
```cmd
pm2 logs trips-management-system --lines 100
```

#### 6.2. Monitor system resources
```cmd
pm2 monit
```

#### 6.3. Restart nếu cần
```cmd
npm run pm2:restart
# Hoặc
pm2 restart trips-management-system
```

#### 6.4. Stop application
```cmd
npm run pm2:stop
# Hoặc
pm2 stop trips-management-system
```

---

## Troubleshooting

### Vấn Đề 1: Load chậm / Timeout

**Nguyên nhân:**
- URL config sai (vẫn trỏ về localhost)
- Database connection timeout
- Network issues

**Giải pháp:**
1. Kiểm tra `.env.production` có đúng URL không
2. Test database connection từ server
3. Kiểm tra logs: `pm2 logs`
4. Restart application: `pm2 restart trips-management-system`

### Vấn Đề 2: Mất dữ liệu / Database errors

**Nguyên nhân:**
- Database connection không stable
- Connection pool exhausted
- Database server down

**Giải pháp:**
1. Kiểm tra database server có đang chạy không
2. Verify credentials trong `.env.production`
3. Kiểm tra logs có lỗi MySQL không
4. Restart database connection bằng cách restart app

### Vấn Đề 3: Session không hoạt động

**Nguyên nhân:**
- Cookie settings sai
- Session secret không đúng
- Middleware không được apply

**Giải pháp:**
1. Clear browser cookies
2. Kiểm tra `NEXTAUTH_SECRET` trong `.env.production`
3. Verify URL trong browser matches `NEXTAUTH_URL`
4. Hard refresh browser (Ctrl+F5)

### Vấn Đề 4: Auto-logout không hoạt động

**Nguyên nhân:**
- SessionMonitor component chưa được add
- Environment variables chưa được set

**Giải pháp:**
1. Verify `SESSION_MAX_AGE=1800` trong `.env.production`
2. Check browser console có errors không
3. Restart application

---

## Performance Optimization Tips

### 1. Database
- Monitor connection pool usage
- Optimize queries nếu có slow queries
- Consider adding indexes

### 2. Application
- Enable CDN nếu có
- Use HTTPS thay vì HTTP (recommended)
- Monitor memory usage với `pm2 monit`

### 3. Network
- Check network latency giữa app server và database server
- Consider moving app server gần database server hơn
- Use connection pooling effectively

---

## Security Best Practices

### 1. HTTPS
Strongly recommended chuyển sang HTTPS:
```env
NEXT_PUBLIC_APP_URL=https://trip.intersnack.com.vn
NEXTAUTH_URL=https://trip.intersnack.com.vn
```

Sau đó uncomment trong `.env.production`:
```env
FORCE_SECURE_COOKIE=true
```

### 2. Firewall
- Chỉ mở port 50001 cho traffic cần thiết
- Block direct database access từ internet
- Use VPN hoặc private network cho database connection

### 3. Backups
- Setup regular database backups
- Backup `.env.production` file securely
- Document recovery procedures

---

## Contacts & Support

**Technical Issues:**
- Check logs: `pm2 logs trips-management-system`
- Review this guide
- Check Next.js documentation

**Database Issues:**
- Contact database administrator
- Verify network connectivity
- Check database server logs

---

## Checklist Deploy Production

- [ ] File `.env.production` có đúng URLs (`http://trip.intersnack.com.vn`)
- [ ] Database connection đã được test thành công
- [ ] Application đã được build (`npm run build:production`)
- [ ] PM2 đã được cài đặt trên server
- [ ] Application đã start thành công (`pm2 start`)
- [ ] Login/Logout hoạt động bình thường
- [ ] Session timeout (30 phút) hoạt động đúng
- [ ] Logs không có critical errors
- [ ] Performance acceptable (load time < 3 giây)
- [ ] Tất cả users có thể truy cập bình thường

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0
**Production URL:** http://trip.intersnack.com.vn
