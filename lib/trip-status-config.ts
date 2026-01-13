// lib/trip-status-config.ts
// Centralized configuration for trip status

export type TripStatus =
  | 'pending_approval'
  | 'pending_urgent'
  | 'auto_approved'
  | 'approved'
  | 'approved_solo'
  | 'optimized'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'pending' // Legacy
  | 'confirmed'; // Legacy

export interface StatusConfig {
  badge: string;
  icon: string;
  label: string;
  description: string;
  userMessage: string;
  adminMessage: string;
  emailSubject: string;
}

export const TRIP_STATUS_CONFIG: Record<TripStatus, StatusConfig> = {
  // ==========================================
  // STAGE 1: WAITING FOR MANAGER APPROVAL
  // ==========================================

  pending_approval: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '⏳',
    label: 'Pending Approval',
    description: 'Waiting for manager approval',
    userMessage: 'Your trip request is waiting for manager approval',
    adminMessage: 'Trip awaiting manager approval',
    emailSubject: 'Trip Request - Approval Required',
  },

  pending_urgent: {
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '⚡',
    label: 'Pending (Urgent)',
    description: 'Urgent approval needed - Departure < 24h',
    userMessage: 'URGENT: Your trip request needs immediate approval',
    adminMessage: 'URGENT trip - requires priority processing',
    emailSubject: '⚠️ URGENT Trip Request - Immediate Approval Required',
  },

  // ==========================================
  // STAGE 2: MANAGER APPROVED
  // ==========================================

  auto_approved: {
    badge: 'bg-green-100 text-green-800 border-green-300',
    icon: '✅',
    label: 'Auto-Approved',
    description: 'Automatically approved (no manager assigned)',
    userMessage: 'Your trip has been automatically approved',
    adminMessage: 'Auto-approved (CEO/C-level - no manager)',
    emailSubject: 'Trip Request Auto-Approved',
  },

  approved: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: '✓',
    label: 'Approved',
    description: 'Manager approved - trip is ready',
    userMessage: 'Your trip has been approved by your manager',
    adminMessage: 'Trip approved by manager - ready to process',
    emailSubject: 'Trip Request Approved by Manager',
  },

  approved_solo: {
    badge: 'bg-green-100 text-green-800 border-green-300',
    icon: '✓',
    label: 'Approved',
    description: 'Manager approved - trip is ready',
    userMessage: 'Your trip has been approved by your manager',
    adminMessage: 'Trip approved by manager - ready to process',
    emailSubject: 'Trip Request Approved - Ready to Go',
  },

  // ==========================================
  // STAGE 3: OPTIMIZATION (OPTIONAL)
  // ==========================================

  optimized: {
    badge: 'bg-purple-100 text-purple-900 border-purple-400',
    icon: '🎯',
    label: 'Optimized',
    description: 'Trip successfully optimized for cost savings',
    userMessage: 'Your trip has been optimized for cost savings!',
    adminMessage: 'Trip optimized and finalized',
    emailSubject: 'Trip Optimized Successfully - Details Inside',
  },

  // ==========================================
  // TERMINAL STATES
  // ==========================================

  rejected: {
    badge: 'bg-red-100 text-red-800 border-red-300',
    icon: '❌',
    label: 'Rejected',
    description: 'Rejected by manager',
    userMessage: 'Your trip request was rejected by your manager',
    adminMessage: 'Trip rejected by manager',
    emailSubject: 'Trip Request Rejected',
  },

  cancelled: {
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '🚫',
    label: 'Cancelled',
    description: 'Cancelled by user',
    userMessage: 'You cancelled this trip',
    adminMessage: 'Trip cancelled by user',
    emailSubject: 'Trip Cancelled',
  },

  expired: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: '⏱️',
    label: 'Expired',
    description: 'Approval token expired (> 48 hours)',
    userMessage: 'Approval request expired - please contact admin',
    adminMessage: 'Approval expired - manual processing required',
    emailSubject: 'Trip Approval Expired - Action Required',
  },
  
  // Legacy support
  pending: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: '⏳',
    label: 'Pending',
    description: 'Waiting for manager approval',
    userMessage: 'Your trip request is waiting for manager approval',
    adminMessage: 'Trip awaiting manager approval',
    emailSubject: 'Trip Request - Approval Required',
  },
  confirmed: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: '✓',
    label: 'Confirmed',
    description: 'Manager approved, eligible for optimization',
    userMessage: 'Your trip is approved. We may combine it with similar trips for optimization.',
    adminMessage: 'Approved - can be optimized with similar trips',
    emailSubject: 'Trip Request Approved by Manager',
  },
};

// Helper functions
export function getStatusConfig(status: TripStatus): StatusConfig {
  return TRIP_STATUS_CONFIG[status];
}

export function getStatusLabel(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.label || status;
}

export function getStatusBadge(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.badge || 'bg-gray-100 text-gray-800';
}

export function getStatusIcon(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.icon || '❓';
}

export function getStatusDescription(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.description || '';
}

export function getUserMessage(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.userMessage || '';
}

export function getAdminMessage(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.adminMessage || '';
}

export function getEmailSubject(status: TripStatus): string {
  return TRIP_STATUS_CONFIG[status]?.emailSubject || 'Trip Status Update';
}

// Status categories for filtering
export const STATUS_CATEGORIES = {
  pending: ['pending_approval', 'pending_urgent'] as TripStatus[],
  approved: ['auto_approved', 'approved', 'approved_solo'] as TripStatus[],
  optimized: ['optimized'] as TripStatus[],
  terminal: ['rejected', 'cancelled', 'expired'] as TripStatus[],
  all: Object.keys(TRIP_STATUS_CONFIG) as TripStatus[],
};

// Check if status is final (no more changes expected)
export function isFinalStatus(status: TripStatus): boolean {
  return [
    'approved_solo',
    'optimized',
    'rejected',
    'cancelled',
    'auto_approved',
  ].includes(status);
}

// Check if status can be optimized (approved trips waiting for optimization)
export function canOptimize(status: TripStatus): boolean {
  return ['approved', 'auto_approved'].includes(status);
}

// Check if status is pending approval
export function isPendingApproval(status: TripStatus): boolean {
  return ['pending_approval', 'pending_urgent'].includes(status);
}

// Check if status is urgent
export function isUrgent(status: TripStatus): boolean {
  return status === 'pending_urgent';
}
