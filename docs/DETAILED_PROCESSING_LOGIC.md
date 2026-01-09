# Chi Tiết Xử Lý Workflow & Dữ Liệu Hệ Thống

Tài liệu này giải thích cơ chế "backend" xử lý dữ liệu, bao gồm cấu trúc lưu trữ (MySQL), logic hệ thống (System), vai trò của AI và phương án xử lý ngoại lệ.

---

## 1. Giai Đoạn 1: User Tạo Yêu Cầu (Submission)

### A. Logic Hệ Thống (System Processing)
1.  **Nhận diện User**: Hệ thống lấy `user_id` và `manager_email` từ Session (đã lưu khi Login).
2.  **Tính toán Khẩn cấp (Urgency Check)**:
    *   System so sánh `departure_time` với `current_time`.
    *   Nếu khoảng cách < **24 giờ**, hệ thống bật cờ `is_urgent = true`.
3.  **Kiểm tra Auto-Approval**:
    *   Nếu User không có Manager (VD: CEO) HOẶC là admin nhập hộ (`isManualEntry`).
    *   Gán trạng thái ngay lập tức là `auto_approved` (Level 2).

### B. Lưu Trữ Database (MySQL)
Dữ liệu được insert vào bảng `trips` với các trường quan trọng:

| Trường (Field) | Giá trị (Ví dụ) | Giải thích |
|:---|:---|:---|
| `status` | `pending_approval` | Trạng thái hiển thị chung |
| `manager_approval_status` | `pending` | Trạng thái riêng cho quy trình duyệt |
| `is_urgent` | `1` (True) | Cờ báo khẩn cấp |
| `manager_approval_token` | `eyJhbGci...` | **JWT Token** dùng để tạo link duyệt qua mail |
| `manager_email` | `sep@congty.com` | Email người sẽ nhận thông báo |

### C. Xử lý Exception: Khách nhập sai thông tin?
*   Hệ thống validate ngay tại Frontend (ngày về phải sau ngày đi, điểm đi khác điểm đến).
*   Nếu chuyến đi quá gấp (< 2 tiếng), hệ thống sẽ hiện cảnh báo yêu cầu User liên hệ trực tiếp Admin thay vì chỉ submit trên web.

---

## 2. Giai Đoạn 2: Manager Phê Duyệt (The Gatekeeper)

### A. Cơ chế gửi Email (System)
*   Hệ thống không bắt Manager đăng nhập.
*   Nó gửi 01 Email chứa 2 nút bấm: `[APPROVE]` và `[REJECT]`.
*   Link đằng sau nút bấm chứa `manager_approval_token`. Token này có hạn **48 giờ**.

### B. Manager Click Link (Action)
1.  **System**: Giải mã JWT Token để lấy `trip_id`.
2.  **Validation**: Kiểm tra xem Token còn hạn không? Chuyến đi đã bị hủy chưa?
3.  **Database Update**:
    *   Nếu **Approve**: Update `manager_approval_status = 'approved'`, `status = 'approved'`.
    *   Nếu **Reject**: Update `status = 'rejected'`, yêu cầu nhập lý do từ chối (`manager_rejection_reason`).

### C. Xử lý Exception: Urgent Trip nhưng Manager KHÔNG duyệt kịp?
Đây là câu hỏi quan trọng. Hệ thống xử lý theo quy trình thang leo (Escalation):

1.  **Cảnh báo Visual**: Trên Dashboard của Admin, các chuyến `is_urgent=1` sẽ được tô **Đỏ** và nằm tab đầu tiên.
2.  **Admin Override (Quyền ưu tiên)**:
    *   Trong trường hợp Manager đi vắng hoặc không check mail.
    *   **Admin (Location Admin/Super Admin)** có quyền "Force Approve" (Duyệt cưỡng chế).
    *   Hệ thống sẽ ghi log: "Trip approved by Admin (on behalf of Manager)".
3.  **Auto-Expire**: Nếu sau 48h (hoặc quá giờ đi) mà không ai duyệt -> Hệ thống tự chuyển `status = 'expired'`.

---

## 3. Giai Đoạn 3: AI Optimization (Bộ Não Tối Ưu)

### A. Điều kiện kích hoạt
*   AI **KHÔNG** chạy real-time mỗi khi có chuyến mới (để tiết kiệm chi phí/token).
*   Admin kích hoạt chức năng "Scan & Optimize" hoặc hệ thống chạy định kỳ (Cronjob).
*   **Input**: Chỉ lấy các chuyến có `status = 'approved'` (đã được sếp duyệt).

### B. Quy trình thực hiện (AI Logic)
1.  **Gom nhóm thô (Pre-processing)**:
    *   System lọc các chuyến cùng `Ngày` + `Tuyến đường` (VD: 10 chuyến đi Vũng Tàu ngày mai).
2.  **Chuẩn bị dữ liệu gửi AI**:
    *   Gửi JSON rút gọn: `[{id: 1, time: "08:00"}, {id: 2, time: "08:30"}]`.
    *   Gửi ràng buộc: "Xe 7 chỗ giá 10k/km, xe 4 chỗ giá 8k/km. Max chờ đợi 60 phút".
3.  **AI Phân tích (Reasoning)**:
    *   AI (OpenAI/Claude) sẽ tính toán tổ hợp.
    *   Ví dụ: "Nếu ghép User 1 và 2 đi chung xe 7 chỗ lúc 08:15, tổng tiết kiệm là 30%".
4.  **Database Storage**:
    *   Kết quả phân tích được lưu vào bảng `optimization_groups`.
    *   Trạng thái các chuyến liên quan chuyển sang `proposed` (Đề xuất).

---

## 4. Bảng Tóm Tắt Các Kịch Bản Ngoại Lệ (Exceptions Handling)

| Tình huống (Scenario) | Hệ thống xử lý (System Logic) | Hành động con người cần làm (Action) |
|:---|:---|:---|
| **Urgent Trip (<24h)** | Flag `is_urgent=true`. Email tiêu đề có chữ [URGENT]. | Mặc định Manager duyệt. Nếu chậm, Admin dùng quyền "Force Approve". |
| **Manager Không duyệt (Quên/Spam)** | Token hết hạn sau 48h. Email nhắc nhở (Reminder) được gửi sau 24h. | User phải liên hệ Admin hoặc Manager. Admin có thể "Resend Email". |
| **Manager Từ chối (Reject)** | Trip chuyển `rejected`. Gửi mail báo User kèm lý do. | User phải sửa lại plan và tạo request mới. |
| **User Hủy sau khi Đã duyệt** | Chuyến đi `cancelled`. Nếu đang nằm trong nhóm AI optimization -> Nhóm bị vỡ. | Hệ thống tự động đẩy các chuyến còn lại trong nhóm ra để AI tính toán lại lần sau. |
| **Token Hết hạn (Expired)** | Link trong email vô hiệu hóa. Status chuyến -> `pending` (treo) hoặc `expired`. | Manager không thể duyệt nữa. Admin phải vào can thiệp xử lý. |

---

## 5. Kết luận
Hệ thống được thiết kế theo mô hình **"Human in the loop"** (Con người giám sát AI):
1.  **User & Manager**: Giải quyết thủ tục hành chính (phê duyệt ngân sách/lý do).
2.  **Hệ thống**: Tự động nhận diện khẩn cấp (Urgent) và đảm bảo an toàn dữ liệu (Validation).
3.  **AI**: Chỉ đóng vai trò "Tư vấn" giải pháp tiết kiệm chi phí.
4.  **Admin**: Là người quyết định cuối cùng và xử lý sự cố (Override approval).
