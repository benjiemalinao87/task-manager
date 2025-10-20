import React from 'react';
import { TASK_STATUS_CONFIG, INVOICE_STATUS_CONFIG, TaskStatus, InvoiceStatus } from '../lib/statusConstants';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  type: 'task' | 'invoice';
  status: TaskStatus | InvoiceStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ type, status, className, showIcon = true }: StatusBadgeProps) {
  const config = type === 'task'
    ? TASK_STATUS_CONFIG[status as TaskStatus]
    : INVOICE_STATUS_CONFIG[status as InvoiceStatus];

  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        config.color,
        config.textColor,
        className
      )}
    >
      {showIcon && <Icon className="w-4 h-4" />}
      <span>{config.label}</span>
    </div>
  );
}
