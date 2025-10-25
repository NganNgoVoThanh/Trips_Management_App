# Trip Management System - Production Deployment Guide

## Mục lục
1. [Tổng quan](#tổng-quan)
2. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
3. [Cấu hình môi trường](#cấu-hình-môi-trường)
4. [Hướng dẫn nhanh cho Windows](#hướng-dẫn-nhanh-cho-windows)
5. [Phương thức triển khai](#phương-thức-triển-khai)
   - [Option 1: PM2 (Khuyến nghị)](#option-1-pm2-khuyến-nghị)
   - [Option 2: Docker](#option-2-docker)
   - [Option 3: Standalone](#option-3-standalone)
6. [Bảo mật](#bảo-mật)
7. [Giám sát và Logs](#giám-sát-và-logs)
8. [Backup và Khôi phục](#backup-và-khôi-phục)
9. [Troubleshooting](#troubleshooting)

---

## Tổng quan

Trip Management System là ứng dụng quản lý chuyến đi công tác được xây dựng bằng Next.js 15 với các tính năng:
- Quản lý chuyến đi công tác
- Tối ưu hóa lộ trình bằng AI
- Quản lý yêu cầu tham gia
- Dashboard và báo cáo
- Xác thực người dùng

**Thông tin kỹ thuật:**
- Framework: Next.js 15.5.2
- Runtime: Node.js 18+
- Database: MySQL 8.0
- Port mặc định: 50001

---

## Yêu cầu hệ thống

### Phần cứng tối thiểu
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB SSD
- Network: 100Mbps

### Phần cứng khuyến nghị
- CPU: 4 cores
- RAM: 8GB
- Disk: 50GB SSD
- Network: 1Gbps

### Phần mềm
- Node.js: >= 18.0.0
- npm: >= 9.0.0
- MySQL: 8.0+ (sử dụng database hiện tại: vnicc-lxdb001vh.isrk.local)
- PM2: 5.0+ (nếu dùng PM2)
- Docker: 20.10+ và Docker Compose: 2.0+ (nếu dùng Docker)

---

## Cấu hình môi trường

### 1. File .env.production

File `.env.production` đã được tạo sẵn với cấu hình production. Cần cập nhật các giá trị sau:

```bash

# OpenAI API Key
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here

# Application Configuration
NEXT_PUBLIC_COMPANY_DOMAIN=@intersnack.com.vn

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://your-production-domain:50001

# Security - NextAuth (QUAN TRỌNG: Phải thay đổi)
NEXTAUTH_URL=http://your-production-domain:50001
NEXTAUTH_SECRET=your-secure-random-string-here

# MySQL Timezone Configuration
DB_TIMEZONE=+07:00
TZ=Asia/Ho_Chi_Minh

# Logging
LOG_LEVEL=error
```

### 2. Tạo NEXTAUTH_SECRET

Chạy lệnh sau để tạo secret ngẫu nhiên an toàn:

```bash
# Trên Linux/Mac
openssl rand -base64 32

# Trên Windows (PowerShell)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### 3. Cập nhật URL Production

Thay thế `http://your-production-domain:50001` bằng domain/IP thực tế của server:
- Ví dụ: `http://192.168.1.100:50001`
- Hoặc: `https://trips.intersnack.com.vn`

---

## Hướng dẫn nhanh cho Windows

### Cài đặt các package còn thiếu

Trước tiên, đảm bảo tất cả dependencies đã được cài đặt:

```powershell
# Cài đặt tất cả dependencies
npm install

# Cài đặt PM2 globally
npm install -g pm2
```

### Phương thức 1: Sử dụng Batch Scripts (Khuyến nghị cho Windows)

Các file `.bat` đã được tạo sẵn để dễ dàng quản lý:

#### Khởi động Production Server

```powershell
# Cách 1: Double-click vào file
start-production.bat

# Cách 2: Chạy từ PowerShell/CMD
.\start-production.bat
```

Script này sẽ tự động:
- Kiểm tra Node.js và PM2
- Kiểm tra file .env.production
- Cài đặt dependencies nếu cần
- Build ứng dụng nếu chưa build
- Khởi động với PM2

#### Dừng Production Server

```powershell
.\stop-production.bat
```

#### Restart Production Server

```powershell
.\restart-production.bat
```

### Phương thức 2: Sử dụng npm scripts

```powershell
# Build production
npm run build

# Khởi động với PM2
npm run pm2:start

# Xem logs
npm run pm2:logs

# Xem status
npm run pm2:status

# Restart
npm run pm2:restart

# Dừng
npm run pm2:stop
```

### Thiết lập Auto-Start khi Windows khởi động

Chạy PowerShell với quyền Administrator:

```powershell
# Right-click PowerShell -> Run as Administrator
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup-windows-startup.ps1
```

Script này sẽ tạo Windows Task Scheduler task để tự động khởi động app khi Windows boot.

### Kiểm tra ứng dụng đang chạy

```powershell
# Xem PM2 status
pm2 status

# Xem logs realtime
pm2 logs trips-management-system

# Hoặc dùng npm script
npm run pm2:logs
```

Truy cập: http://localhost:50001

### Lưu ý quan trọng cho Windows

1. **PM2 Startup trên Windows**:
   - PM2 không hỗ trợ lệnh `pm2 startup` trên Windows
   - Sử dụng `setup-windows-startup.ps1` để thiết lập auto-start
   - Hoặc tạo Windows Service bằng pm2-windows-service

2. **Environment Variables**:
   - Windows PowerShell không hỗ trợ `NODE_ENV=production` syntax
   - Đã cài đặt `cross-env` package để xử lý
   - Sử dụng `npm run build:prod` thay vì `npm run build:production`

3. **File Paths**:
   - Windows sử dụng backslash `\` nhưng Node.js hỗ trợ cả forward slash `/`
   - Không cần thay đổi code

---

## Phương thức triển khai

### Option 1: PM2 (Khuyến nghị)

PM2 là process manager cho Node.js, cho phép:
- Auto restart khi crash
- Load balancing
- Zero downtime reload
- Giám sát real-time
- Log management

#### Bước 1: Cài đặt PM2

```bash
npm install -g pm2
```

#### Bước 2: Build ứng dụng

```bash
# Đảm bảo đã cài đặt dependencies
npm install

# Build production
npm run build:production
```

#### Bước 3: Khởi động với PM2

```bash
# Khởi động ứng dụng
npm run pm2:start

# Hoặc dùng lệnh PM2 trực tiếp
pm2 start ecosystem.config.js
```

#### Bước 4: Kiểm tra trạng thái

```bash
# Xem danh sách processes
pm2 list

# Xem logs real-time
npm run pm2:logs

# Monitor CPU/Memory
npm run pm2:monit
```

#### Bước 5: Auto start khi reboot

```bash
# Lưu danh sách processes hiện tại
pm2 save

# Thiết lập auto start
pm2 startup

# Chạy lệnh mà PM2 gợi ý (thường cần sudo/admin)
```

#### Các lệnh PM2 hữu ích

```bash
# Restart ứng dụng
npm run pm2:restart

# Stop ứng dụng
npm run pm2:stop

# Xóa khỏi PM2
npm run pm2:delete

# Xem logs
npm run pm2:logs

# Zero downtime reload
pm2 reload ecosystem.config.js

# Reset logs
pm2 flush
```

---

### Option 2: Docker

Docker giúp đóng gói ứng dụng và dependencies vào container, đảm bảo môi trường nhất quán.

#### Bước 1: Cài đặt Docker

Tải và cài đặt Docker Desktop từ: https://www.docker.com/products/docker-desktop

#### Bước 2: Cập nhật .env.production

Đảm bảo file `.env.production` đã được cấu hình đúng.

#### Bước 3: Build Docker image

```bash
# Build image
npm run docker:build

# Hoặc dùng lệnh docker trực tiếp
docker build -t trips-management-system .
```

#### Bước 4: Chạy với Docker Compose

```bash
# Khởi động container
npm run docker:up

# Hoặc
docker-compose up -d
```

#### Bước 5: Kiểm tra trạng thái

```bash
# Xem logs
npm run docker:logs

# Kiểm tra container đang chạy
docker ps

# Kiểm tra health check
docker inspect trips_app | grep -A 10 Health
```

#### Bước 6: Dừng containers

```bash
# Dừng và xóa containers
npm run docker:down

# Dừng nhưng giữ volumes
docker-compose stop
```

#### Các lệnh Docker hữu ích

```bash
# Rebuild và restart
docker-compose up -d --build

# Xem logs của một service cụ thể
docker-compose logs -f app

# Vào trong container
docker exec -it trips_app sh

# Xóa tất cả (bao gồm volumes)
docker-compose down -v

# Xem resource usage
docker stats trips_app
```

---

### Option 3: Standalone

Chạy trực tiếp với Node.js, không dùng PM2 hay Docker.

#### Bước 1: Build ứng dụng

```bash
# Cài đặt dependencies production
npm ci --only=production

# Build
npm run build:production
```

#### Bước 2: Khởi động

```bash
# Khởi động production
npm run start:production

# Hoặc
NODE_ENV=production next start -p 50001 -H 0.0.0.0
```

#### Lưu ý với Standalone

- Không có auto restart khi crash
- Cần công cụ giám sát riêng
- Không có load balancing
- Không khuyến nghị cho production

---

## Bảo mật

### 1. Environment Variables

**QUAN TRỌNG:** Không bao giờ commit các file sau lên Git:
- `.env.production`
- `.env.local`
- Bất kỳ file chứa secrets

### 2. NEXTAUTH_SECRET

- Phải là chuỗi ngẫu nhiên, độ dài tối thiểu 32 ký tự
- Không được chia sẻ hoặc public
- Khác nhau giữa các môi trường (dev/staging/production)

### 3. Database Security

```bash
# Đảm bảo password mạnh
DB_PASSWORD=your-strong-password-here

# Chỉ cho phép kết nối từ IP/subnet cụ thể
# Cấu hình trong MySQL server
```

### 4. Network Security

```bash
# Sử dụng firewall để hạn chế access
# Chỉ mở port 50001 cho các IP cần thiết

# Windows Firewall
netsh advfirewall firewall add rule name="Trip Management" dir=in action=allow protocol=TCP localport=50001

# Linux (iptables)
iptables -A INPUT -p tcp --dport 50001 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 50001 -j DROP
```

### 5. HTTPS (Khuyến nghị)

Nên sử dụng reverse proxy như Nginx với SSL/TLS:

```nginx
server {
    listen 443 ssl http2;
    server_name trips.intersnack.com.vn;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:50001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Giám sát và Logs

### 1. PM2 Monitoring

```bash
# Real-time monitor
pm2 monit

# Web-based dashboard (PM2 Plus - optional)
pm2 link <secret_key> <public_key>
```

### 2. Logs

Logs được lưu tại:

**PM2:**
- Error logs: `./logs/pm2-error.log`
- Output logs: `./logs/pm2-out.log`
- Combined: `./logs/pm2-combined.log`

**Docker:**
- Container logs: `docker-compose logs app`
- Mounted logs: `./logs/` (nếu cấu hình)

**Xem logs:**

```bash
# PM2
pm2 logs trips-management-system

# Docker
docker-compose logs -f app

# Tail logs
tail -f logs/pm2-combined.log
```

### 3. Health Checks

Application cung cấp health check endpoint:

```bash
# Kiểm tra health
curl http://localhost:50001/api/health

# Kết quả mong đợi:
# {"status":"ok","timestamp":"2025-01-15T10:00:00.000Z"}
```

### 4. Monitoring Scripts

Tạo script giám sát tự động (Linux/Mac):

```bash
#!/bin/bash
# monitor.sh

while true; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:50001/api/health)

    if [ "$response" != "200" ]; then
        echo "$(date): Health check failed - Status: $response"
        # Gửi alert hoặc restart
        pm2 restart trips-management-system
    fi

    sleep 60
done
```

---

## Backup và Khôi phục

### 1. Backup Database

```bash
# Backup MySQL
mysqldump -h vnicc-lxdb001vh.isrk.local -u tripsmgm_rndus1 -p tripsmgm_mydb001 > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
mysql -h vnicc-lxdb001vh.isrk.local -u tripsmgm_rndus1 -p tripsmgm_mydb001 < backup_20250115_100000.sql
```

### 2. Backup Application

```bash
# Backup code và config
tar -czf trips-backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=logs \
    .

# Extract
tar -xzf trips-backup-20250115.tar.gz
```

### 3. Backup Schedule

Thiết lập backup tự động:

**Linux (crontab):**
```bash
# Edit crontab
crontab -e

# Thêm backup hàng ngày lúc 2:00 AM
0 2 * * * /path/to/backup-script.sh
```

**Windows (Task Scheduler):**
- Tạo scheduled task chạy backup script hàng ngày

---

## Troubleshooting

### 1. Ứng dụng không khởi động

**Kiểm tra:**
```bash
# Port đã được sử dụng?
netstat -ano | findstr :50001  # Windows
lsof -i :50001                 # Linux/Mac

# Kiểm tra logs
pm2 logs trips-management-system
docker-compose logs app

# Kiểm tra environment variables
pm2 env 0
```

**Giải pháp:**
- Kill process đang dùng port 50001
- Kiểm tra file .env.production
- Đảm bảo đã build: `npm run build`

### 2. Lỗi Database Connection

**Kiểm tra:**
```bash
# Test kết nối MySQL
mysql -h vnicc-lxdb001vh.isrk.local -u tripsmgm_rndus1 -p

# Kiểm tra network
ping vnicc-lxdb001vh.isrk.local
telnet vnicc-lxdb001vh.isrk.local 3306
```

**Giải pháp:**
- Kiểm tra credentials trong .env.production
- Đảm bảo MySQL server đang chạy
- Kiểm tra firewall/network rules

### 3. Out of Memory

**Kiểm tra:**
```bash
# PM2
pm2 monit

# Docker
docker stats trips_app

# System
free -m  # Linux
```

**Giải pháp:**
```bash
# Tăng memory limit cho PM2 (ecosystem.config.js)
max_memory_restart: '2G'

# Restart
pm2 restart trips-management-system
```

### 4. High CPU Usage

**Kiểm tra:**
```bash
# PM2
pm2 monit

# Process
top -p $(pgrep -f trips-management-system)
```

**Giải pháp:**
- Kiểm tra logs cho infinite loops
- Tối ưu hóa database queries
- Scale horizontal với PM2 cluster mode

### 5. Ứng dụng chậm

**Kiểm tra:**
```bash
# Network latency đến MySQL
ping vnicc-lxdb001vh.isrk.local

# Database performance
# Chạy EXPLAIN cho các queries chậm
```

**Giải pháp:**
- Enable database indexes
- Cache kết quả thường dùng
- Tối ưu hóa queries
- Tăng connection pool

### 6. PM2 không auto restart

**Giải pháp:**
```bash
# Xóa và setup lại
pm2 unstartup
pm2 startup

# Save lại processes
pm2 save

# Test reboot
sudo reboot
```

### 7. Docker container không healthy

**Kiểm tra:**
```bash
# Health check logs
docker inspect trips_app | grep -A 10 Health

# Container logs
docker logs trips_app
```

**Giải pháp:**
- Kiểm tra health check endpoint: `/api/health`
- Tăng `start_period` trong docker-compose.yml
- Kiểm tra port mapping

---

## Performance Tuning

### 1. Next.js Optimization

```javascript
// next.config.js đã được tối ưu với:
output: 'standalone'           // Giảm kích thước deployment
reactStrictMode: false         // Tránh double renders
serverExternalPackages: ['mysql2']  // Tối ưu server bundle
```

### 2. PM2 Cluster Mode

Để tận dụng multi-core CPU:

```javascript
// ecosystem.config.js
instances: 'max',  // Hoặc số cụ thể: 4
exec_mode: 'cluster',
```

### 3. Database Connection Pool

```javascript
// lib/db.ts (nếu cần tối ưu)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,  // Tăng nếu cần
  queueLimit: 0
});
```

---

## Checklist Deployment

### Trước khi Deploy

- [ ] Đã cập nhật `.env.production` với thông tin chính xác
- [ ] Đã tạo `NEXTAUTH_SECRET` ngẫu nhiên
- [ ] Đã test kết nối database
- [ ] Đã build thành công: `npm run build`
- [ ] Đã test ứng dụng local với production build
- [ ] Đã backup database hiện tại (nếu có)
- [ ] Đã kiểm tra disk space trên server
- [ ] Đã chuẩn bị rollback plan

### Sau khi Deploy

- [ ] Ứng dụng khởi động thành công
- [ ] Health check endpoint hoạt động: `/api/health`
- [ ] Có thể login vào hệ thống
- [ ] Database connections hoạt động
- [ ] Logs không có errors nghiêm trọng
- [ ] PM2/Docker process đang chạy stable
- [ ] Setup auto-restart/auto-start
- [ ] Configure monitoring và alerting
- [ ] Document các thông tin deployment

---

## Liên hệ và Hỗ trợ

Nếu gặp vấn đề trong quá trình deployment:

1. Kiểm tra logs: `pm2 logs` hoặc `docker-compose logs`
2. Review lại checklist deployment
3. Tham khảo section Troubleshooting
4. Liên hệ IT Team: Intersnack Vietnam IT Team

---

**Lưu ý:** Document này được tạo tự động. Vui lòng cập nhật theo nhu cầu thực tế của dự án.

**Phiên bản:** 1.0.0
**Ngày cập nhật:** 2025-01-15
