# 🔐 HƯỚNG DẪN CLONE HỆ THỐNG LOGIN

Hướng dẫn chi tiết để clone toàn bộ hệ thống authentication/login sang ứng dụng Next.js khác.

---

## 📋 CHECKLIST FILES CẦN COPY

### 1️⃣ COMPONENTS (Frontend)

```
📁 components/
├── auth-provider.tsx          ✅ REQUIRED - Route protection + useAuth hook
├── login-button.tsx           ✅ REQUIRED - Login UI dialog
├── logout-button.tsx          ✅ REQUIRED - Logout button
├── session-monitor.tsx        ✅ REQUIRED - Session timeout monitor
└── app-initializer.tsx        ⚠️  OPTIONAL - App initialization (if needed)
```

### 2️⃣ LIB (Services & Utilities)

```
📁 lib/
├── auth-service.ts           ✅ REQUIRED - Core authentication service
├── auth-helpers.ts           ✅ REQUIRED - Cookie management for API
├── cookie-utils.ts           ✅ REQUIRED - Client-side cookie utilities
├── config.ts                 ⚠️  CUSTOMIZE - Company config (domain, admin emails)
└── server-auth.ts           ⚠️  OPTIONAL - Server-side auth helpers (alternative)
```

### 3️⃣ API ROUTES (Backend)

```
📁 app/api/auth/
├── login/
│   └── route.ts              ✅ REQUIRED - POST /api/auth/login
├── logout/
│   └── route.ts              ✅ REQUIRED - POST /api/auth/logout
└── fabric-token/
    └── route.ts              ❌ SKIP - Specific to this app
```

### 4️⃣ MIDDLEWARE (Route Protection)

```
📁 root/
└── middleware.ts             ✅ REQUIRED - Session validation, timeout, RBAC
```

### 5️⃣ UI COMPONENTS (Dependencies)

```
📁 components/ui/
├── button.tsx                ✅ REQUIRED - Shadcn/ui button
├── dialog.tsx                ✅ REQUIRED - Shadcn/ui dialog
├── input.tsx                 ✅ REQUIRED - Shadcn/ui input
├── label.tsx                 ✅ REQUIRED - Shadcn/ui label
├── alert-dialog.tsx          ✅ REQUIRED - Shadcn/ui alert dialog
└── use-toast.tsx             ✅ REQUIRED - Shadcn/ui toast
```

---

## 📦 DEPENDENCIES

### Package.json - Thêm các dependencies sau:

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "lucide-react": "^0.263.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-toast": "^1.1.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### Install command:

```bash
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-alert-dialog @radix-ui/react-toast class-variance-authority clsx tailwind-merge
```

---

## 🛠️ CẤU TRÚC THỨ MỤC TARGET APP

Tạo cấu trúc thư mục như sau trong app mới:

```
your-new-app/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/
│   │       │   └── route.ts
│   │       └── logout/
│   │           └── route.ts
│   ├── dashboard/
│   │   └── page.tsx         (protected route)
│   ├── admin/
│   │   └── dashboard/
│   │       └── page.tsx     (admin-only route)
│   ├── layout.tsx
│   └── page.tsx             (landing page with LoginButton)
├── components/
│   ├── ui/                  (Shadcn components)
│   ├── auth-provider.tsx
│   ├── login-button.tsx
│   ├── logout-button.tsx
│   └── session-monitor.tsx
├── lib/
│   ├── auth-service.ts
│   ├── auth-helpers.ts
│   ├── cookie-utils.ts
│   ├── config.ts
│   └── utils.ts             (cn() helper for Shadcn)
├── middleware.ts
├── .env.local
└── package.json
```

---

## ⚙️ CONFIGURATION STEPS

### STEP 1: Customize `lib/config.ts`

**Thay đổi những phần sau:**

```typescript
// lib/config.ts
export const config = {
  // ✏️ THAY ĐỔI: Company domain của bạn
  companyDomain: '@your-company.com',  // ← CHANGE THIS

  // ✏️ THAY ĐỔI: Danh sách admin emails
  adminEmails: [
    'admin@your-company.com',           // ← CHANGE THIS
    'manager@your-company.com',         // ← CHANGE THIS
    'operations@your-company.com',      // ← CHANGE THIS
  ],

  // Các config khác của app (locations, vehicles, etc.)
  // Xóa hoặc thay đổi theo nhu cầu app mới
};
```

### STEP 2: Update `lib/auth-service.ts`

**Tìm và thay đổi admin emails (line 16-20):**

