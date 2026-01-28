# How to Check Server Logs

## Nếu dùng PM2

```bash
# View all logs
pm2 logs

# View logs của specific app
pm2 logs trips-app

# View error logs only
pm2 logs --err

# View last 100 lines
pm2 logs --lines 100
```

## Nếu dùng Docker

```bash
# View all logs
docker-compose logs

# View specific service
docker-compose logs app

# Follow logs (real-time)
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

## Nếu dùng Next.js standalone

```bash
# Check console output
tail -f /var/log/trips-app.log

# Or check PM2 logs if running via PM2
pm2 logs
```

## Nếu dùng systemd

```bash
journalctl -u trips-app -f

# Last 100 lines
journalctl -u trips-app -n 100
```

## Tìm lỗi cụ thể khi save profile

1. Mở terminal và chạy:
   ```bash
   pm2 logs --lines 0
   # hoặc
   docker-compose logs -f app
   ```

2. Trên browser, thử save profile lại

3. Xem logs xuất hiện ngay lập tức - sẽ có error message chi tiết

4. Copy toàn bộ error message và gửi cho tôi

## Các lỗi thường gặp

### Lỗi "Unknown column 'admin_type'"
→ Migration chưa chạy trên production database

### Lỗi "Cannot connect to database"
→ Check .env file trên production server

### Lỗi "ECONNREFUSED"
→ MySQL service không chạy hoặc wrong host/port

### Lỗi "Access denied for user"
→ Wrong database credentials trong .env
