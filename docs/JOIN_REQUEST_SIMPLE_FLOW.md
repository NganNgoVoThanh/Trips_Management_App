# 🎯 Join Request Flow - Phiên bản đơn giản

## Flow chính (3 bước)

```
┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 1: USER REQUEST                                        │
└──────────────────────────────────────────────────────────────┘

User → Available Trips → Click "Request to Join"
  ↓
Dialog mở ra (nhập reason)
  ↓
Submit Request
  ↓
CREATE join_request (status = 'pending')
  ↓
📧 Email → Admin: "New join request"
📧 Email → User: "Request submitted, waiting for admin"


┌──────────────────────────────────────────────────────────────┐
│  BƯỚC 2: ADMIN APPROVAL                                      │
└──────────────────────────────────────────────────────────────┘

Admin Dashboard → Join Requests → Xem pending requests
  ↓
Admin quyết định: APPROVE hoặc REJECT?


┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3A: APPROVE → 2 NHÁNH                                 │
└─────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────┐
         │   Admin Click APPROVE           │
         └──────────┬──────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ OPTIMIZED    │        │ APPROVED     │
│ TRIP         │        │ TRIP         │
└──────┬───────┘        └──────┬───────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ INSTANT JOIN ✅  │    │ NEEDS MANAGER ⏳ │
├──────────────────┤    ├──────────────────┤
│ • Create trip    │    │ • Create trip    │
│   status='opt'   │    │   status='pend'  │
│                  │    │                  │
│ • Email user:    │    │ • Email user:    │
│   "CONFIRMED!"   │    │   "Pending mgr"  │
│                  │    │                  │
│ • Email manager: │    │ • Email manager: │
│   "[FYI only]"   │    │   "[APPROVE?]"   │
│                  │    │                  │
│ ✅ DONE!         │    │ ⏳ Wait manager  │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 │
                     ┌───────────┴──────────┐
                     │                      │
                     ▼                      ▼
              ┌────────────┐        ┌────────────┐
              │ Mgr APPROVE│        │ Mgr REJECT │
              └──────┬─────┘        └──────┬─────┘
                     │                     │
                     ▼                     ▼
              ┌────────────┐        ┌────────────┐
              │ Trip='appr'│        │ Trip='rej' │
              │ ✅ DONE!   │        │ ❌ FAIL    │
              └────────────┘        └────────────┘


┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3B: REJECT                                            │
└─────────────────────────────────────────────────────────────┘

Admin Click REJECT + Enter reason
  ↓
UPDATE join_request (status = 'rejected')
  ↓
📧 Email → User: "Request rejected" + reason
  ↓
❌ DONE (no trip created)
```

---

## 🔑 Key Points

### 1. Instant Join vs Normal Approval?

| Original Trip Status | Result | Manager Approval? |
|---------------------|--------|-------------------|
| **optimized** | ✅ Instant Join | ❌ NO (FYI only) |
| **approved** | ⏳ Pending | ✅ YES (action required) |
| **auto_approved** | ⏳ Pending | ✅ YES (action required) |
| **approved_solo** | ⏳ Pending | ✅ YES (action required) |

### 2. Emails gửi đi khi nào?

| Stage | User | Manager | Admin |
|-------|------|---------|-------|
| **Request Created** | ✅ Confirmation | ℹ️ CC | ✅ New request |
| **Instant Join** | ✅ Confirmed! | ℹ️ FYI | - |
| **Normal Approval** | ✅ Pending mgr | ⚠️ Approve? | - |
| **Rejected** | ❌ Rejected + reason | ℹ️ CC | - |

### 3. Trip được tạo khi nào?

```
Admin APPROVE
  └─> CREATE new trip cho user
      ├─ optimizedGroupId = original trip's groupId
      ├─ parentTripId = original trip ID
      ├─ status = 'optimized' OR 'pending_approval' OR 'auto_approved'
      └─ Same route, date, time, vehicle as original
```

### 4. Available seats update như thế nào?

```
BEFORE: 3 passengers → Available: 6 - 3 = 3 seats
         ↓
Admin approve 1 join request
         ↓
AFTER: 4 passengers → Available: 6 - 4 = 2 seats

(Automatic vì new trip được add vào cùng optimizedGroupId)
```

---

## 📋 Checklist Validation

Trước khi tạo join request, system check:

- [ ] User authenticated?
- [ ] Trip còn chỗ trống?
- [ ] User chưa có pending/approved request cho trip này?
- [ ] User không có trip khác cùng ngày?
- [ ] User không trong optimized group này rồi?

Nếu TẤT CẢ ✅ → Cho phép create request

---

## 🎯 Tóm tắt ngắn gọn

1. **User request** → pending ⏳
2. **Admin approve** → 2 nhánh:
   - Optimized trip → ✅ Instant (no manager)
   - Approved trip → ⏳ Pending manager
3. **Manager approve** (if needed) → ✅ Confirmed
4. **Any reject** → ❌ Cancelled

**Kết quả:** User có trip mới trong "My Trips" với cùng route/date/vehicle như original trip! 🎉
