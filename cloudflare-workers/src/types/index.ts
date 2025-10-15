// Environment bindings
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  EMAIL_QUEUE: Queue;
  AI_QUEUE: Queue;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  RESEND_API_KEY: string;  // Default email provider (customerconnects.com)
  SENDGRID_API_KEY?: string; // Optional fallback
}

// Database types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  plan_name: string;
  ai_tokens_used: number;
  ai_tokens_limit: number;
  ai_tokens_reset_at: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  email_verified: number;
  is_active: number;
}

export interface Task {
  id: string;
  user_id: string;
  task_name: string;
  description: string;
  estimated_time: string;
  actual_time: string | null;
  task_link: string | null;
  ai_summary: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  asana_task_id: string | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  default_email: string;
  timezone: string;
  notifications_enabled: number;
  notify_task_created: number;
  notify_task_completed: number;
  notify_daily_summary: number;
  notify_weekly_summary: number;
  email_subject_task_created: string;
  email_subject_task_completed: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSession {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  report_sent: number;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  user_id: string;
  integration_type: 'asana' | 'resend' | 'sendgrid';
  api_key: string;
  is_active: number;
  config: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response types
export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface CreateTaskRequest {
  taskName: string;
  description: string;
  estimatedTime: string;
  taskLink?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  asanaProjectId?: string;
}

export interface CompleteTaskRequest {
  taskId: string;
  notes?: string;
}

// Auth context
export interface AuthContext {
  userId: string;
  userEmail: string;
}

// Session data stored in KV
export interface SessionData {
  userId: string;
  email: string;
  sessionId: string;
  createdAt: string;
}

// Email queue messages
export interface EmailMessage {
  type: 'task_created' | 'task_completed' | 'daily_report' | 'clock_in';
  userId: string;
  email: string;
  taskId?: string;
  task?: {
    name: string;
    description: string;
    estimatedTime: string;
    actualTime?: string;
    aiSummary?: string;
    notes?: string;
  };
  sessionId?: string;
  session?: {
    clockIn: string;
    clockOut: string;
    durationMinutes: number;
    durationFormatted: string;
  };
  tasks?: Array<{
    taskName: string;
    description: string;
    estimatedTime: string;
    actualTime: string;
    aiSummary: string | null;
  }>;
}

// AI queue messages
export interface AIMessage {
  type: 'generate_summary';
  userId: string;
  taskId: string;
  taskName: string;
  description: string;
  estimatedTime: string;
  sendEmail: boolean;
}
