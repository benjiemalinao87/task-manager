import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { TASK_STATUS_CONFIG, INVOICE_STATUS_CONFIG, TaskStatus, InvoiceStatus, TASK_STATUSES, INVOICE_STATUSES } from '../lib/statusConstants';
import { Tag, Ban } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatusSelectorProps {
  type: 'task' | 'invoice';
  value: TaskStatus | InvoiceStatus | null;
  onChange: (status: TaskStatus | InvoiceStatus | null) => void;
  placeholder?: string;
  allowNoStatus?: boolean;
  className?: string;
}

export function StatusSelector({
  type,
  value,
  onChange,
  placeholder = 'Set status',
  allowNoStatus = true,
  className
}: StatusSelectorProps) {
  const statusConfig = type === 'task' ? TASK_STATUS_CONFIG : INVOICE_STATUS_CONFIG;
  const statuses = type === 'task' ? TASK_STATUSES : INVOICE_STATUSES;

  const selectedConfig = value ? statusConfig[value as keyof typeof statusConfig] : null;

  const handleStatusChange = (val: string) => {
    if (val === 'no-status') {
      onChange(null);
      return;
    }

    const newStatus = val as TaskStatus | InvoiceStatus;
    const config = statusConfig[newStatus as keyof typeof statusConfig];

    // Show warning if status has a warning message
    if (config && config.warning) {
      if (!window.confirm(config.warning)) {
        return; // User cancelled
      }
    }

    onChange(newStatus);
  };

  return (
    <Select
      value={value || 'no-status'}
      onValueChange={handleStatusChange}
    >
      <SelectTrigger className={cn('w-full sm:w-[200px]', className)}>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          {selectedConfig ? (
            <div className="flex items-center gap-1.5">
              <selectedConfig.icon className="w-4 h-4" />
              <span>{selectedConfig.label}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        {allowNoStatus && (
          <SelectItem value="no-status">
            <div className="flex items-center gap-2 py-1">
              <Ban className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">No status</span>
            </div>
          </SelectItem>
        )}
        {statuses.map((status) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;

          return (
            <SelectItem key={status} value={status}>
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
                  config.color,
                  config.textColor,
                  'w-full'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
