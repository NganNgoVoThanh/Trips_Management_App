# Profile Setup 500 Error - Production Fix

## Vấn đề

Users không thể setup profile trên production (https://trip.intersnack.com.vn), nhận lỗi:
```
Failed to save profile: Error: Failed to save profile
/api/profile/setup: 500 Internal Server Error
```

## Nguyên nhân

1. **Email service chưa được config** trên production → Gửi manager confirmation email fail → API throw error 500
2. Service Worker và PWA manifest files (404) - không liên quan trực tiếp nhưng cần fix

## Giải pháp

### 1. Fix API để handle email error gracefully ✅ DONE

File: `app/api/profile/setup/route.ts`

**Thay đổi:**
- Wrap `sendManagerConfirmationEmail()` trong try-catch
- Nếu email fail, log warning nhưng KHÔNG fail API
- Thêm chi tiết error logging để debug

**Kết quả:**
- Profile vẫn được save vào database thành công
- Chỉ email notification bị skip nếu email service không hoạt động

### 2. Config email service trên production server

Kiểm tra file `.env.production` trên server có các biến sau:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@intersnack.com.vn

# App URL
NEXT_PUBLIC_APP_URL=https://trip.intersnack.com.vn
```

**Nếu chưa có:**
1. Đăng ký Resend account: https://resend.com
2. Verify domain: intersnack.com.vn
3. Lấy API key
4. Add vào `.env.production`

**Hoặc disable email tạm thời:**
- Email notification là optional
- Profile setup vẫn hoạt động mà không cần email
- Manager có thể approve manual qua admin panel

### 3. Fix PWA files (404 errors)

Errors:
```
sw.js: 404
manifest.json: 404
```

**Tạo file `public/manifest.json`:**
```json
{
  "name": "Trip Management System",
  "short_name": "TripMS",
  "description": "Intersnack Trip Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Tạo file `public/sw.js`:**
```javascript
// Simple service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Let browser handle all requests
});
```

**Hoặc disable PWA:**
- Remove service worker registration từ `app/layout.tsx`
- Xóa manifest link từ HTML head

## Deploy steps

1. **Build app với fix mới:**
   ```bash
   npm run build
   ```

2. **Copy build to production server:**
   ```bash
   # Sync .next folder và public folder
   rsync -avz .next/ user@server:/path/to/app/.next/
   rsync -avz public/ user@server:/path/to/app/public/
   ```

3. **Restart Next.js server:**
   ```bash
   pm2 restart trip-management
   # Hoặc
   systemctl restart trip-management
   ```

4. **Verify:**
   - Test profile setup với user khác (không phải ngan.ngo)
   - Check server logs: `pm2 logs trip-management`
   - Xem có email errors không (should be warnings, not fatal)

## Testing

1. **Test với user có manager:**
   - Đăng nhập bằng user mới
   - Setup profile, điền manager email
   - Submit → Should success ✅
   - Check server logs → Có thể có warning về email nhưng profile đã saved

2. **Test với CEO (no manager):**
   - Đăng nhập bằng CEO account
   - Setup profile, không điền manager
   - Submit → Should success ✅
   - Không có email warnings

3. **Verify database:**
   ```sql
   SELECT email, name, profile_completed, manager_email, pending_manager_email
   FROM users
   WHERE email = 'test@intersnack.com.vn';
   ```

## Monitoring

**Server logs sẽ hiển thị:**

✅ **Success:**
```
📝 Saving profile setup for user@intersnack.com.vn
✅ Profile saved, confirmation email sent to manager@intersnack.com.vn
```

⚠️  **Success with email warning:**
```
📝 Saving profile setup for user@intersnack.com.vn
⚠️  Failed to send confirmation email to manager@intersnack.com.vn: API key not configured
Email service may not be configured. Profile was saved successfully.
```

❌ **Failure (should not happen after fix):**
```
❌ Error in profile setup: [detailed error]
```

## Rollback plan

Nếu có vấn đề sau khi deploy:

1. **Revert code:**
   ```bash
   git revert HEAD
   npm run build
   # Deploy lại
   ```

2. **Hoặc restore previous build:**
   ```bash
   mv .next.backup .next
   pm2 restart trip-management
   ```

## Questions?

- Check server logs: `pm2 logs trip-management --lines 100`
- Check database: Run `scripts/check-users-table-columns.js`
- Test API directly: `curl https://trip.intersnack.com.vn/api/profile/setup`
