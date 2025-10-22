const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://task-manager-api-dev.benjiemalinao879557.workers.dev';

interface ApiError {
  error: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.reload();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth methods
  async signup(email: string, password: string, name?: string) {
    return this.post<{ success: boolean; userId: string; message: string }>(
      '/api/auth/signup',
      { email, password, name }
    );
  }

  async login(email: string, password: string) {
    return this.post<{ token: string; user: any }>('/api/auth/login', {
      email,
      password,
    });
  }

  async logout() {
    return this.post<{ message: string }>('/api/auth/logout');
  }

  async getMe() {
    return this.get<{ user: any }>('/api/auth/me');
  }

  // Task methods
  async getTasks(status: string = 'in_progress') {
    return this.get<any[]>(`/api/tasks?status=${status}`);
  }

  async createTask(task: {
    taskName: string;
    description: string;
    estimatedTime: string;
    taskLink?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    asanaProjectId?: string;
  }) {
    return this.post<any>('/api/tasks', task);
  }

  async updateTask(
    id: string,
    updates: { status?: string; notes?: string; actualTime?: string }
  ) {
    return this.patch<any>(`/api/tasks/${id}`, updates);
  }

  async deleteTask(id: string) {
    return this.delete<{ message: string }>(`/api/tasks/${id}`);
  }

  // Settings methods
  async getSettings() {
    return this.get<any>('/api/settings');
  }

  async updateSettings(updates: any) {
    return this.patch<any>('/api/settings', updates);
  }

  async saveNotificationPreferences(preferences: {
    notifyTaskCreated: boolean;
    notifyTaskCompleted: boolean;
    notifyDailySummary: boolean;
    notifyWeeklySummary: boolean;
  }) {
    return this.post<{ success: boolean; message: string; onboardingCompleted: boolean }>(
      '/api/settings/notifications',
      preferences
    );
  }

  // Onboarding methods
  async sendOnboardingInvitations(data: { emails: string[] }) {
    return this.post<{
      success: boolean;
      workspace: any;
      results: Array<{ email: string; status: string; message: string }>;
      message: string;
    }>(
      '/api/onboarding/invite-colleagues',
      data
    );
  }

  async completeOnboarding() {
    return this.post<{ success: boolean; message: string }>(
      '/api/onboarding/complete',
      {}
    );
  }

  // Time sessions methods
  async getActiveSession() {
    return this.get<{ session: any | null }>('/api/time-sessions/active');
  }

  async clockIn() {
    return this.post<{ session: any; message: string }>('/api/time-sessions/clock-in');
  }

  async clockOut() {
    return this.post<{ session: any; message: string; durationMinutes: number }>('/api/time-sessions/clock-out');
  }

  async getTimeSessions() {
    return this.get<any[]>('/api/time-sessions');
  }

  // Integrations methods
  async getIntegrations() {
    return this.get<any[]>('/api/integrations');
  }

  async getIntegration(type: string) {
    return this.get<any>(`/api/integrations/${type}`);
  }

  async saveIntegration(data: {
    integration_type: string;
    api_key: string;
    is_active: boolean;
    config?: any;
  }) {
    return this.post<{ integration: any; message: string }>('/api/integrations', data);
  }

  async deleteIntegration(type: string) {
    return this.delete<{ message: string }>(`/api/integrations/${type}`);
  }

  async testAsanaConnection(apiKey: string) {
    return this.post<{ success: boolean; user: any }>('/api/integrations/asana/test', { api_key: apiKey });
  }

  async getAsanaWorkspaces() {
    return this.get<{ workspaces: any[] }>('/api/integrations/asana/workspaces');
  }

  async getAsanaProjects(workspaceId: string) {
    return this.get<{ projects: any[] }>(`/api/integrations/asana/projects?workspace_id=${workspaceId}`);
  }

  async getAsanaProjectTasks(projectId: string) {
    return this.get<{ tasks: any[] }>(`/api/integrations/asana/projects/${projectId}/tasks`);
  }

  async importAsanaTask(data: {
    asanaTaskId: string;
    taskName: string;
    description: string;
    estimatedTime: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    asanaProjectId: string;
  }) {
    return this.post<any>('/api/integrations/asana/import', data);
  }

  // Invoice methods
  async getInvoices(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.get<any[]>(`/api/invoices${query}`);
  }

  async getInvoice(id: string) {
    return this.get<any>(`/api/invoices/${id}`);
  }

  async createInvoice(data: {
    clientName: string;
    clientEmail?: string;
    clientAddress?: string;
    clientCompany?: string;
    periodStart: string;
    periodEnd: string;
    invoiceDate: string;
    dueDate?: string;
    items: Array<{
      taskId?: string;
      description: string;
      quantity: number;
      rate: number;
    }>;
    taxRate?: number;
    discountAmount?: number;
    notes?: string;
    paymentTerms?: string;
  }) {
    return this.post<any>('/api/invoices', data);
  }

  async updateInvoice(id: string, updates: any) {
    return this.patch<any>(`/api/invoices/${id}`, updates);
  }

  async deleteInvoice(id: string) {
    return this.delete<{ message: string }>(`/api/invoices/${id}`);
  }