```typescript
// lib/auth-service.ts
const ADMIN_EMAILS = [
  'admin@your-company.com',      // ← CHANGE THIS
  'manager@your-company.com',    // ← CHANGE THIS
  'operations@your-company.com', // ← CHANGE THIS
];
```

### STEP 3: Update `components/login-button.tsx`

**Tùy chỉnh branding (line 106-112):**

```typescript
// components/login-button.tsx
<Image
  src="/your-logo.png"         // ← CHANGE THIS
  alt="Your Company"
  width={80}
  height={40}
  className="object-contain"
/>

// Line 115
Use your Company email to sign in to Your App Name.
```

**Placeholder text (line 124):**

```typescript
placeholder="your.name@your-company.com"  // ← CHANGE THIS
```

**Domain hint (line 131):**

```typescript
Must use @your-company.com email address  // ← CHANGE THIS
```

### STEP 4: Setup Environment Variables

**Tạo file `.env.local`:**

```bash
# Session Configuration
SESSION_MAX_AGE=1800                    # 30 minutes in seconds
SESSION_UPDATE_AGE=300                  # Update every 5 minutes
NEXT_PUBLIC_SESSION_MAX_AGE=1800        # For client-side monitor

# Cookie Security (optional - auto-detects HTTP/HTTPS)
# FORCE_SECURE_COOKIE=false             # Set to false for HTTP development

# Node Environment
NODE_ENV=development                    # or production
```

### STEP 5: Update `middleware.ts`

**Review protected paths và admin paths:**

```typescript
// middleware.ts

// Line 10-15: Public API paths (no auth needed)
const publicApiPaths = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',        // ← Add your public APIs
  '/api/init'           // ← Add your public APIs
];

// Line 18-23: Admin-only API paths
const adminApiPaths = [
  '/api/admin/users',   // ← Add your admin APIs
  '/api/admin/reports', // ← Add your admin APIs
];

// Line 26: Admin-only page paths
const adminPagePaths = ['/admin'];  // ← Customize if needed
```

### STEP 6: Setup Landing Page

**Trong `app/page.tsx`:**

```typescript
import { LoginButton } from '@/components/login-button';
import { authService } from '@/lib/auth-service';
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Server-side redirect if already logged in
  const user = authService.getCurrentUser();

  if (user) {
    redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Welcome to Your App</h1>
        <p className="text-muted-foreground">
          Sign in to access your dashboard
        </p>
        <LoginButton size="lg" />
      </div>
    </div>
  );
}
```

### STEP 7: Setup Protected Layouts

**Trong `app/dashboard/layout.tsx`:**

```typescript
import { AuthProvider } from '@/components/auth-provider';
import { SessionMonitor } from '@/components/session-monitor';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SessionMonitor />
      {children}
    </AuthProvider>
  );
}
```

**Trong `app/admin/dashboard/layout.tsx`:**

```typescript
import { AuthProvider } from '@/components/auth-provider';
import { SessionMonitor } from '@/components/session-monitor';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SessionMonitor />
      {children}
    </AuthProvider>
  );
}
```

### STEP 8: Add Logo Image

**Copy logo vào `public/`:**

```
public/
└── your-logo.png    ← Your company logo (80x40px recommended)
```

---

## 🎨 SHADCN/UI SETUP

Nếu app mới chưa có Shadcn/ui, cần setup:

### 1. Install Shadcn CLI

```bash
npx shadcn-ui@latest init
```

### 2. Add required components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add toast
```

### 3. Ensure `lib/utils.ts` exists

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 🚀 MIGRATION CHECKLIST

### Pre-Migration

- [ ] Backup current app
- [ ] Review current auth system (if any)
- [ ] Plan data migration for users (if any)

### File Copy

- [ ] Copy all required component files
- [ ] Copy all lib files
- [ ] Copy API route files
- [ ] Copy middleware.ts
- [ ] Copy UI components (if not using Shadcn)

### Configuration

- [ ] Update `lib/config.ts` with company domain
- [ ] Update admin emails in config
- [ ] Update admin emails in auth-service.ts
- [ ] Customize login-button.tsx branding
- [ ] Setup .env.local file
- [ ] Review middleware protected paths
- [ ] Add company logo to public/

### Dependencies

- [ ] Install NPM packages
- [ ] Setup Shadcn/ui (if needed)
- [ ] Verify all imports resolve

### Integration

- [ ] Setup landing page with LoginButton
- [ ] Setup dashboard layout with AuthProvider
- [ ] Setup admin layout with AuthProvider
- [ ] Add SessionMonitor to layouts
- [ ] Update any existing protected routes

### Testing

- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test session timeout (30 min)
- [ ] Test session warning (2 min before)
- [ ] Test admin access control
- [ ] Test user access control
- [ ] Test protected route redirects
- [ ] Test cookie persistence
- [ ] Test invalid email domain
- [ ] Test browser refresh (session persist)

### Deployment

- [ ] Set production environment variables
- [ ] Enable HTTPS (for secure cookies)
- [ ] Test on staging environment
- [ ] Review security headers
- [ ] Setup error monitoring
- [ ] Deploy to production

---

## 🔍 IMPORTANT NOTES

### 1. Company Domain Validation

**Tìm và thay đổi TẤT CẢ references đến `@intersnack.com.vn`:**

```bash
# Search in project
grep -r "@intersnack.com.vn" .

