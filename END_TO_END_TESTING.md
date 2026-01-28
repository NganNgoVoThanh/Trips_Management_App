# End-to-End Testing Workflow

## 🎯 Mục đích
Test toàn bộ application từ đầu với database clean, đảm bảo mọi tính năng hoạt động đúng trước khi deploy lên production.

## 📋 Checklist chuẩn bị

- [ ] Database connection hoạt động (check `.env`)
- [ ] MySQL service đang chạy
- [ ] Code đã được commit (để có thể revert nếu cần)
- [ ] Đã backup database hiện tại (nếu có data quan trọng)

## 🔄 Bước thực hiện

### Bước 1: Kiểm tra database hiện tại
```bash
npm run db:check
```

### Bước 2: Reset database
```bash
# Chọn một trong hai:

# Option A: Xóa toàn bộ (kể cả admin)
npm run db:reset

# Option B: Giữ lại admin accounts (recommended)
npm run db:reset:keep-admin
```

Wait 3 seconds - Script sẽ tự động chạy, bấm Ctrl+C để cancel nếu cần.

### Bước 3: Verify clean state
```bash
npm run db:check
```

### Bước 4: Start application
```bash
npm run dev
```

App sẽ chạy tại: http://localhost:50001

---

## 🧪 Test Scenarios (11 scenarios)

### 1. First User Setup
- Login with Azure AD
- Complete profile setup
- Select manager
- Verify manager confirmation email sent

### 2. Manager Confirmation
- Click confirmation link in email
- Confirm employee
- Verify user can now create trips

### 3. Create First Trip
- Register new trip
- Fill all details
- Verify email sent to manager

### 4. Manager Approval
- Manager approves/rejects via email link
- Verify trip status changes
- Verify audit log created

### 5. Join Request Workflow
- Second user joins existing trip
- Admin processes request
- Verify notifications sent

### 6. Admin Override
- Admin approves expired trip
- Verify override logged
- Verify user notified

### 7. Trip Optimization
- Create multiple similar trips
- Admin groups them
- Assign vehicle
- Verify optimization saved

### 8. Admin Create Trip for User
- Admin creates trip on behalf of user
- Verify auto-approved
- Verify user notified

### 9. Vehicle Management
- Add new vehicle
- Assign to trip
- Verify assignment

### 10. Reporting & Export
- Export trips to Excel
- Verify data format
- Check all columns present

### 11. Cron Jobs
- Run expired check
- Run Azure sync
- Verify logs

---

## ✅ Success Criteria

All tests should pass without errors. Database should have:
- Multiple users (5+)
- Multiple trips (10+)
- Join requests (2+)
- Approval logs (15+)
- No console errors
- No 404 errors

---

## 🚀 Ready for Production?

After all tests pass:
- [ ] Build production: `npm run build:production`
- [ ] Test production build locally
- [ ] Commit all changes
- [ ] Create deployment tag
- [ ] Deploy to server
- [ ] Monitor for 24h

Good luck! 🎉
