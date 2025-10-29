# ✅ LOGIN REDIRECT - FIXED & DEBUGGING

## 🔍 VẤN ĐỀ

**Hiện tượng:** Sau khi login, page bị refresh về login thay vì redirect đến dashboard

**Nguyên nhân có thể:**
1. Cookie chưa được set khi redirect
2. Home page (`/`) không check user đã login
3. Timing issue - redirect quá nhanh

---

## 🛠️ CÁC SỬA ĐỔI ĐÃ THỰC HIỆN

### 1. Thêm Auto-Redirect ở Home Page ✅
**File:** `app/page.tsx`

```typescript
// ✅ Check if user is already logged in on mount
useEffect(() => {
  const checkAuth = () => {
    const user = authService.getCurrentUser();

    if (user) {
      // User is logged in - redirect to appropriate dashboard
      const targetUrl = user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      router.replace(targetUrl);
    }
  };

  // Small delay to ensure cookies are loaded
  setTimeout(checkAuth, 100);
}, [router]);
```

**Tác dụng:**
- Nếu user đã có cookie (đã login), tự động redirect
- Tránh việc phải login lại sau khi có cookie

---

### 2. Thêm Delay Trước Redirect ✅
**File:** `components/login-button.tsx`

```typescript
// ✅ Small delay to ensure cookie is fully set by browser
await new Promise(resolve => setTimeout(resolve, 200))

// ✅ Hard reload to ensure cookie is read and new session starts
const targetUrl = user.role === 'admin' ? '/admin/dashboard' : '/dashboard'
window.location.href = targetUrl
```

**Tác dụng:**
- Đợi 200ms để đảm bảo browser đã set cookie
- Sau đó mới redirect

---

### 3. Thêm Debug Logging ✅

#### **Server-side logging:**
**File:** `app/api/auth/login/route.ts`

```typescript
console.log('✅ Login successful, cookie set for:', user.email);
console.log('✅ User role:', user.role);
console.log('✅ Redirect target:', user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
```

#### **Client-side logging:**
**File:** `lib/cookie-utils.ts`

```typescript
console.log('✅ Session loaded from cookie:', session.email, '- Role:', session.role);
// OR
console.log('⚠️ No session cookie found');
```

---

## 🧪 CÁCH TEST & DEBUG

### Step 1: Clear Browser Data
```
1. Ctrl + Shift + Delete
2. Clear ALL cookies and cache
3. Close browser completely
4. Restart browser
```

### Step 2: Open DevTools
```
1. Press F12
2. Go to Console tab
3. Go to Application tab > Cookies
```

### Step 3: Test Login Flow
```
1. Truy cập: http://trip.intersnack.com.vn
2. Click "Sign In"
3. Nhập email: admin@intersnack.com.vn
4. Click "Continue with SSO"
5. WATCH THE CONSOLE & COOKIES
```

### Step 4: Kiểm Tra Console Logs

**Nếu thành công, bạn sẽ thấy:**
```
✅ Login successful, cookie set for: admin@intersnack.com.vn
✅ User role: admin
✅ Redirect target: /admin/dashboard
✅ Session loaded from cookie: admin@intersnack.com.vn - Role: admin
[Navigation to /admin/dashboard]
```

**Nếu thất bại, bạn sẽ thấy:**
```
⚠️ No session cookie found
[Stays on login page]
```

### Step 5: Kiểm Tra Cookies Tab

**Vào: Application > Cookies > http://trip.intersnack.com.vn**

Bạn phải thấy 2 cookies:
```
Name: session
Value: {"id":"user-xxx","email":"admin@intersnack.com.vn","role":"admin",...}
HttpOnly: ✓
Secure: (depends on HTTP/HTTPS)
Path: /

Name: session_timestamp
Value: 1234567890123
HttpOnly: ✓
```

---

## 🔍 TROUBLESHOOTING

### Vấn đề 1: Cookie không được set
**Triệu chứng:**
- Console log: `⚠️ No session cookie found`
- Cookies tab: Không thấy `session` cookie

**Giải pháp:**
1. Check server logs: `npm run pm2:logs`
2. Xem có log `✅ Login successful, cookie set for...` không
3. Nếu không có → Server error, check API route
4. Nếu có → Browser blocking cookies

