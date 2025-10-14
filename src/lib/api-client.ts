const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

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
}

export const apiClient = new ApiClient(API_BASE_URL);

