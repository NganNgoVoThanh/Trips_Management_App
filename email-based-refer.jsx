import React, { useState } from 'react';

const EmailBasedApprovalSystem = () => {
  const [activeSection, setActiveSection] = useState('flow');

  const NavButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeSection === id
          ? 'bg-red-600 text-white shadow-lg'
          : 'bg-white text-gray-600 hover:bg-red-50 border'
        }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      manager_pending: 'bg-orange-100 text-orange-800 border-orange-300',
      manager_approved: 'bg-blue-100 text-blue-800 border-blue-300',
      manager_rejected: 'bg-red-100 text-red-800 border-red-300',
      admin_confirmed: 'bg-green-100 text-green-800 border-green-300',
      optimized: 'bg-purple-100 text-purple-800 border-purple-300',
      expired: 'bg-gray-100 text-gray-800 border-gray-300',
      escalated: 'bg-pink-100 text-pink-800 border-pink-300',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <span className="text-3xl">📧</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Option 1: Email-Based Approval System</h1>
              <p className="text-red-100 mt-1">Trips Management - Chi tiết triển khai & Xử lý ngoại lệ</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <NavButton id="flow" label="Workflow Chính" icon="🔄" />
          <NavButton id="status" label="Trip Status" icon="📊" />
          <NavButton id="exceptions" label="Trường Hợp Ngoại Lệ" icon="⚠️" />
          <NavButton id="admin" label="Admin Handling" icon="👨‍💼" />
          <NavButton id="database" label="Database Schema" icon="🗄️" />
          <NavButton id="api" label="API Endpoints" icon="🔌" />
          <NavButton id="email" label="Email Templates" icon="✉️" />
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">

          {/* Section 1: Main Flow */}
          {activeSection === 'flow' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                🔄 Workflow Chính - Email-Based Approval
              </h2>

              {/* Flow Diagram */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex flex-col items-center">
                  {/* Step 1 */}
                  <div className="w-full max-w-md bg-blue-100 border-2 border-blue-400 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👤</div>
                    <div className="font-bold text-blue-800">1. USER SUBMIT TRIP</div>
                    <div className="text-sm text-blue-600 mt-1">
                      Điền form đăng ký + Xác nhận Manager
                    </div>
                  </div>

                  <div className="text-2xl text-gray-400 my-2">↓</div>

                  {/* Step 2 */}
                  <div className="w-full max-w-md bg-orange-100 border-2 border-orange-400 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">📧</div>
                    <div className="font-bold text-orange-800">2. SYSTEM GỬI EMAIL</div>
                    <div className="text-sm text-orange-600 mt-1">
                      Email đến Manager với nút [APPROVE] [REJECT]
                    </div>
                    <div className="text-xs text-orange-500 mt-2 italic">
                      CC: Plant Manager, HR, Admin
                    </div>
                  </div>

                  <div className="text-2xl text-gray-400 my-2">↓</div>

                  {/* Step 3 - Decision */}
                  <div className="w-full max-w-lg bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                    <div className="text-center font-bold text-yellow-800 mb-4">
                      3. MANAGER PHẢN HỒI (trong 48h)
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-100 border border-green-400 rounded-lg p-3 text-center">
                        <div className="text-xl">✅</div>
                        <div className="font-bold text-green-700 text-sm">APPROVE</div>
                        <div className="text-xs text-green-600 mt-1">→ Admin xử lý</div>
                      </div>
                      <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-center">
                        <div className="text-xl">❌</div>
                        <div className="font-bold text-red-700 text-sm">REJECT</div>
                        <div className="text-xs text-red-600 mt-1">→ Notify User</div>
                      </div>
                      <div className="bg-gray-100 border border-gray-400 rounded-lg p-3 text-center">
                        <div className="text-xl">⏰</div>
                        <div className="font-bold text-gray-700 text-sm">TIMEOUT</div>
                        <div className="text-xs text-gray-600 mt-1">→ Escalate</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl text-gray-400 my-2">↓</div>

                  {/* Step 4 */}
                  <div className="w-full max-w-md bg-purple-100 border-2 border-purple-400 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👨‍💼</div>
                    <div className="font-bold text-purple-800">4. ADMIN XỬ LÝ</div>
                    <div className="text-sm text-purple-600 mt-1">
                      View trên Dashboard → AI Optimize → Book xe
                    </div>
                  </div>

                  <div className="text-2xl text-gray-400 my-2">↓</div>

                  {/* Step 5 */}
                  <div className="w-full max-w-md bg-green-100 border-2 border-green-400 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🚗</div>
                    <div className="font-bold text-green-800">5. HOÀN TẤT</div>
                    <div className="text-sm text-green-600 mt-1">
                      Gửi email xác nhận cho User với thông tin xe
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-800 mb-2">🔑 Điểm Quan Trọng</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Manager KHÔNG cần đăng nhập app</li>
                    <li>• Click link trong email = Approve/Reject</li>
                    <li>• Link có token bảo mật, hết hạn 48h</li>
                    <li>• Mỗi action được log để audit</li>
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-bold text-green-800 mb-2">✅ Lợi Ích</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Approve nhanh ngay trong inbox</li>
                    <li>• Works trên mobile email</li>
                    <li>• Không cần train Manager dùng app</li>
                    <li>• Email = audit trail tự nhiên</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Trip Status */}
          {activeSection === 'status' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                📊 Trip Status Flow
              </h2>

              {/* Status Lifecycle */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-700 mb-4">Vòng đời của một Trip:</h3>
                <div className="flex flex-wrap items-center gap-2 justify-center">
                  <StatusBadge status="pending" />
                  <span className="text-gray-400">→</span>
                  <StatusBadge status="manager_pending" />
                  <span className="text-gray-400">→</span>
                  <StatusBadge status="manager_approved" />
                  <span className="text-gray-400">→</span>
                  <StatusBadge status="admin_confirmed" />
                  <span className="text-gray-400">→</span>
                  <StatusBadge status="optimized" />
                </div>
              </div>

              {/* Status Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="border p-3 text-left">Status</th>
                      <th className="border p-3 text-left">Mô tả</th>
                      <th className="border p-3 text-left">Ai thấy?</th>
                      <th className="border p-3 text-left">Actions có thể làm</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border p-3"><StatusBadge status="pending" /></td>
                      <td className="border p-3">User vừa submit, chưa gửi email Manager</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">User: Cancel | Admin: Force approve</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3"><StatusBadge status="manager_pending" /></td>
                      <td className="border p-3">Email đã gửi, đang chờ Manager phản hồi</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">User: Cancel | Admin: Resend email, Override</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border p-3"><StatusBadge status="manager_approved" /></td>
                      <td className="border p-3">Manager đã approve, chờ Admin xử lý</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">Admin: Optimize, Book xe</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3"><StatusBadge status="manager_rejected" /></td>
                      <td className="border p-3">Manager từ chối, Trip bị hủy</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">User: Submit mới | Admin: Override (nếu cần)</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border p-3"><StatusBadge status="admin_confirmed" /></td>
                      <td className="border p-3">Admin đã confirm, chờ optimize/book</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">Admin: Run optimization</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3"><StatusBadge status="optimized" /></td>
                      <td className="border p-3">Đã gộp chuyến & book xe xong</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">View only</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border p-3"><StatusBadge status="expired" /></td>
                      <td className="border p-3">Manager không phản hồi trong 48h</td>
                      <td className="border p-3">User, Admin</td>
                      <td className="border p-3">Admin: Escalate hoặc Override</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3"><StatusBadge status="escalated" /></td>
                      <td className="border p-3">Đã chuyển lên Plant Manager/HR</td>
                      <td className="border p-3">User, Admin, Plant Manager</td>
                      <td className="border p-3">Plant Manager: Approve/Reject</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Exception Cases */}
          {activeSection === 'exceptions' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                ⚠️ Các Trường Hợp Ngoại Lệ & Cách Xử Lý
              </h2>

              {/* Exception 1 */}
              <div className="border-2 border-orange-400 rounded-xl p-5 mb-4 bg-orange-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                  <h3 className="text-lg font-bold text-orange-800">Manager Không Phản Hồi (Timeout 48h)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Email gửi đi 48h mà không có action</li>
                      <li>• Cron job check mỗi giờ</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý tự động:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Status → <StatusBadge status="expired" /></li>
                      <li>• Gửi reminder email cho Manager (lần 1)</li>
                      <li>• Sau 24h nữa: Escalate lên Plant Manager</li>
                      <li>• Notify Admin để can thiệp</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3">
                  <h4 className="font-semibold text-orange-700 mb-2">Admin Options:</h4>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">📧 Resend Email</button>
                    <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm">⬆️ Escalate to Plant Manager</button>
                    <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">✅ Override Approve</button>
                    <button className="px-3 py-1 bg-red-500 text-white rounded text-sm">❌ Cancel Trip</button>
                  </div>
                </div>
              </div>

              {/* Exception 2 */}
              <div className="border-2 border-red-400 rounded-xl p-5 mb-4 bg-red-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</span>
                  <h3 className="text-lg font-bold text-red-800">Manager Email Không Hợp Lệ / Bounce</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Email bounce back (address not found)</li>
                      <li>• Email delivery failed</li>
                      <li>• Manager đã nghỉ việc</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý tự động:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Flag trip với error: "email_delivery_failed"</li>
                      <li>• Notify User cập nhật Manager email</li>
                      <li>• Alert Admin để xử lý</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3">
                  <h4 className="font-semibold text-red-700 mb-2">Admin Options:</h4>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">📝 Update Manager Email</button>
                    <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm">👤 Assign Different Approver</button>
                    <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">✅ Direct Approve</button>
                  </div>
                </div>
              </div>

              {/* Exception 3 */}
              <div className="border-2 border-yellow-400 rounded-xl p-5 mb-4 bg-yellow-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">3</span>
                  <h3 className="text-lg font-bold text-yellow-800">User Chưa Setup Manager trong Profile</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• User submit trip nhưng manager_email = null</li>
                      <li>• First-time user chưa complete profile</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• BLOCK submission</li>
                      <li>• Redirect đến Profile page</li>
                      <li>• Hiển thị message yêu cầu nhập Manager</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3 text-sm">
                  <code className="text-yellow-700">
                    ⚠️ "Vui lòng cập nhật thông tin Manager trong Profile trước khi đăng ký chuyến đi"
                  </code>
                </div>
              </div>

              {/* Exception 4 */}
              <div className="border-2 border-blue-400 rounded-xl p-5 mb-4 bg-blue-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">4</span>
                  <h3 className="text-lg font-bold text-blue-800">Trip Urgent (Cần đi trong 24h)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• departure_date - now &lt; 24 hours</li>
                      <li>• Không đủ thời gian chờ Manager approve</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Flag trip là "URGENT"</li>
                      <li>• Email gửi với priority HIGH</li>
                      <li>• CC thêm Plant Manager + Admin</li>
                      <li>• Timeout rút ngắn còn 4h</li>
                      <li>• Admin có thể override ngay</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3">
                  <h4 className="font-semibold text-blue-700 mb-2">Admin Fast-Track:</h4>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1 bg-red-600 text-white rounded text-sm font-bold">🚨 URGENT APPROVE</button>
                    <button className="px-3 py-1 bg-gray-500 text-white rounded text-sm">📞 Contact Manager</button>
                  </div>
                </div>
              </div>

              {/* Exception 5 */}
              <div className="border-2 border-purple-400 rounded-xl p-5 mb-4 bg-purple-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">5</span>
                  <h3 className="text-lg font-bold text-purple-800">Manager Reject với Lý Do</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Manager click Reject</li>
                      <li>• Optional: Nhập lý do từ chối</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Status → <StatusBadge status="manager_rejected" /></li>
                      <li>• Email notify User với rejection reason</li>
                      <li>• Log rejection vào approval_logs</li>
                      <li>• User có thể submit trip mới (sau khi fix)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Exception 6 */}
              <div className="border-2 border-green-400 rounded-xl p-5 mb-4 bg-green-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">6</span>
                  <h3 className="text-lg font-bold text-green-800">User Cancel Trip (trước khi Manager approve)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Điều kiện cho phép Cancel:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Status = pending hoặc manager_pending</li>
                      <li>• Chưa được approve bởi bất kỳ ai</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Status → cancelled</li>
                      <li>• Invalidate approval token (nếu có)</li>
                      <li>• Notify Manager: "Trip đã bị hủy bởi User"</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Exception 7 */}
              <div className="border-2 border-pink-400 rounded-xl p-5 bg-pink-50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-pink-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">7</span>
                  <h3 className="text-lg font-bold text-pink-800">Token Approval Hết Hạn / Invalid</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Trigger:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Manager click link sau 48h</li>
                      <li>• Token đã được dùng (duplicate click)</li>
                      <li>• Token bị tamper/invalid</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Xử lý:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Hiển thị error page: "Link đã hết hạn"</li>
                      <li>• Hướng dẫn liên hệ Admin</li>
                      <li>• Log attempt vào security_logs</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-white rounded-lg p-3">
                  <h4 className="font-semibold text-pink-700 mb-2">Error Page hiển thị:</h4>
                  <div className="bg-gray-100 p-3 rounded text-sm">
                    <div className="text-red-600 font-bold">⚠️ Link phê duyệt đã hết hạn</div>
                    <div className="text-gray-600 mt-1">Vui lòng liên hệ Admin để được hỗ trợ.</div>
                    <div className="text-gray-500 text-xs mt-2">Email: admin@intersnack.com.vn</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Admin Handling */}
          {activeSection === 'admin' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                👨‍💼 Admin Dashboard - Xử Lý Các Trường Hợp
              </h2>

              {/* Admin Dashboard Overview */}
              <div className="bg-gray-800 text-white rounded-xl p-5 mb-6">
                <h3 className="font-bold text-lg mb-4">📊 Admin Dashboard Tabs</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">📋</div>
                    <div className="text-sm font-medium">All Trips</div>
                    <div className="text-xs text-gray-400">View & Filter</div>
                  </div>
                  <div className="bg-yellow-600 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">⏳</div>
                    <div className="text-sm font-medium">Pending Approval</div>
                    <div className="text-xs text-yellow-200">Cần Manager approve</div>
                  </div>
                  <div className="bg-blue-600 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">✅</div>
                    <div className="text-sm font-medium">Ready to Optimize</div>
                    <div className="text-xs text-blue-200">Manager đã approve</div>
                  </div>
                  <div className="bg-red-600 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">⚠️</div>
                    <div className="text-sm font-medium">Exceptions</div>
                    <div className="text-xs text-red-200">Cần xử lý đặc biệt</div>
                  </div>
                </div>
              </div>

              {/* Admin Actions Table */}
              <h3 className="font-bold text-gray-700 mb-3">🔧 Admin Actions theo từng Status</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-red-700 text-white">
                      <th className="border p-3 text-left">Trường hợp</th>
                      <th className="border p-3 text-left">Status hiện tại</th>
                      <th className="border p-3 text-left">Admin Actions</th>
                      <th className="border p-3 text-left">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border p-3 font-medium">Normal Flow - Đã Manager Approve</td>
                      <td className="border p-3"><StatusBadge status="manager_approved" /></td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-purple-500 text-white rounded text-xs mr-1">🤖 AI Optimize</button>
                        <button className="px-2 py-1 bg-green-500 text-white rounded text-xs">🚗 Book Xe</button>
                      </td>
                      <td className="border p-3"><StatusBadge status="optimized" /></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-medium">Manager Timeout (48h)</td>
                      <td className="border p-3"><StatusBadge status="expired" /></td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs mr-1">📧 Resend</button>
                        <button className="px-2 py-1 bg-purple-500 text-white rounded text-xs mr-1">⬆️ Escalate</button>
                        <button className="px-2 py-1 bg-green-500 text-white rounded text-xs">✅ Override</button>
                      </td>
                      <td className="border p-3">Tùy action chọn</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border p-3 font-medium">Email Delivery Failed</td>
                      <td className="border p-3"><StatusBadge status="pending" /> + Error flag</td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs mr-1">📝 Edit Manager</button>
                        <button className="px-2 py-1 bg-orange-500 text-white rounded text-xs">🔄 Retry Send</button>
                      </td>
                      <td className="border p-3"><StatusBadge status="manager_pending" /></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-medium">Urgent Trip (&lt;24h)</td>
                      <td className="border p-3"><StatusBadge status="manager_pending" /> + Urgent</td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">🚨 FAST APPROVE</button>
                      </td>
                      <td className="border p-3"><StatusBadge status="admin_confirmed" /></td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border p-3 font-medium">Manager Rejected</td>
                      <td className="border p-3"><StatusBadge status="manager_rejected" /></td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-gray-500 text-white rounded text-xs mr-1">👁️ View Reason</button>
                        <button className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">🔄 Override (nếu cần)</button>
                      </td>
                      <td className="border p-3">Keep rejected hoặc Override</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-medium">Escalated to Plant Manager</td>
                      <td className="border p-3"><StatusBadge status="escalated" /></td>
                      <td className="border p-3">
                        <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs mr-1">📧 Remind PM</button>
                        <button className="px-2 py-1 bg-green-500 text-white rounded text-xs">✅ Override</button>
                      </td>
                      <td className="border p-3">Chờ PM hoặc Override</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Exception Queue */}
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-6">
                <h3 className="font-bold text-red-800 mb-4">🚨 Exception Queue (Admin phải xử lý)</h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">URGENT</span>
                      <div>
                        <div className="font-medium">Nguyen Van A - HCM → Phan Thiet</div>
                        <div className="text-sm text-gray-500">Departure: Tomorrow 8:00 AM | Manager timeout</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">Approve</button>
                      <button className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm">Details</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs">EMAIL FAILED</span>
                      <div>
                        <div className="font-medium">Tran Thi B - HCM → Long An</div>
                        <div className="text-sm text-gray-500">Manager email bounced: manager@old-domain.com</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">Edit & Resend</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">EXPIRED</span>
                      <div>
                        <div className="font-medium">Le Van C - Phan Thiet → HCM</div>
                        <div className="text-sm text-gray-500">Manager no response for 72 hours</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-purple-500 text-white rounded text-sm">Escalate</button>
                      <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">Override</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Override Approval Modal */}
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
                <h3 className="font-bold text-yellow-800 mb-3">⚠️ Admin Override Approval</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Khi Admin override approval, cần ghi nhận lý do để audit trail:
                </p>
                <div className="bg-white rounded-lg p-4 border">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lý do Override:</label>
                    <select className="w-full border rounded p-2 text-sm">
                      <option>Manager không phản hồi - Urgent trip</option>
                      <option>Manager đang nghỉ phép</option>
                      <option>Manager email không hợp lệ</option>
                      <option>Yêu cầu từ Plant Manager</option>
                      <option>Khác (nhập chi tiết)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thêm:</label>
                    <textarea className="w-full border rounded p-2 text-sm" rows="2" placeholder="Chi tiết lý do..."></textarea>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 text-white rounded font-medium">✅ Confirm Override</button>
                    <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Database Schema */}
          {activeSection === 'database' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                🗄️ Database Schema Updates
              </h2>

              <div className="bg-gray-900 text-green-400 p-5 rounded-xl text-sm font-mono overflow-x-auto">
                <pre>{`-- =============================================
-- TRIPS MANAGEMENT - EMAIL-BASED APPROVAL
-- Database Migration Script
-- =============================================

-- 1. UPDATE USERS TABLE (thêm manager info)
ALTER TABLE users 
ADD COLUMN manager_email VARCHAR(255) DEFAULT NULL,
ADD COLUMN manager_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN department VARCHAR(100) DEFAULT NULL,
ADD COLUMN location_code VARCHAR(10) DEFAULT NULL,
ADD COLUMN is_profile_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Index for manager lookup
CREATE INDEX idx_users_manager_email ON users(manager_email);

-- 2. UPDATE TRIPS TABLE (thêm approval workflow fields)
ALTER TABLE trips
ADD COLUMN manager_email VARCHAR(255) DEFAULT NULL COMMENT 'Manager email at time of submission',
ADD COLUMN manager_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN manager_approval_status ENUM('pending', 'approved', 'rejected', 'expired', 'escalated') DEFAULT 'pending',
ADD COLUMN manager_approval_token VARCHAR(500) DEFAULT NULL COMMENT 'JWT token for email approval',
ADD COLUMN manager_approval_token_expires DATETIME DEFAULT NULL,
ADD COLUMN manager_approved_at DATETIME DEFAULT NULL,
ADD COLUMN manager_approved_by VARCHAR(255) DEFAULT NULL,
ADD COLUMN manager_rejection_reason TEXT DEFAULT NULL,
ADD COLUMN is_urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN escalated_to VARCHAR(255) DEFAULT NULL COMMENT 'Plant Manager email if escalated',
ADD COLUMN escalated_at DATETIME DEFAULT NULL,
ADD COLUMN admin_override BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_override_reason TEXT DEFAULT NULL,
ADD COLUMN admin_override_by VARCHAR(255) DEFAULT NULL,
ADD COLUMN admin_override_at DATETIME DEFAULT NULL,
ADD COLUMN email_sent_at DATETIME DEFAULT NULL,
ADD COLUMN email_reminder_sent_at DATETIME DEFAULT NULL,
ADD COLUMN email_delivery_status ENUM('pending', 'sent', 'delivered', 'bounced', 'failed') DEFAULT 'pending';

-- Indexes
CREATE INDEX idx_trips_manager_approval ON trips(manager_approval_status);
CREATE INDEX idx_trips_manager_email ON trips(manager_email);
CREATE INDEX idx_trips_urgent ON trips(is_urgent);
CREATE INDEX idx_trips_token_expires ON trips(manager_approval_token_expires);

-- 3. CREATE APPROVAL_LOGS TABLE (audit trail)
CREATE TABLE approval_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trip_id INT NOT NULL,
  action ENUM(
    'submitted',
    'email_sent',
    'email_reminder_sent',
    'email_bounced',
    'manager_approved',
    'manager_rejected',
    'expired',
    'escalated',
    'admin_override',
    'admin_confirmed',
    'optimized',
    'cancelled'
  ) NOT NULL,
  performed_by VARCHAR(255) NOT NULL,
  performed_by_role ENUM('user', 'manager', 'admin', 'system') NOT NULL,
  notes TEXT DEFAULT NULL,
  metadata JSON DEFAULT NULL COMMENT 'Additional context data',
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  INDEX idx_approval_logs_trip (trip_id),
  INDEX idx_approval_logs_action (action),
  INDEX idx_approval_logs_date (created_at)
);

-- 4. CREATE ESCALATION_RULES TABLE
CREATE TABLE escalation_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  location_code VARCHAR(10) NOT NULL,
  plant_manager_email VARCHAR(255) NOT NULL,
  plant_manager_name VARCHAR(255) NOT NULL,
  hr_manager_email VARCHAR(255) DEFAULT NULL,
  admin_email VARCHAR(255) NOT NULL,
  timeout_hours INT DEFAULT 48 COMMENT 'Hours before escalation',
  urgent_timeout_hours INT DEFAULT 4 COMMENT 'Hours for urgent trips',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_location (location_code)
);

-- Insert default escalation rules
INSERT INTO escalation_rules (location_code, plant_manager_email, plant_manager_name, admin_email) VALUES
('HCM', 'pm.hcm@intersnack.com.vn', 'Plant Manager HCM', 'admin@intersnack.com.vn'),
('PT', 'pm.phanthiet@intersnack.com.vn', 'Plant Manager Phan Thiet', 'admin@intersnack.com.vn'),
('LA', 'pm.longan@intersnack.com.vn', 'Plant Manager Long An', 'admin@intersnack.com.vn'),
('TN', 'pm.tayninh@intersnack.com.vn', 'Plant Manager Tay Ninh', 'admin@intersnack.com.vn');

-- 5. CREATE EMAIL_LOGS TABLE (track all emails)
CREATE TABLE email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trip_id INT DEFAULT NULL,
  email_type ENUM('approval_request', 'reminder', 'escalation', 'rejection_notice', 'confirmation', 'cancellation') NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255) DEFAULT NULL,
  cc_emails TEXT DEFAULT NULL,
  subject VARCHAR(500) NOT NULL,
  status ENUM('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed') DEFAULT 'queued',
  sent_at DATETIME DEFAULT NULL,
  delivered_at DATETIME DEFAULT NULL,
  opened_at DATETIME DEFAULT NULL,
  bounce_reason TEXT DEFAULT NULL,
  message_id VARCHAR(255) DEFAULT NULL COMMENT 'Email provider message ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
  INDEX idx_email_logs_trip (trip_id),
  INDEX idx_email_logs_status (status),
  INDEX idx_email_logs_recipient (recipient_email)
);

-- 6. VIEW: Trips cần Admin xử lý exception
CREATE OR REPLACE VIEW v_trips_exceptions AS
SELECT 
  t.*,
  u.name as user_name,
  u.email as user_email,
  CASE 
    WHEN t.manager_approval_status = 'expired' THEN 'TIMEOUT'
    WHEN t.email_delivery_status IN ('bounced', 'failed') THEN 'EMAIL_FAILED'
    WHEN t.is_urgent = TRUE AND t.manager_approval_status = 'pending' THEN 'URGENT'
    WHEN t.manager_approval_status = 'escalated' THEN 'ESCALATED'
    ELSE 'OTHER'
  END as exception_type,
  TIMESTAMPDIFF(HOUR, t.email_sent_at, NOW()) as hours_since_email
FROM trips t
JOIN users u ON t.user_id = u.id
WHERE 
  t.manager_approval_status IN ('pending', 'expired', 'escalated')
  AND (
    t.email_delivery_status IN ('bounced', 'failed')
    OR (t.manager_approval_status = 'pending' AND t.manager_approval_token_expires < NOW())
    OR t.is_urgent = TRUE
    OR t.manager_approval_status = 'escalated'
  )
ORDER BY 
  t.is_urgent DESC,
  t.departure_date ASC;`}</pre>
              </div>
            </div>
          )}

          {/* Section 6: API Endpoints */}
          {activeSection === 'api' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                🔌 API Endpoints
              </h2>

              <div className="space-y-4">
                {/* Endpoint 1 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-green-600 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <code>/api/trips/submit</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">User submit trip mới - Trigger gửi email cho Manager</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      <div className="text-gray-400">// Request Body</div>
                      {`{
  "departureLocation": "HCM",
  "destination": "PT",
  "departureDate": "2025-01-15",
  "departureTime": "08:00",
  "returnDate": "2025-01-15",
  "returnTime": "17:00",
  "purpose": "Factory visit",
  "passengers": 1
}`}
                    </div>
                    <div className="bg-gray-800 text-blue-400 p-3 rounded text-xs font-mono mt-2">
                      <div className="text-gray-400">// Response</div>
                      {`{
  "success": true,
  "tripId": "trip_abc123",
  "status": "manager_pending",
  "message": "Trip submitted. Approval email sent to manager.",
  "managerEmail": "manager@intersnack.com.vn",
  "tokenExpires": "2025-01-12T10:00:00Z"
}`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 2 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                    <code>/api/approval/:token</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Manager click link từ email - Verify token & process approval</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      <div className="text-gray-400">// Token payload (decoded JWT)</div>
                      {`{
  "tripId": "trip_abc123",
  "action": "approve", // hoặc "reject"
  "managerEmail": "manager@intersnack.com.vn",
  "exp": 1736668800 // 48h expiry
}`}
                    </div>
                    <div className="bg-gray-800 text-blue-400 p-3 rounded text-xs font-mono mt-2">
                      <div className="text-gray-400">// Response - Redirect to confirmation page</div>
                      {`// Success: Redirect to /approval/success?trip=abc123
// Expired: Redirect to /approval/expired
// Invalid: Redirect to /approval/error`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 3 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-orange-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-orange-600 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <code>/api/approval/reject</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Manager reject với lý do (optional form sau khi click reject)</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      {`{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "reason": "Budget not approved for this month"
}`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 4 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-purple-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-purple-600 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <code>/api/admin/override-approval</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Admin override approval (bypass manager)</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      {`{
  "tripId": "trip_abc123",
  "action": "approve",
  "reason": "Manager không phản hồi - Urgent trip",
  "notes": "Đã liên hệ manager qua phone, OK"
}`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 5 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-pink-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-pink-600 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <code>/api/admin/escalate</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Admin escalate lên Plant Manager</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      {`{
  "tripId": "trip_abc123",
  "escalateTo": "pm.hcm@intersnack.com.vn",
  "notes": "Direct manager on leave"
}`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 6 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-teal-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-teal-600 px-2 py-0.5 rounded text-xs font-bold">POST</span>
                    <code>/api/admin/resend-approval-email</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Gửi lại email approval (new token)</p>
                    <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono">
                      {`{
  "tripId": "trip_abc123",
  "newManagerEmail": "new.manager@intersnack.com.vn" // optional
}`}
                    </div>
                  </div>
                </div>

                {/* Endpoint 7 */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-600 text-white px-4 py-2 flex items-center gap-2">
                    <span className="bg-white text-gray-600 px-2 py-0.5 rounded text-xs font-bold">GET</span>
                    <code>/api/admin/exceptions</code>
                  </div>
                  <div className="p-4 bg-gray-50">
                    <p className="text-sm text-gray-600 mb-2">Lấy danh sách trips cần xử lý ngoại lệ</p>
                    <div className="bg-gray-800 text-blue-400 p-3 rounded text-xs font-mono">
                      {`{
  "exceptions": [
    {
      "tripId": "trip_abc123",
      "type": "TIMEOUT",
      "user": "Nguyen Van A",
      "route": "HCM → PT",
      "hoursSinceEmail": 52,
      "isUrgent": false
    },
    {
      "tripId": "trip_def456",
      "type": "EMAIL_FAILED",
      "user": "Tran Thi B",
      "route": "HCM → LA",
      "bounceReason": "Mailbox not found"
    }
  ]
}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Email Templates */}
          {activeSection === 'email' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                ✉️ Email Templates
              </h2>

              {/* Email 1: Approval Request */}
              <div className="border-2 border-blue-400 rounded-xl mb-6 overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2 font-bold">
                  📧 Email 1: Approval Request (gửi Manager)
                </div>
                <div className="p-4 bg-blue-50">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="border-b pb-3 mb-3">
                      <div className="text-sm text-gray-500">To: <span className="text-gray-800">manager@intersnack.com.vn</span></div>
                      <div className="text-sm text-gray-500">CC: <span className="text-gray-800">pm@intersnack.com.vn, hr@intersnack.com.vn, admin@intersnack.com.vn</span></div>
                      <div className="text-sm text-gray-500">Subject: <span className="text-gray-800 font-bold">[Action Required] Trip Approval - Nguyen Van A - HCM → Phan Thiet</span></div>
                    </div>
                    <div className="text-sm space-y-3">
                      <p>Kính gửi Anh/Chị <strong>Manager Name</strong>,</p>
                      <p>Nhân viên <strong>Nguyen Van A</strong> (nguyen.a@intersnack.com.vn) đã đăng ký chuyến công tác cần sự phê duyệt của Anh/Chị:</p>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <table className="text-sm">
                          <tbody>
                            <tr><td className="pr-4 text-gray-500">Tuyến đường:</td><td className="font-medium">HCM → Phan Thiet</td></tr>
                            <tr><td className="pr-4 text-gray-500">Ngày đi:</td><td>15/01/2025 - 08:00</td></tr>
                            <tr><td className="pr-4 text-gray-500">Ngày về:</td><td>15/01/2025 - 17:00</td></tr>
                            <tr><td className="pr-4 text-gray-500">Mục đích:</td><td>Factory visit - Quality check</td></tr>
                            <tr><td className="pr-4 text-gray-500">Số người:</td><td>1</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <p>Vui lòng phê duyệt hoặc từ chối yêu cầu này:</p>
                      <div className="flex gap-3 py-2">
                        <a href="#" className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-bold text-center no-underline">✅ APPROVE</a>
                        <a href="#" className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg font-bold text-center no-underline">❌ REJECT</a>
                      </div>
                      <p className="text-xs text-gray-500 italic">⚠️ Link này sẽ hết hạn sau 48 giờ. Nếu không phản hồi, yêu cầu sẽ được chuyển lên Plant Manager.</p>
                      <p className="text-gray-500">Trân trọng,<br />Trips Management System</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 2: Reminder */}
              <div className="border-2 border-yellow-400 rounded-xl mb-6 overflow-hidden">
                <div className="bg-yellow-500 text-white px-4 py-2 font-bold">
                  📧 Email 2: Reminder (24h trước khi hết hạn)
                </div>
                <div className="p-4 bg-yellow-50">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="border-b pb-3 mb-3">
                      <div className="text-sm text-gray-500">Subject: <span className="text-gray-800 font-bold">⏰ [Reminder] Pending Approval - Nguyen Van A - HCM → Phan Thiet</span></div>
                    </div>
                    <div className="text-sm space-y-3">
                      <p className="text-orange-600 font-bold">⚠️ Yêu cầu phê duyệt này sẽ hết hạn trong 24 giờ!</p>
                      <p>Nếu không có phản hồi, yêu cầu sẽ được tự động chuyển lên Plant Manager để xử lý.</p>
                      <div className="flex gap-3 py-2">
                        <a href="#" className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-bold">✅ APPROVE</a>
                        <a href="#" className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg font-bold">❌ REJECT</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 3: User Notification - Approved */}
              <div className="border-2 border-green-400 rounded-xl mb-6 overflow-hidden">
                <div className="bg-green-600 text-white px-4 py-2 font-bold">
                  📧 Email 3: Thông báo User - Đã được Approve
                </div>
                <div className="p-4 bg-green-50">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="border-b pb-3 mb-3">
                      <div className="text-sm text-gray-500">To: <span className="text-gray-800">nguyen.a@intersnack.com.vn</span></div>
                      <div className="text-sm text-gray-500">Subject: <span className="text-gray-800 font-bold">✅ Trip Approved - HCM → Phan Thiet - 15/01/2025</span></div>
                    </div>
                    <div className="text-sm space-y-3">
                      <p>Chào <strong>Nguyen Van A</strong>,</p>
                      <p className="text-green-600 font-bold">✅ Chuyến công tác của bạn đã được phê duyệt!</p>
                      <div className="bg-green-100 rounded-lg p-3">
                        <div className="font-bold text-green-800 mb-2">Chi tiết chuyến đi:</div>
                        <table className="text-sm">
                          <tbody>
                            <tr><td className="pr-4 text-gray-500">Tuyến:</td><td>HCM → Phan Thiet</td></tr>
                            <tr><td className="pr-4 text-gray-500">Ngày:</td><td>15/01/2025</td></tr>
                            <tr><td className="pr-4 text-gray-500">Giờ:</td><td>08:00</td></tr>
                            <tr><td className="pr-4 text-gray-500">Phê duyệt bởi:</td><td>Manager Name</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <p>Admin sẽ sắp xếp xe và thông báo chi tiết cho bạn sớm nhất.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email 4: User Notification - Rejected */}
              <div className="border-2 border-red-400 rounded-xl overflow-hidden">
                <div className="bg-red-600 text-white px-4 py-2 font-bold">
                  📧 Email 4: Thông báo User - Bị Reject
                </div>
                <div className="p-4 bg-red-50">
                  <div className="bg-white rounded-lg p-4 shadow">
                    <div className="border-b pb-3 mb-3">
                      <div className="text-sm text-gray-500">Subject: <span className="text-gray-800 font-bold">❌ Trip Rejected - HCM → Phan Thiet - 15/01/2025</span></div>
                    </div>
                    <div className="text-sm space-y-3">
                      <p>Chào <strong>Nguyen Van A</strong>,</p>
                      <p className="text-red-600 font-bold">❌ Rất tiếc, chuyến công tác của bạn đã bị từ chối.</p>
                      <div className="bg-red-100 rounded-lg p-3">
                        <div className="font-bold text-red-800 mb-1">Lý do:</div>
                        <p className="text-red-700">Budget không được phê duyệt cho tháng này. Vui lòng đăng ký lại vào tháng sau.</p>
                      </div>
                      <p>Nếu có thắc mắc, vui lòng liên hệ Manager hoặc Admin.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Trips Management System - Email-Based Approval Documentation</p>
          <p className="text-xs mt-1">Version 1.0 - Intersnack Vietnam</p>
        </div>
      </div>
    </div>
  );
};

export default EmailBasedApprovalSystem;
