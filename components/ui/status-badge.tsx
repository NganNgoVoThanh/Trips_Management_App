// components/ui/status-badge.tsx
// Reusable status badge component with 14-status system colors

import { Badge } from "@/components/ui/badge";
import { TripStatus, getStatusBadge, getStatusIcon, getStatusLabel } from "@/lib/trip-status-config";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TripStatus;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, showIcon = true, size = "md", className }: StatusBadgeProps) {
  const badgeClasses = getStatusBadge(status);
  const icon = getStatusIcon(status);
  const label = getStatusLabel(status);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        badgeClasses,
        sizeClasses[size],
        "font-medium border whitespace-nowrap",
        className
      )}
    >
      {showIcon && <span className="mr-1.5">{icon}</span>}
      {label}
    </Badge>
  );
}

// Specific status badge variants for common use cases

export function PendingBadge({ urgent = false, size = "md" }: { urgent?: boolean; size?: "sm" | "md" | "lg" }) {
  return (
    <StatusBadge
      status={urgent ? "pending_urgent" : "pending_approval"}
      size={size}
    />
  );
}

export function ApprovedBadge({ auto = false, solo = false, size = "md" }: { auto?: boolean; solo?: boolean; size?: "sm" | "md" | "lg" }) {
  let status: TripStatus = "approved";
  if (auto) status = "auto_approved";
  if (solo) status = "approved_solo";

  return <StatusBadge status={status} size={size} />;
}

export function OptimizationBadge({ stage = "pending", size = "md" }: { stage?: "pending" | "proposed" | "optimized"; size?: "sm" | "md" | "lg" }) {
  const statusMap = {
    pending: "pending_optimization" as TripStatus,
    proposed: "proposed" as TripStatus,
    optimized: "optimized" as TripStatus,
  };

  return <StatusBadge status={statusMap[stage]} size={size} />;
}

export function RejectedBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <StatusBadge status="rejected" size={size} />;
}

export function CancelledBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <StatusBadge status="cancelled" size={size} />;
}

export function ExpiredBadge({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <StatusBadge status="expired" size={size} />;
}

// Manager approval status badge (separate from trip status)
export function ManagerApprovalBadge({
  status,
  size = "md"
}: {
  status: "pending" | "approved" | "rejected" | "expired";
  size?: "sm" | "md" | "lg";
}) {
  const config = {
    pending: {
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: "⏳",
      label: "Pending Approval",
    },
    approved: {
      badge: "bg-green-50 text-green-700 border-green-200",
      icon: "✓",
      label: "Approved",
    },
    rejected: {
      badge: "bg-red-50 text-red-700 border-red-200",
      icon: "❌",
      label: "Rejected",
    },
    expired: {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      icon: "⏱️",
      label: "Expired",
    },
  };

  const { badge, icon, label } = config[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        badge,
        sizeClasses[size],
        "font-medium border whitespace-nowrap"
      )}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </Badge>
  );
}

// Urgent trip indicator
export function UrgentIndicator({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-orange-50 text-orange-700 border-orange-200 font-semibold",
        "text-xs px-2 py-0.5 animate-pulse",
        className
      )}
    >
      <span className="mr-1">⚡</span>
      URGENT
    </Badge>
  );
}

// Auto-approved indicator
export function AutoApprovedIndicator({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-green-50 text-green-700 border-green-200 font-medium",
        "text-xs px-2 py-0.5",
        className
      )}
    >
      <span className="mr-1">✅</span>
      AUTO
    </Badge>
  );
}
