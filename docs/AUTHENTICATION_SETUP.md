# Authentication Setup Guide

## Overview

Implement secure JWT-based authentication with Cloudflare Workers and KV for session management.

---

## Authentication Architecture

```
AUTHENTICATION FLOW DIAGRAM
═══════════════════════════

┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/signup
       │    { email, password }
       │
       ▼
┌──────────────────┐
│  Auth Worker     │
│  (Signup)        │
└──────┬───────────┘
       │
       │ 2. Hash password
       │    (bcrypt + salt)
       │
       ▼
┌──────────────────┐
│  D1 Database     │
│  INSERT user     │
└──────┬───────────┘
       │
       │ 3. User created
       │
       ▼
┌─────────────┐
│   Browser   │
│ Redirect to │
│    Login    │
└──────┬──────┘
       │
       │ 4. POST /api/auth/login
       │    { email, password }
       │
       ▼
┌──────────────────┐
│  Auth Worker     │
│  (Login)         │
└──────┬───────────┘
       │
       │ 5. Verify password
       │
       ▼
┌──────────────────┐
│  Auth Worker     │
│  Generate JWT    │
│  + Session ID    │
└──────┬───────────┘
       │
       │ 6. Store session in KV
       │
       ▼
┌──────────────────┐
│  Cloudflare KV   │
│  session:token   │
│  TTL: 7 days     │
└──────┬───────────┘
       │
       │ 7. Return JWT
       │
       ▼
┌─────────────┐
│   Browser   │
│ localStorage│
│ token: ABC  │
└──────┬──────┘
       │
       │ 8. All API requests
       │    Authorization: Bearer ABC
       │
       ▼
┌──────────────────┐
│  API Worker      │
│  (Protected)     │
└──────┬───────────┘
       │
       │ 9. Auth Middleware
       │    Verify JWT + KV
       │
       ▼
┌──────────────────┐
│  Cloudflare KV   │
│  Check session   │
└──────┬───────────┘
       │
       │ Valid? Continue
       │ Invalid? 401
       │
       ▼
┌──────────────────┐
│  API Worker      │
│  req.userId = X  │
│  Process request │
└──────────────────┘
```

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install --save \
  @tsndr/cloudflare-worker-jwt \
  bcryptjs

npm install --save-dev \
  @types/bcryptjs
```

### Step 2: Create Auth Workers

#### 2.1 Signup Worker

```typescript
// src/workers/auth-signup.ts

