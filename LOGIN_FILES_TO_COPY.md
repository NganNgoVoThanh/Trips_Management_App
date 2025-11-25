# 📋 DANH SÁCH FILE CẦN COPY - QUICK REFERENCE

## ✅ FILES CẦN COPY (REQUIRED)

### 1. COMPONENTS (7 files)

```bash
# Authentication Components
components/auth-provider.tsx         # Route protection + useAuth hook
components/login-button.tsx          # Login dialog UI
components/logout-button.tsx         # Logout button
components/session-monitor.tsx       # Session timeout warning

# UI Components (Shadcn/ui)
components/ui/button.tsx             # Button component
components/ui/dialog.tsx             # Dialog modal
components/ui/input.tsx              # Input field
components/ui/label.tsx              # Label component
components/ui/alert-dialog.tsx       # Alert dialog for warnings
components/ui/use-toast.tsx          # Toast notifications
```

### 2. LIB (4 files)

```bash
# Core Services
lib/auth-service.ts                  # Main authentication service (FNV-1a hash, role logic)
lib/auth-helpers.ts                  # Cookie management helpers for API routes
lib/cookie-utils.ts                  # Client-side cookie reading utilities
lib/config.ts                        # ⚠️ CUSTOMIZE: Company domain, admin emails

# Utilities
lib/utils.ts                         # cn() helper for Shadcn (if not exists)
```

### 3. API ROUTES (2 folders)

```bash
# Authentication Endpoints
app/api/auth/login/route.ts          # POST /api/auth/login
app/api/auth/logout/route.ts         # POST /api/auth/logout
```

### 4. MIDDLEWARE (1 file)

```bash
# Route Protection
middleware.ts                        # Session validation, timeout, RBAC
```

### 5. CONFIG FILES (2 files)

```bash
# Environment & TypeScript
.env.local                           # ⚠️ CREATE: Session config, environment vars
next.config.js                       # Next.js config (check if needs updates)
```

---

## 🎯 QUICK COPY COMMANDS

### Option A: Manual Copy (Recommended for review)

```bash
# From this project root, copy to your new project

# 1. Components
cp components/auth-provider.tsx /path/to/new-app/components/
cp components/login-button.tsx /path/to/new-app/components/
cp components/logout-button.tsx /path/to/new-app/components/
cp components/session-monitor.tsx /path/to/new-app/components/

# 2. UI Components (if needed)
cp -r components/ui /path/to/new-app/components/

# 3. Lib
cp lib/auth-service.ts /path/to/new-app/lib/
cp lib/auth-helpers.ts /path/to/new-app/lib/
cp lib/cookie-utils.ts /path/to/new-app/lib/
cp lib/config.ts /path/to/new-app/lib/  # ⚠️ Remember to customize!

# 4. API Routes
cp -r app/api/auth /path/to/new-app/app/api/

# 5. Middleware
cp middleware.ts /path/to/new-app/
```

### Option B: Zip Package (Quick deployment)

```bash
# Create a zip with all auth files
zip -r auth-system.zip \
  components/auth-provider.tsx \
  components/login-button.tsx \
  components/logout-button.tsx \
  components/session-monitor.tsx \
  components/ui/ \
  lib/auth-service.ts \
  lib/auth-helpers.ts \
  lib/cookie-utils.ts \
  lib/config.ts \
  app/api/auth/ \
  middleware.ts
```

---

## ⚙️ FILES TO CUSTOMIZE

### Priority 1: MUST CHANGE

```typescript
// lib/config.ts
companyDomain: '@intersnack.com.vn'     → '@your-company.com'

adminEmails: [
  'admin@intersnack.com.vn',            → 'admin@your-company.com'
  'manager@intersnack.com.vn',          → 'manager@your-company.com'
  'operations@intersnack.com.vn'        → 'operations@your-company.com'
]
```

```typescript
// lib/auth-service.ts (Line 16-20)
const ADMIN_EMAILS = [
  'admin@intersnack.com.vn',            → 'admin@your-company.com'
  'manager@intersnack.com.vn',          → 'manager@your-company.com'
  'operations@intersnack.com.vn'        → 'operations@your-company.com'
];
```

```typescript
// components/login-button.tsx (Line 107)
<Image src="/intersnack-logo.png"      → <Image src="/your-logo.png"

// Line 115
Use your Intersnack company email       → Use your Company email

// Line 124
placeholder="your.name@intersnack..."   → placeholder="your.name@your-company..."

// Line 131
Must use @intersnack.com.vn email       → Must use @your-company.com email
```

