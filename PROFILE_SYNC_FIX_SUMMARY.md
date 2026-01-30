# Profile Setup 500 Error - Root Cause & Fix

## Vấn đề

Users (trừ ngan.ngo) không thể setup profile trên production, lỗi 500

## Root Cause ✅ CONFIRMED

**PRODUCTION SERVER CHƯA CÓ CODE TỰ ĐỘNG TẠO USER**

Database chỉ có 1 user (ngan.ngo). Users khác login SSO thành công nhưng KHÔNG được tạo database record → Setup profile fail vì getUserByEmail() return null.

## Fix

1. ✅ Enhanced error logging trong auth callbacks
2. ✅ Better error handling trong profile setup API  
3. ✅ Test scripts để verify

## Deploy Steps

```bash
# 1. Build
npm run build

# 2. Deploy
rsync -avz .next/ user@server:/path/to/app/.next/
rsync -avz lib/ user@server:/path/to/app/lib/
rsync -avz app/ user@server:/path/to/app/app/

# 3. Restart
pm2 restart trip-management

# 4. Monitor
pm2 logs trip-management --lines 100 | grep -E "(SSO|User record)"
```

## Testing

New users login → Should see in logs:
```
✅ User record created/updated for user@intersnack.com.vn
```

Then profile setup should work!

## Existing users đã login trước: Phải logout & login lại