import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { email, password, name } = await request.json();

      // Validation
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Password strength validation
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if email already exists
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email.toLowerCase()).first();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: 'Email already registered' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user
      const userId = randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userId, email.toLowerCase(), passwordHash, name || null, now, now).run();

      // Create default settings for user
      const settingsId = randomUUID();
      await env.DB.prepare(`
        INSERT INTO settings (id, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).bind(settingsId, userId, now, now).run();

      return new Response(
        JSON.stringify({
          success: true,
          userId,
          message: 'User created successfully'
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Signup error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
```

#### 2.2 Login Worker

```typescript
// src/workers/auth-login.ts

import bcrypt from 'bcryptjs';
import { sign } from '@tsndr/cloudflare-worker-jwt';
import { randomUUID } from 'crypto';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fetch user
      const user = await env.DB.prepare(`
        SELECT id, email, password_hash, name, is_active
        FROM users
        WHERE email = ?
      `).bind(email.toLowerCase()).first();

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is active
      if (user.is_active !== 1) {
        return new Response(
          JSON.stringify({ error: 'Account is disabled' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid email or password' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Generate JWT
      const token = await sign(
        {
          userId: user.id,
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
        },
        env.JWT_SECRET
      );

      // Store session in KV
      const sessionId = randomUUID();
      await env.KV.put(
        `session:${token}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          sessionId,
          createdAt: new Date().toISOString()
        }),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
      );

      // Update last login
      await env.DB.prepare(`
        UPDATE users
        SET last_login = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), user.id).run();

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Login error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
```

#### 2.3 Logout Worker

```typescript
// src/workers/auth-logout.ts

interface Env {
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'No authorization token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.substring(7);

      // Delete session from KV
      await env.KV.delete(`session:${token}`);

      return new Response(
        JSON.stringify({ message: 'Logged out successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Logout error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};
```

#### 2.4 Auth Middleware

```typescript
// src/middleware/auth.ts

import { verify } from '@tsndr/cloudflare-worker-jwt';

interface Env {
  KV: KVNamespace;
  JWT_SECRET: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ userId: string; userEmail: string } | Response> {

  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  // Verify JWT signature
  const isValid = await verify(token, env.JWT_SECRET);

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check session in KV
  const sessionData = await env.KV.get(`session:${token}`, 'json');

  if (!sessionData) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Session expired' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return {
    userId: sessionData.userId,
    userEmail: sessionData.email
  };
}
```

### Step 3: Update Protected Workers

Example: Tasks Worker with Auth

```typescript
// src/workers/api-tasks.ts

import { requireAuth } from '../middleware/auth';

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Require authentication
    const auth = await requireAuth(request, env);

    // If auth returns Response, it's an error
    if (auth instanceof Response) {
      return auth;
    }

    const { userId } = auth;

    // GET /api/tasks - List user's tasks
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || 'in_progress';

      const tasks = await env.DB.prepare(`
        SELECT * FROM tasks
        WHERE user_id = ? AND status = ?
        ORDER BY created_at DESC
      `).bind(userId, status).all();

      return new Response(
        JSON.stringify(tasks.results),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // POST /api/tasks - Create task
    if (request.method === 'POST') {
      const { taskName, description, estimatedTime, taskLink } = await request.json();

      if (!taskName || !description || !estimatedTime) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const taskId = randomUUID();
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO tasks (
          id, user_id, task_name, description, estimated_time,
          task_link, started_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        taskId, userId, taskName, description, estimatedTime,
        taskLink || null, now, now, now
      ).run();

      const task = await env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
        .bind(taskId).first();

      return new Response(
        JSON.stringify(task),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405 });
  }
};
```

### Step 4: Configure Wrangler

```toml
# wrangler.toml

name = "task-manager-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "task-manager-db"
database_id = "<YOUR-DATABASE-ID>"

# KV Namespace for sessions
[[kv_namespaces]]
binding = "KV"
id = "<YOUR-KV-NAMESPACE-ID>"

# Secrets (set via: wrangler secret put JWT_SECRET)
# JWT_SECRET - Used for signing JWTs

# Routes
[[routes]]
pattern = "api.yourdomain.com/api/auth/*"
zone_name = "yourdomain.com"

[[routes]]
pattern = "api.yourdomain.com/api/*"
zone_name = "yourdomain.com"
```

### Step 5: Set Secrets

```bash
# Generate a strong JWT secret
openssl rand -base64 32

# Store in Cloudflare
wrangler secret put JWT_SECRET
# Paste the generated secret when prompted

# Verify
wrangler secret list
```

---

## Frontend Integration

### Auth Context (React)

```typescript
// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load token from localStorage on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    setToken(data.token);
    setUser(data.user);

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }
  };

  const logout = async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### API Client with Auth

```typescript
// src/api/client.ts

const API_BASE_URL = '/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Example usage:
export const tasksApi = {
  getAll: () => apiRequest<Task[]>('/tasks'),
  create: (task: CreateTaskDto) =>
    apiRequest<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    }),
  complete: (id: string, notes?: string) =>
    apiRequest<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', notes })
    })
};
```

---

## Security Considerations

### Password Requirements

- Minimum 8 characters
- Hash with bcrypt (salt rounds: 10)
- Store only hash, never plaintext

### JWT Security

- Sign with strong secret (32+ bytes)
- Set expiration (7 days max)
- Include only necessary claims
- Verify signature on every request

### Session Management

- Store sessions in KV with TTL
- Invalidate on logout
- Clean up expired sessions automatically
- Use secure, httpOnly cookies in production (optional)

### Rate Limiting

Implement rate limiting on auth endpoints:

```typescript
// Rate limit: 5 login attempts per 15 minutes
const rateKey = `ratelimit:login:${clientIP}`;
const attempts = await env.KV.get(rateKey);

if (attempts && parseInt(attempts) >= 5) {
  return new Response(
    JSON.stringify({ error: 'Too many attempts. Try again in 15 minutes.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}

await env.KV.put(rateKey, String(parseInt(attempts || '0') + 1), {
  expirationTtl: 900 // 15 minutes
});
```

---

## Testing

### Test Auth Flow

```bash
# Signup
curl -X POST https://api.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123","name":"Test User"}'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Use token in API requests
TOKEN="<your-jwt-token>"

curl -X GET https://api.yourdomain.com/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# Logout
curl -X POST https://api.yourdomain.com/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

After authentication is set up:

1. ✅ Proceed to [WORKERS_MIGRATION.md](./WORKERS_MIGRATION.md)
2. ✅ Add auth middleware to all protected endpoints
3. ✅ Update frontend with login/signup UI

---

**Last Updated:** 2025-10-12