### Priority 2: Optional Customization

```typescript
// middleware.ts
publicApiPaths = [...]                  → Add your public APIs
adminApiPaths = [...]                   → Add your admin APIs

// lib/auth-service.ts (Line 143-167)
getDepartmentFromEmail()                → Customize department keywords
```

---

## 📦 DEPENDENCIES TO INSTALL

```bash
npm install lucide-react \
  @radix-ui/react-dialog \
  @radix-ui/react-label \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-toast \
  class-variance-authority \
  clsx \
  tailwind-merge
```

---

## 🌍 ENVIRONMENT VARIABLES

Create `.env.local`:

```bash
# Session Configuration
SESSION_MAX_AGE=1800
SESSION_UPDATE_AGE=300
NEXT_PUBLIC_SESSION_MAX_AGE=1800

# Node Environment
NODE_ENV=development
```

---

## 🚀 INTEGRATION STEPS

### 1. Landing Page (`app/page.tsx`)

```typescript
import { LoginButton } from '@/components/login-button';

export default function HomePage() {
  return (
    <div>
      <h1>Welcome</h1>
      <LoginButton />
    </div>
  );
}
```

### 2. Protected Layout (`app/dashboard/layout.tsx`)

```typescript
import { AuthProvider } from '@/components/auth-provider';
import { SessionMonitor } from '@/components/session-monitor';

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <SessionMonitor />
      {children}
    </AuthProvider>
  );
}
```

### 3. Add Logo

```bash
# Copy your logo to public/
cp /path/to/your-logo.png /path/to/new-app/public/
```

---

## ✅ VERIFICATION CHECKLIST

After copying:

- [ ] All files copied to correct locations
- [ ] Company domain changed in 2 places (config.ts, auth-service.ts)
- [ ] Admin emails changed in 2 places (config.ts, auth-service.ts)
- [ ] Login button branding updated
- [ ] Logo added to public/
- [ ] .env.local created with session config
- [ ] NPM packages installed
- [ ] Imports resolve without errors
- [ ] Build succeeds (`npm run build`)
- [ ] Login flow works
- [ ] Session timeout works

---

## 🔍 SEARCH & REPLACE

Use these commands to find all instances that need changing:

```bash
# Find company domain references
grep -r "@intersnack.com.vn" .

# Find admin email references
grep -r "admin@intersnack" .
grep -r "manager@intersnack" .
grep -r "operations@intersnack" .

# Find logo references
grep -r "intersnack-logo" .

# Find company name references
grep -r "Intersnack" .
```

---

## 📊 FILE DEPENDENCY GRAPH

```
middleware.ts
  └─> lib/auth-helpers.ts
       └─> lib/auth-service.ts
            └─> lib/config.ts
            └─> lib/cookie-utils.ts

app/api/auth/login/route.ts
  └─> lib/auth-service.ts
  └─> lib/auth-helpers.ts
  └─> lib/config.ts

components/login-button.tsx
  └─> lib/config.ts
  └─> components/ui/*

components/auth-provider.tsx
  └─> lib/auth-service.ts

components/session-monitor.tsx
  └─> lib/auth-service.ts
  └─> components/ui/alert-dialog
```

**Import order matters!** Ensure base files (config, utils) are copied first.

---

## 🎯 MINIMAL SETUP (Core Only)

If you want minimal auth without UI:

```bash
# Core files only
lib/auth-service.ts
lib/auth-helpers.ts
lib/cookie-utils.ts
lib/config.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
middleware.ts
```

Then build your own UI components that use `authService`.

---

## 📝 NOTES

### Important Paths

- **Admin emails defined in**: `lib/config.ts` + `lib/auth-service.ts`
- **Company domain defined in**: `lib/config.ts`
- **Session timeout defined in**: `middleware.ts` + `session-monitor.tsx` + `.env.local`
- **Protected routes defined in**: `middleware.ts`

### Hash Algorithm

User IDs use **FNV-1a 32-bit hash**:
- Stable: same email → same ID
- No database needed
- Format: `user-3fa4c9b1`

### Cookie Strategy

- `session` (HttpOnly) - Server validation
- `user_info` (Readable) - Client access
- `session_timestamp` (HttpOnly) - Activity tracking

### Security

- HTTPS required in production
- `sameSite: 'lax'` for CSRF protection
- Auto-detect HTTP/HTTPS for cookie security
- Middleware validates all protected routes

---

**Total Files: ~15-20 files**
**Total Time: ~30-60 minutes** (including customization and testing)