# Files to check:
- lib/config.ts
- lib/auth-service.ts
- components/login-button.tsx
- app/api/auth/login/route.ts
```

### 2. Admin Emails

**Admin emails xuất hiện ở 2 nơi (phải sync):**

```typescript
// lib/config.ts - Line 7-11
adminEmails: [...]

// lib/auth-service.ts - Line 16-20
const ADMIN_EMAILS = [...]
```

**⚠️ IMPORTANT:** Đảm bảo 2 lists này GIỐNG NHAU!

### 3. Session Timeout

**Có 3 nơi định nghĩa SESSION_MAX_AGE:**

```typescript
// middleware.ts - Line 6
const SESSION_MAX_AGE = 1800

// components/session-monitor.tsx - Line 17
const SESSION_MAX_AGE = 1800

// .env.local
SESSION_MAX_AGE=1800
NEXT_PUBLIC_SESSION_MAX_AGE=1800
```

**⚠️ IMPORTANT:** Đảm bảo tất cả đều cùng giá trị!

### 4. Protected Routes

**Review và customize các routes sau:**

```typescript
// middleware.ts
- publicApiPaths      → APIs không cần login
- adminApiPaths       → APIs chỉ admin
- adminPagePaths      → Pages chỉ admin
```

### 5. Cookie Security

**Development (HTTP):**
- Cookies work với `secure: false` (auto-detect)
- No HTTPS required

**Production (HTTPS):**
- Must use HTTPS
- Cookies auto-set `secure: true`
- Won't work on HTTP in production

### 6. FNV-1a Hash

**User IDs are generated from email using FNV-1a hash:**

```typescript
john.doe@company.com → user-3fa4c9b1
```

**Benefits:**
- Same email = same ID always
- No database needed
- Collision-resistant

**⚠️ WARNING:** If you change the hash algorithm, all user IDs will change!

### 7. Department Auto-Detection

**Review `getDepartmentFromEmail()` in auth-service.ts:**

```typescript
// lib/auth-service.ts - Line 143-167
```

Customize keywords based on your company structure.

---

## 🧪 TESTING GUIDE

### 1. Login Testing

```bash
# Test valid email
✅ admin@your-company.com → Login success → /admin/dashboard

# Test user email
✅ john.doe@your-company.com → Login success → /dashboard

# Test invalid domain
❌ user@gmail.com → Error: "Please use company email"

# Test empty email
❌ "" → Browser validation error
```

### 2. Session Testing

```bash
# Test session persistence
1. Login
2. Refresh page → Should stay logged in
3. Close tab, reopen → Should stay logged in (30 min)

# Test session timeout
1. Login
2. Wait 28 minutes (no activity)
3. Warning dialog appears → Click "Stay Logged In"
4. Session extended