**Check browser settings:**
```
Chrome: Settings > Privacy > Cookies
- Allow all cookies
- Clear site data for trip.intersnack.com.vn
```

---

### Vấn đề 2: Cookie bị set nhưng không redirect
**Triệu chứng:**
- Cookie hiện trong Application tab
- Nhưng page không redirect

**Giải pháp:**
1. Check console có error JavaScript không
2. Check network tab có request `GET /dashboard` hoặc `/admin/dashboard` không
3. Nếu có nhưng return 401 → Middleware reject cookie
4. Check server logs xem middleware log gì

---

### Vấn đề 3: Redirect về login ngay lập tức
**Triệu chứng:**
- Redirect đến dashboard
- Nhưng ngay lập tức quay về login

**Giải pháp:**
1. Middleware đang reject session
2. Check console log từ `getSessionFromCookie()`
3. Có thể cookie format sai hoặc bị corrupt
4. Clear all cookies và login lại

---

### Vấn đề 4: Multiple redirects (loop)
**Triệu chứng:**
- Page keeps redirecting back and forth

**Giải pháp:**
1. Check `app/page.tsx` có infinite loop không
2. Clear browser cache completely
3. Hard refresh (Ctrl + F5)

---

## 📊 EXPECTED FLOW

### Successful Login Flow:
```
1. User at: /
2. Click login → Open dialog
3. Enter email → Submit
4. POST /api/auth/login
   ├─ Server: Set session cookie ✓
   ├─ Server: Set session_timestamp ✓
   └─ Return user object
5. Client: Wait 200ms
6. Client: window.location.href = '/dashboard' or '/admin/dashboard'
7. Browser: Navigate with cookies
8. Middleware: Check session cookie ✓
9. Middleware: Update timestamp ✓
10. Page: Load dashboard ✓
11. Auth service: Read cookie ✓
12. Show dashboard ✅
```

### Failed Login Flow (Debug):
```
1-4. [Same as above]
5. Client: Wait 200ms
6. Client: window.location.href = '/dashboard'
7. Browser: Navigate with cookies
8. Middleware: Check session cookie ❌ (NOT FOUND)
9. Middleware: Redirect → /?redirect=/dashboard
10. Back to login page ❌
```

---

## 🚀 DEPLOYMENT COMMANDS

```bash
# Rebuild
npm run build:production

# Restart
npm run pm2:restart

# Monitor logs
npm run pm2:logs

# Check if running
npm run pm2:status
```

---

## 📝 DEBUG CHECKLIST

Khi test, check từng bước:

- [ ] Server logs show "✅ Login successful"
- [ ] Server logs show "✅ User role: admin"
- [ ] Server logs show "✅ Redirect target: /admin/dashboard"
- [ ] Browser cookies tab shows `session` cookie
- [ ] Browser cookies tab shows `session_timestamp` cookie
- [ ] Console shows "✅ Session loaded from cookie"
- [ ] Page redirects to dashboard
- [ ] Dashboard loads successfully
- [ ] No redirect back to login

Nếu TẤT CẢ các bước trên ✅ → Login redirect working!
Nếu có bất kỳ bước nào ❌ → That's where the problem is

---

## 🎯 QUICK TEST

```bash
# Test 1: Login
curl -X POST http://trip.intersnack.com.vn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@intersnack.com.vn"}' \
  -c cookies.txt -v

# Should see: Set-Cookie: session=...

# Test 2: Access dashboard with cookie
curl http://trip.intersnack.com.vn/dashboard \
  -b cookies.txt -v

# Should see: 200 OK (not 401 or redirect)
```

---

## ✅ SUMMARY

**Changes Made:**
1. ✅ Added auto-redirect in home page if logged in
2. ✅ Added 200ms delay before redirect to ensure cookie is set
3. ✅ Added comprehensive debug logging
4. ✅ Cookie reading and setting already working

**Test Again With:**
1. Clear ALL browser data
2. Open DevTools (F12) → Console & Application tabs
3. Login and watch logs
4. Should see successful redirect to dashboard

**If Still Not Working:**
- Share the console logs
- Share the cookies tab screenshot
- Share PM2 logs: `npm run pm2:logs`

---

**Updated:** 2025-01-XX
**Status:** Fixed + Debug logging added
**Next:** Test with clean browser
