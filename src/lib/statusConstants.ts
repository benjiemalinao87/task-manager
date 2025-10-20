import {
  Clock,
  Loader,
  Eye,
  MessageSquare,
  CheckCircle,
  PlayCircle,
  Archive,
  AlertCircle,
  XCircle,
  Send,
  Ban
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface StatusConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string; // Tailwind background color class
  textColor: string; // Tailwind text color class
  iconColor?: string; // Optional specific icon color
  warning?: string; // Optional warning message when selecting this status
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  todo: {
    value: 'todo',
    label: 'To Do',
    icon: Clock,
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    warning: 'This task will be moved out of the active list. Continue?',
  },
  in_progress: {
    value: 'in_progress',
    label: 'In Progress',
    icon: Loader,
    color: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
  blocked: {
    value: 'blocked',
    label: 'Blocked',
    icon: AlertCircle,
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    warning: 'This task will be moved out of the active list. Continue?',
  },
  completed: {
    value: 'completed',
    label: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100',
    textColor: 'text-green-700',
    warning: 'This will mark the task as completed and move it out of the active list. Continue?',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-100',
    textColor: 'text-red-700',
    warning: 'This task will be moved out of the active list. Continue?',
  },
};

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, StatusConfig> = {
  draft: {
    value: 'draft',
    label: 'Draft',
    icon: Clock,
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  sent: {
    value: 'sent',
    label: 'Sent',
    icon: Send,
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  paid: {
    value: 'paid',
    label: 'Paid',
    icon: CheckCircle,
    color: 'bg-green-100',
    textColor: 'text-green-700',
  },
  overdue: {
    value: 'overdue',
    label: 'Overdue',
    icon: XCircle,
    color: 'bg-red-100',
    textColor: 'text-red-700',
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelled',
    icon: Ban,
    color: 'bg-gray-100',
    textColor: 'text-gray-500',
  },
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_CONFIG) as TaskStatus[];
export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_CONFIG) as InvoiceStatus[];
