# 🔐 Hướng dẫn Thiết lập Azure AD SSO - Chi tiết

## 📋 Tổng quan

Tài liệu này hướng dẫn chi tiết cách thiết lập Single Sign-On (SSO) với Microsoft Azure AD (Entra ID) cho Trips Management System.

**Thời gian thiết lập**: Khoảng 30-45 phút
**Yêu cầu**: SSL/HTTPS đã được thiết lập bởi IT

---

## 🎯 Phần 1: Đăng ký ứng dụng trên Azure Portal (IT Team)

### Bước 1.1: Truy cập Azure Portal

1. Mở trình duyệt và truy cập: https://portal.azure.com
2. Đăng nhập bằng tài khoản Azure AD admin
3. Tìm kiếm "Azure Active Directory" hoặc "Microsoft Entra ID"

### Bước 1.2: Tạo App Registration

1. Trong Azure AD, chọn **App registrations** từ menu bên trái
2. Click **+ New registration**

3. Điền thông tin:
   ```
   Name: Trips Management System

   Supported account types:
   ✅ Accounts in this organizational directory only
      (Intersnack only - Single tenant)

   Redirect URI:
   - Platform: Web
   - URL: https://trip.intersnack.com.vn/api/auth/callback/azure-ad
   ```

4. Click **Register**

### Bước 1.3: Lưu thông tin Application

Sau khi tạo xong, bạn sẽ thấy trang **Overview**. Lưu lại:

```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID:   yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

### Bước 1.4: Tạo Client Secret

1. Trong menu bên trái, chọn **Certificates & secrets**
2. Click **+ New client secret**
3. Điền thông tin:
   ```
   Description: TripsMgmt Production Secret
   Expires: 24 months (recommended)
   ```
4. Click **Add**
5. **⚠️ QUAN TRỌNG**: Copy **Value** ngay lập tức (chỉ hiện 1 lần!)
   ```
   Client Secret Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Bước 1.5: Cấu hình API Permissions

1. Trong menu bên trái, chọn **API permissions**
2. Xóa permission mặc định nếu có
3. Click **+ Add a permission**
4. Chọn **Microsoft Graph**
5. Chọn **Delegated permissions**
6. Tìm và tick các permissions sau:
   ```
   ✅ openid
   ✅ email
   ✅ profile
   ✅ User.Read
   ```
7. Click **Add permissions**
8. Click **Grant admin consent for [Your Organization]**
9. Confirm bằng cách click **Yes**

### Bước 1.6: Cấu hình Token (Optional nhưng khuyên dùng)

1. Trong menu bên trái, chọn **Token configuration**
2. Click **+ Add optional claim**
3. Token type: **ID**
4. Chọn các claims:
   ```
   ✅ email
   ✅ family_name
   ✅ given_name
   ```
5. Click **Add**

---

## 🔧 Phần 2: Cấu hình ứng dụng (Developer)

### Bước 2.1: Cập nhật Environment Variables

1. Mở file `.env.production`
2. Điền thông tin từ Azure Portal:

```env
# Azure AD Configuration
AZURE_AD_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_TENANT_ID=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy

# NextAuth URL - PHẢI là HTTPS
NEXTAUTH_URL=https://trip.intersnack.com.vn
NEXTAUTH_SECRET=0f61e3ca7e83132e807819871707856a
```

3. **⚠️ QUAN TRỌNG**:
   - KHÔNG commit file này vào Git
   - Đảm bảo `.env.production` có trong `.gitignore`

### Bước 2.2: Update Root Layout để dùng NextAuth Provider

Mở `app/layout.tsx` và update:

```typescript
// app/layout.tsx
import { AuthProvider } from "@/components/auth-provider-nextauth"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Bước 2.3: Update Login Page

Mở `app/page.tsx` và update import:

```typescript
// app/page.tsx
"use client"

// ❌ Xóa dòng này
// import { LoginButton } from "@/components/login-button"

// ✅ Thêm dòng này
import { LoginButton } from "@/components/login-button-azuread"

// ... rest of the file stays the same
```

### Bước 2.4: Replace Middleware

**Backup middleware hiện tại:**
```bash
# File middleware.ts hiện tại đã được backup tự động thành middleware.backup.ts
```

**Replace bằng middleware mới:**
```bash
# Xóa middleware.ts hiện tại
rm middleware.ts

