import React from 'react';
import type { ConsultationStatus, Priority, AmbulanceRequestStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full
      ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

const statusColors: Record<string, string> = {
  WAITING: 'default',
  AI_INTERVIEW: 'info',
  PROCESSING: 'warning',
  READY: 'success',
  NEEDS_REVIEW: 'purple',
  EMERGENCY: 'danger',
  COMPLETED: 'success',
  SEARCHING: 'warning',
  MATCHED: 'info',
  DRIVER_ASSIGNED: 'info',
  DRIVER_EN_ROUTE: 'info',
  ARRIVING: 'warning',
  PATIENT_PICKED_UP: 'purple',
  EN_ROUTE_HOSPITAL: 'info',
  ARRIVED: 'success',
  CANCELLED: 'default',
  NORMAL: 'default',
  HIGH: 'warning',
  CRITICAL: 'danger',
  ACTIVE: 'danger',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
  AVAILABLE: 'success',
  BUSY: 'warning',
  OFFLINE: 'default',
  MAINTENANCE: 'danger',
};

import { useTranslation } from '../../hooks/useTranslation';

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const variant = (statusColors[status] || 'default') as BadgeProps['variant'];
  const formatted = status.replace(/_/g, ' ');
  const label = t(`status.${status.toLowerCase()}`, t(status, formatted));
  return <Badge variant={variant} className={className}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  const icons: Record<Priority, string> = { NORMAL: '●', HIGH: '▲', CRITICAL: '🔴' };
  const variant = priority === 'CRITICAL' ? 'danger' : priority === 'HIGH' ? 'warning' : 'default';
  const label = t(`priority.${priority.toLowerCase()}`, t(priority, priority));
  return <Badge variant={variant as BadgeProps['variant']}>{icons[priority]} {label}</Badge>;
}
