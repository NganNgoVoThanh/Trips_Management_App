'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, UserX, ChevronDown, ChevronUp } from 'lucide-react';

interface Trip {
  id: string;
  user_name: string;
  user_email: string;
  departure_location: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;
  purpose?: string;
  status: string;
  manager_approval_status?: string;
  is_urgent: boolean;
  auto_approved: boolean;
  cc_emails?: string[];
  created_at: string;
  manager_email?: string;
  manager_name?: string;
  hours_since_created: number;
}

interface ExceptionData {
  urgent: Trip[];
  expired: Trip[];
  autoApproved: Trip[];
  noManager: Trip[];
}

export default function ExceptionQueueClient() {
  const [exceptions, setExceptions] = useState<ExceptionData>({
    urgent: [],
    expired: [],
    autoApproved: [],
    noManager: [],
  });
  const [summary, setSummary] = useState({
    total: 0,
    urgent: 0,
    expired: 0,
    autoApproved: 0,
    noManager: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    urgent: true,
    expired: true,
    autoApproved: false,
    noManager: true,
  });

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      const response = await fetch('/api/admin/exception-queue');
      const data = await response.json();

      if (data.success) {
        setExceptions(data.exceptions);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch exceptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (tripId: string, action: 'approve' | 'reject') => {
    if (!confirm(`Confirm ${action === 'approve' ? 'approve' : 'reject'} this trip?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/exception-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, action }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Trip ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        fetchExceptions(); // Refresh data
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to process action:', error);
      alert('❌ An error occurred');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const TripCard = ({ trip, category }: { trip: Trip; category: string }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{trip.user_name}</h3>
            {trip.is_urgent && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                URGENT
              </span>
            )}
            {trip.auto_approved && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                AUTO
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Email:</strong> {trip.user_email}
            </p>
            <p>
              <strong>Lộ trình:</strong> {trip.departure_location} → {trip.destination}
            </p>
            <p>
              <strong>Khởi hành:</strong> {trip.departure_date} {trip.departure_time}
            </p>
            <p>
              <strong>Trở về:</strong> {trip.return_date} {trip.return_time}
            </p>
            {trip.purpose && (
              <p>
                <strong>Mục đích:</strong> {trip.purpose}
              </p>
            )}
            {trip.manager_email ? (
              <p>
                <strong>Manager:</strong> {trip.manager_name} ({trip.manager_email})
              </p>
            ) : (
              <p className="text-orange-600">
                <strong>Manager:</strong> Chưa chọn
              </p>
            )}
            <p className="text-xs text-gray-500">
              Tạo lúc: {new Date(trip.created_at).toLocaleString('vi-VN')} ({trip.hours_since_created}h trước)
            </p>
          </div>
        </div>

        {category !== 'autoApproved' && trip.manager_approval_status === 'pending' && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => handleAction(trip.id, 'approve')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => handleAction(trip.id, 'reject')}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const ExceptionSection = ({
    title,
    icon: Icon,
    color,
    count,
    trips,
    category,
  }: {
    title: string;
    icon: any;
    color: string;
    count: number;
    trips: Trip[];
    category: keyof typeof expandedSections;
  }) => {
    const isExpanded = expandedSections[category];

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <button
          onClick={() => toggleSection(category)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">{count} yêu cầu</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-6 py-4 bg-gray-50">
            {trips.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Không có yêu cầu nào</p>
            ) : (
              trips.map(trip => <TripCard key={trip.id} trip={trip} category={category} />)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exception Queue</h1>
          <p className="text-gray-600">Quản lý các trường hợp ngoại lệ cần xử lý</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">Tổng số</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{summary.urgent}</div>
            <div className="text-sm text-gray-600">Urgent</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{summary.expired}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{summary.autoApproved}</div>
            <div className="text-sm text-gray-600">Auto-approved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{summary.noManager}</div>
            <div className="text-sm text-gray-600">No Manager</div>
          </div>
        </div>

        {/* Exception Sections */}
        <ExceptionSection
          title="🚨 Urgent Trips (< 24h)"
          icon={AlertTriangle}
          color="bg-red-500"
          count={summary.urgent}
          trips={exceptions.urgent}
          category="urgent"
        />

        <ExceptionSection
          title="⏰ Expired Approval (> 48h)"
          icon={Clock}
          color="bg-orange-500"
          count={summary.expired}
          trips={exceptions.expired}
          category="expired"
        />

        <ExceptionSection
          title="👤 No Manager Assigned"
          icon={UserX}
          color="bg-purple-500"
          count={summary.noManager}
          trips={exceptions.noManager}
          category="noManager"
        />

        <ExceptionSection
          title="✅ Auto-Approved (Audit Log)"
          icon={CheckCircle}
          color="bg-green-500"
          count={summary.autoApproved}
          trips={exceptions.autoApproved}
          category="autoApproved"
        />
      </div>
    </div>
  );
}