  async sendInvoiceEmail(id: string, data: { to: string; subject?: string; message?: string }) {
    return this.post<{ message: string }>(`/api/invoices/${id}/send`, data);
  }

  async generateInvoiceShareLink(id: string) {
    return this.post<{ shareUrl: string; token: string }>(`/api/invoices/${id}/share`, {});
  }

  async getInvoiceByShareToken(token: string) {
    return this.get<any>(`/api/invoices/share/${token}`);
  }

  async getBillableTasksForPeriod(periodStart: string, periodEnd: string) {
    return this.get<any[]>(`/api/invoices/tasks?period_start=${periodStart}&period_end=${periodEnd}`);
  }

  // Invoice settings methods
  async getInvoiceSettings() {
    return this.get<any>('/api/invoice-settings');
  }

  async updateInvoiceSettings(updates: any) {
    return this.patch<any>('/api/invoice-settings', updates);
  }

  // Client methods
  async getClients() {
    return this.get<any[]>('/api/clients');
  }

  async getClient(id: string) {
    return this.get<any>(`/api/clients/${id}`);
  }

  async createClient(data: {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    clientCompany?: string;
    notes?: string;
  }) {
    return this.post<any>('/api/clients', data);
  }

  async updateClient(id: string, updates: any) {
    return this.patch<any>(`/api/clients/${id}`, updates);
  }

  async deleteClient(id: string) {
    return this.delete<{ message: string }>(`/api/clients/${id}`);
  }

  // Workspace methods
  async getWorkspaces() {
    return this.get<{ workspaces: any[] }>('/api/workspaces');
  }

  async getWorkspace(id: string) {
    return this.get<{ workspace: any }>(`/api/workspaces/${id}`);
  }

  async createWorkspace(data: { name: string }) {
    return this.post<{ workspace: any }>('/api/workspaces', data);
  }

  async updateWorkspace(id: string, data: { name: string }) {
    return this.patch<{ workspace: any }>(`/api/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string) {
    return this.delete<{ success: boolean; message: string }>(`/api/workspaces/${id}`);
  }

  async getWorkspaceMembers(workspaceId: string) {
    return this.get<{ members: any[] }>(`/api/workspaces/${workspaceId}/members`);
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    return this.delete<{ success: boolean; message: string }>(
      `/api/workspaces/${workspaceId}/members/${userId}`
    );
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: 'admin' | 'member') {
    return this.patch<{ success: boolean; message: string; role: string }>(
      `/api/workspaces/${workspaceId}/members/${userId}/role`,
      { role }
    );
  }

  // Invitation methods
  async inviteToWorkspace(workspaceId: string, data: { email: string; role?: 'admin' | 'member' }) {
    return this.post<{ invitation: any }>(`/api/workspaces/${workspaceId}/invitations`, data);
  }

  async getWorkspaceInvitations(workspaceId: string) {
    return this.get<{ invitations: any[] }>(`/api/workspaces/${workspaceId}/invitations`);
  }

  async getPendingInvitations() {
    return this.get<{ invitations: any[] }>('/api/invitations/pending');
  }

  async acceptInvitation(token: string) {
    return this.post<{ success: boolean; workspace: any; message: string }>(
      `/api/invitations/${token}/accept`
    );
  }

  async declineInvitation(token: string) {
    return this.post<{ success: boolean; message: string }>(`/api/invitations/${token}/decline`);
  }

  async cancelInvitation(workspaceId: string, invitationId: string) {
    return this.delete<{ success: boolean; message: string }>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}`
    );
  }

  // Enhanced task methods with workspace support
  async getTasksWithFilters(filters: {
    status?: string;
    workspaceId?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.workspaceId) params.append('workspaceId', filters.workspaceId);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    return this.get<any[]>(`/api/tasks?${params.toString()}`);
  }

  async getTask(id: string) {
    return this.get<any>(`/api/tasks/${id}`);
  }

  async createTaskWithAssignment(task: {
    taskName: string;
    description: string;
    estimatedTime: string;
    taskLink?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    workspaceId?: string;
    assignedTo?: string;
    asanaProjectId?: string;
  }) {
    return this.post<any>('/api/tasks', task);
  }

  async assignTask(taskId: string, data: { assignedTo: string | null }) {
    return this.put<{ success: boolean; message: string }>(`/api/tasks/${taskId}/assign`, data);
  }

  // Reports methods
  async getHoursReport(workspaceId: string, filters: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string;
    includeDetails?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.groupBy) params.append('groupBy', filters.groupBy);
    if (filters.includeDetails) params.append('includeDetails', 'true');

    return this.get<any>(`/api/workspaces/${workspaceId}/reports/hours?${params.toString()}`);
  }

  async getTasksReport(workspaceId: string, filters: {
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  }) {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.status) params.append('status', filters.status);

    return this.get<any>(`/api/workspaces/${workspaceId}/reports/tasks?${params.toString()}`);
  }

  async getPerformanceReport(workspaceId: string, filters: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    return this.get<any>(`/api/workspaces/${workspaceId}/reports/performance?${params.toString()}`);
  }

  // PUT method for complete updates
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

