# Hướng dẫn Deploy Trips Management System

## Vấn đề: Lỗi 404 manifest.json

Nếu bạn gặp lỗi sau khi deploy lên server:
```
manifest.json:1 Failed to load resource: the server responded with a status of 404
```

## Nguyên nhân

Lỗi này xảy ra khi:
1. File `manifest.json` không được serve đúng cách từ server
2. Nginx configuration không proxy đúng các static files
3. Service Worker caching issues

## Giải pháp

### 1. Kiểm tra file tồn tại trên server

SSH vào server và kiểm tra:
```bash
cd /path/to/your/project
ls -la public/manifest.json
ls -la public/sw.js
```

Nếu không thấy, pull code mới:
```bash
git pull origin main
```

### 2. Build lại project

```bash
npm install
npm run build
```

### 3. Restart PM2

```bash
pm2 restart trips-management-system
```

### 4. Cấu hình Nginx (Nếu dùng Nginx)

Copy nội dung từ file `nginx.conf.example` vào Nginx config:

```bash
sudo nano /etc/nginx/sites-available/trip.intersnack.com.vn
```

Paste nội dung từ `nginx.conf.example` và điều chỉnh các đường dẫn:
- SSL certificate paths
- Project root directory

Test và reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Kiểm tra firewall

Đảm bảo port 50001 không bị chặn (nếu không dùng Nginx):
```bash
sudo ufw allow 50001
```

### 6. Test trên server

Sau khi deploy, kiểm tra các URL sau:
- https://trip.intersnack.com.vn/manifest.json
- https://trip.intersnack.com.vn/sw.js
- https://trip.intersnack.com.vn/logo1.png

Tất cả phải trả về 200 OK, không phải 404.

### 7. Clear browser cache

Sau khi fix:
1. Mở DevTools (F12)
2. Right-click Refresh button
3. Chọn "Empty Cache and Hard Reload"

Hoặc test bằng Incognito mode.

## Checklist Deploy

- [ ] Pull code mới từ git
- [ ] Chạy `npm install`
- [ ] Chạy `npm run build`
- [ ] Kiểm tra file `public/manifest.json` tồn tại
- [ ] Kiểm tra file `public/sw.js` tồn tại
- [ ] Update Nginx config (nếu dùng)
- [ ] Restart PM2: `pm2 restart trips-management-system`
- [ ] Test truy cập `/manifest.json` trực tiếp
- [ ] Test truy cập `/sw.js` trực tiếp
- [ ] Clear browser cache và test lại

## Troubleshooting

### Vẫn bị 404 sau khi deploy?

1. **Kiểm tra PM2 logs:**
```bash
pm2 logs trips-management-system
```

2. **Kiểm tra Nginx logs:**
```bash
sudo tail -f /var/log/nginx/trip.intersnack.com.vn.error.log
```

3. **Test trực tiếp qua port 50001 (bypass Nginx):**
```bash
curl http://localhost:50001/manifest.json
```

Nếu curl trả về nội dung file → vấn đề ở Nginx
Nếu curl trả về 404 → vấn đề ở Next.js/PM2

4. **Kiểm tra file permissions:**
```bash
chmod 644 public/manifest.json
chmod 644 public/sw.js
```

### Service Worker không update?

Service Worker có thể cache bản cũ. Force update:
1. Mở DevTools → Application → Service Workers
2. Click "Unregister" cho service worker cũ
3. Refresh trang
4. Service worker mới sẽ được register

## Production Deployment Commands

```bash
# On server
cd /path/to/trips-management-system
git pull origin main
npm install
npm run build
pm2 restart trips-management-system
pm2 save
```

## Monitoring

Sau khi deploy, monitor PM2:
```bash
pm2 monit
pm2 logs trips-management-system --lines 100
```

Kiểm tra status:
```bash
pm2 status
```

Nếu app bị crash, check logs để debug.