# Rename middleware-nextauth.ts thành middleware.ts
mv middleware-nextauth.ts middleware.ts
```

Hoặc thủ công:
1. Xóa file `middleware.ts`
2. Đổi tên `middleware-nextauth.ts` → `middleware.ts`

### Bước 2.5: Update API Routes sử dụng Auth

Các API routes hiện tại dùng old auth system. Update chúng để dùng NextAuth:

**Trước (old):**
```typescript
import { getServerUser } from "@/lib/server-auth"

export async function GET() {
  const user = await getServerUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  // ...
}
```

**Sau (new):**
```typescript
import { requireAuth } from "@/lib/auth-nextauth"

export async function GET() {
  try {
    const session = await requireAuth()
    const user = session.user
    // ...
  } catch (error) {
    return new Response('Unauthorized', { status: 401 })
  }
}
```

### Bước 2.6: Update Admin API Routes

**Trước (old):**
```typescript
import { requireAdmin } from "@/lib/server-auth"

export async function POST() {
  const user = await requireAdmin()
  // ...
}
```

**Sau (new):**
```typescript
import { requireAdmin } from "@/lib/auth-nextauth"

export async function POST() {
  try {
    const session = await requireAdmin()
    const user = session.user
    // ...
  } catch (error) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

---

## 🚀 Phần 3: Testing

### Bước 3.1: Build ứng dụng

```bash
npm run build:production
```

Kiểm tra không có lỗi TypeScript hoặc build errors.

### Bước 3.2: Start ứng dụng

```bash
# Nếu dùng PM2
npm run pm2:restart:production

# Hoặc start trực tiếp
npm run start:production
```

### Bước 3.3: Test SSO Flow

1. **Truy cập trang chủ**: https://trip.intersnack.com.vn
2. **Click "Sign in with Microsoft"**
3. **Chuyển hướng đến Azure AD login page**
   - Nếu đã đăng nhập Microsoft 365 → tự động redirect
   - Nếu chưa → hiện form đăng nhập
4. **Nhập credentials** (nếu cần)
   - Email: your.email@intersnack.com.vn
   - Password: Microsoft 365 password
5. **Grant permissions** (lần đầu tiên)
   - Azure AD sẽ hỏi xin quyền truy cập User.Read, email, profile
   - Click **Accept**
6. **Redirect về dashboard**
   - Admin → `/admin/dashboard`
   - User → `/dashboard`

### Bước 3.4: Test Session Management

1. **Test auto-redirect khi đã đăng nhập**
   - Truy cập https://trip.intersnack.com.vn
   - Nếu đã đăng nhập → tự động redirect về dashboard

2. **Test session timeout** (30 phút)
   - Đăng nhập
   - Đợi 31 phút không hoạt động
   - Reload page → tự động logout và redirect về home

3. **Test logout**
   - Click nút Logout
   - Kiểm tra redirect về home page
   - Kiểm tra không thể truy cập dashboard

### Bước 3.5: Test Role-based Access

1. **Test với User account**
   - Đăng nhập bằng non-admin email
   - Kiểm tra redirect về `/dashboard`
   - Thử truy cập `/admin/dashboard` → redirect về `/dashboard`

2. **Test với Admin account**
   - Đăng nhập bằng admin email
   - Kiểm tra redirect về `/admin/dashboard`
   - Kiểm tra có thể truy cập tất cả admin routes

3. **Admin emails (trong [app/api/auth/[...nextauth]/route.ts](../app/api/auth/[...nextauth]/route.ts)):**
   ```typescript
   admin@intersnack.com.vn
   manager@intersnack.com.vn
   operations@intersnack.com.vn
   ```

---

## 🔍 Phần 4: Troubleshooting

### Lỗi: "Configuration mismatch"

**Nguyên nhân**: Redirect URI không khớp

**Giải pháp**:
1. Kiểm tra Azure Portal → App registrations → Authentication → Redirect URIs
2. Đảm bảo có: `https://trip.intersnack.com.vn/api/auth/callback/azure-ad`
3. Không có trailing slash `/`
4. Phải là HTTPS, không phải HTTP

### Lỗi: "AADSTS50011: The reply URL specified in the request does not match"

**Nguyên nhân**: URL trong request không match với Azure Portal

**Giải pháp**:
1. Kiểm tra `.env.production` → `NEXTAUTH_URL`
2. Đảm bảo: `NEXTAUTH_URL=https://trip.intersnack.com.vn`
3. Không có trailing slash
4. Restart ứng dụng sau khi sửa

### Lỗi: "Invalid domain - email@otherdomain.com"

**Nguyên nhân**: User dùng email không phải @intersnack.com.vn

**Giải pháp**:
1. Đảm bảo user dùng email công ty
2. Kiểm tra signIn callback trong `[...nextauth]/route.ts`
3. Kiểm tra `NEXT_PUBLIC_COMPANY_DOMAIN` trong `.env.production`

### Lỗi: "Session expired" ngay sau khi đăng nhập

**Nguyên nhân**: Cookie không được set đúng

**Giải pháp**:
1. Kiểm tra HTTPS đã được setup chưa
2. Kiểm tra `NEXTAUTH_SECRET` có trong `.env.production`
3. Clear browser cookies và thử lại
4. Kiểm tra browser console có lỗi không

### Debug Mode

Bật debug mode để xem logs chi tiết:

```env
# .env.production
NODE_ENV=development  # Tạm thời để debug
```

Sau đó check terminal logs khi login.

---

## 📊 Phần 5: Monitoring & Maintenance

### Check Logs

**PM2 logs:**
```bash
npm run pm2:logs
```

**Kiểm tra auth events:**
- Logs sẽ hiện các events: sign in, sign out, session check
- Format: `✅ User signed in: email@domain.com via azure-ad`

### Session Statistics

Trong Azure Portal:
1. Azure AD → Enterprise applications
2. Chọn "Trips Management System"
3. Xem **Sign-ins** để thấy login history
4. Xem **Users and groups** để quản lý access

### Security Best Practices

1. **Rotate Client Secret định kỳ**
   - Mỗi 6-12 tháng
   - Azure Portal → Certificates & secrets → New secret
   - Update `.env.production`
   - Restart app

2. **Review permissions**
   - Đảm bảo chỉ request quyền cần thiết
   - Không request quyền quá mức

3. **Monitor failed logins**
   - Azure Portal → Sign-ins
   - Filter by Status: Failure
   - Investigate suspicious activities

4. **Keep dependencies updated**
   ```bash
   npm update next-auth
   ```

---

## 📚 Phần 6: Tài liệu tham khảo

### File Structure sau khi setup

```
trips-management-system/
├── app/
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts          # NextAuth configuration
├── components/
│   ├── auth-provider-nextauth.tsx   # Session provider
│   └── login-button-azuread.tsx     # Azure AD login button
├── hooks/
│   └── use-auth.ts                  # Client auth hook
├── lib/
│   └── auth-nextauth.ts             # Server auth utilities
├── types/
│   └── next-auth.d.ts               # TypeScript types
├── middleware.ts                     # NextAuth middleware (new)
├── middleware.backup.ts              # Old middleware (backup)
└── .env.production                   # Environment config
```

### Useful Links

- **NextAuth.js Documentation**: https://next-auth.js.org/
- **Azure AD Provider**: https://next-auth.js.org/providers/azure-ad
- **Azure Portal**: https://portal.azure.com
- **Microsoft Graph Permissions**: https://learn.microsoft.com/en-us/graph/permissions-reference

### Support

Nếu gặp vấn đề:
1. Check logs: `npm run pm2:logs`
2. Check browser console
3. Check Azure Portal → Sign-ins logs
4. Review this documentation
5. Contact IT team nếu vấn đề liên quan đến Azure AD setup

---

## ✅ Checklist Hoàn chỉnh

### IT Team Checklist

- [ ] Truy cập Azure Portal
- [ ] Tạo App Registration "Trips Management System"
- [ ] Cấu hình Redirect URI: `https://trip.intersnack.com.vn/api/auth/callback/azure-ad`
- [ ] Lưu Application (client) ID
- [ ] Lưu Directory (tenant) ID
- [ ] Tạo Client Secret và lưu Value
- [ ] Thêm API permissions: openid, email, profile, User.Read
- [ ] Grant admin consent cho permissions
- [ ] Cung cấp credentials cho Developer team

### Developer Checklist

- [ ] Nhận credentials từ IT
- [ ] Update `.env.production` với Azure AD credentials
- [ ] Verify HTTPS URLs (không có HTTP)
- [ ] Update `app/layout.tsx` với AuthProvider
- [ ] Update `app/page.tsx` với LoginButton mới
- [ ] Replace middleware.ts
- [ ] Update API routes dùng auth
- [ ] Build ứng dụng: `npm run build:production`
- [ ] Restart ứng dụng: `npm run pm2:restart:production`
- [ ] Test SSO login flow
- [ ] Test admin/user role routing
- [ ] Test session timeout
- [ ] Test logout
- [ ] Verify logs không có lỗi
- [ ] Document credentials location (secure vault)

---

**Version**: 1.0
**Last Updated**: 2024-12-05
**Author**: Process RD & Optimization Team