# Test auto-logout
1. Login
2. Wait 30 minutes (no activity)
3. Auto-logout → Redirect to /?session=expired
```

### 3. Role Testing

```bash
# Test admin access
✅ Admin email → Can access /admin/dashboard
✅ Admin email → Can access /dashboard
✅ Admin email → Can call /api/admin/*

# Test user access
✅ User email → Can access /dashboard
❌ User email → Redirect from /admin/dashboard to /dashboard
❌ User email → 403 from /api/admin/*

# Test middleware protection
❌ Not logged in → Redirect from /dashboard to /
❌ Not logged in → 401 from /api/protected
```

### 4. Cookie Testing

```bash
# Check cookies in DevTools (Application tab)
✅ session (HttpOnly) - Contains user object
✅ user_info (Readable) - Contains user data
✅ session_timestamp (HttpOnly) - Contains timestamp

# Test logout
1. Login → Cookies set
2. Logout → All cookies cleared
3. Try to access /dashboard → Redirect to /
```

---

## 🐛 TROUBLESHOOTING

### Issue: "User not authenticated" after login

**Cause:** Cookie not set or not sent with requests

**Solutions:**
1. Check `credentials: 'include'` in fetch calls
2. Verify cookies in DevTools
3. Check HTTPS/HTTP mismatch (secure flag)
4. Check `sameSite` attribute

### Issue: Session expires immediately

**Cause:** SESSION_MAX_AGE mismatch or cookie not updating

**Solutions:**
1. Verify SESSION_MAX_AGE in all 3 places
2. Check session_timestamp is being updated
3. Review middleware timestamp update logic (line 131-154)

### Issue: Admin redirect to /dashboard

**Cause:** Role not properly set or admin email not in list

**Solutions:**
1. Check admin emails in config.ts
2. Check admin emails in auth-service.ts
3. Verify email matches exactly (case-sensitive)
4. Check console logs for role assignment

### Issue: Cannot read cookies in client

**Cause:** Reading HttpOnly cookie

**Solutions:**
1. Use `user_info` cookie (not `session`)
2. `session` is HttpOnly - only server can read
3. Use `getSessionFromCookie()` from cookie-utils.ts

### Issue: "Invalid session" error

**Cause:** Cookie parsing failed or malformed data

**Solutions:**
1. Clear all cookies
2. Login again
3. Check cookie value in DevTools (should be valid JSON)
4. Review auth-service.ts login logic

---

## 📚 API REFERENCE

### useAuth() Hook

```typescript
const { user, login, logout, isAuthenticated, isAdmin } = useAuth();

// user: User | null
// login: (email: string) => Promise<User>
// logout: () => Promise<void>
// isAuthenticated: boolean
// isAdmin: boolean
```

### authService Methods

```typescript
// Login
authService.loginWithSSO(email: string, password?: string): Promise<User>

// Logout
authService.logout(): Promise<void>

// Get current user
authService.getCurrentUser(): User | null

// Check authentication
authService.isAuthenticated(): boolean

// Check admin
authService.isAdmin(): boolean

// Check permission
authService.hasPermission(action: string): boolean
```

### API Helpers

```typescript
// In API routes
import { requireAuth, requireAdmin } from '@/lib/auth-helpers';

// Get authenticated user (throws if not auth)
const user = requireAuth(request);

// Get admin user (throws if not admin)
const admin = requireAdmin(request);
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. Always validate on server

```typescript
// ❌ BAD - Client-side only
if (user?.role === 'admin') {
  // Show admin UI
}

// ✅ GOOD - Server-side validation
export async function GET(request: NextRequest) {
  const user = requireAdmin(request); // Throws if not admin
  // Process admin request
}
```

### 2. Never trust client data

```typescript
// ❌ BAD
const userId = request.headers.get('x-user-id'); // Can be spoofed

// ✅ GOOD
const user = getUserFromRequest(request); // Validated by middleware
```

### 3. Use HTTPS in production

```bash
# .env.production
NODE_ENV=production
# Cookies will auto-set secure=true on HTTPS
```

### 4. Set strong CSP headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

---

## 📞 SUPPORT

### Common Questions

**Q: Can I use a database instead of FNV-1a hash?**
A: Yes! Modify `auth-service.ts` to fetch user from DB instead of generating ID.

**Q: Can I integrate with real SSO (SAML, OAuth)?**
A: Yes! Modify `/api/auth/login` to call your SSO provider instead of mock authentication.

**Q: Can I change session timeout?**
A: Yes! Update SESSION_MAX_AGE in middleware.ts, session-monitor.tsx, and .env.local.

**Q: Can I use JWT instead of session cookies?**
A: Yes, but requires significant refactoring. Current system is simpler for most use cases.

**Q: Can I add more roles (not just admin/user)?**
A: Yes! Update User interface and role checks in middleware and auth-service.

---

## ✅ FINAL CHECKLIST

Before going live:

- [ ] All admin emails updated
- [ ] Company domain updated everywhere
- [ ] Logo added and displaying
- [ ] All tests passing
- [ ] Session timeout working
- [ ] HTTPS enabled in production
- [ ] Environment variables set
- [ ] Error monitoring setup
- [ ] Security headers configured
- [ ] Rate limiting added (recommended)
- [ ] Audit logging added (recommended)

---

## 📝 VERSION HISTORY

- v1.0 - Initial migration guide
- Created for: Trips Management App
- Next.js: 14.x
- React: 18.x

---

**Good luck with your migration! 🚀**
