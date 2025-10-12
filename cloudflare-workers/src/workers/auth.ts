import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { sign } from '@tsndr/cloudflare-worker-jwt';
import type { Env, SignupRequest, LoginRequest, SessionData } from '../types';
import { generateId, getCurrentTimestamp, isValidEmail, isStrongPassword } from '../utils/crypto';
import { requireAuth } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/signup
auth.post('/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json<SignupRequest>();

    // Validation
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    if (!isStrongPassword(password)) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if email already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const userId = generateId();
    const now = getCurrentTimestamp();

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, email.toLowerCase(), passwordHash, name || null, now, now).run();

    // Create default settings for user with their email as default_email
    const settingsId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO settings (id, user_id, default_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(settingsId, userId, email.toLowerCase(), now, now).run();

    return c.json({
      success: true,
      userId,
      message: 'User created successfully'
    }, 201);

  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<LoginRequest>();

    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    // Fetch user
    const user = await c.env.DB.prepare(`
      SELECT id, email, password_hash, name, is_active
      FROM users
      WHERE email = ?
    `).bind(email.toLowerCase()).first();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if user is active
    if (user.is_active !== 1) {
      return c.json({ error: 'Account is disabled' }, 403);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash as string);

    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate JWT
    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
      },
      c.env.JWT_SECRET
    );

    // Store session in KV
    const sessionId = generateId();
    const sessionData: SessionData = {
      userId: user.id as string,
      email: user.email as string,
      sessionId,
      createdAt: getCurrentTimestamp()
    };

    await c.env.KV.put(
      `session:${token}`,
      JSON.stringify(sessionData),
      { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
    );

    // Update last login
    await c.env.DB.prepare(`
      UPDATE users
      SET last_login = ?
      WHERE id = ?
    `).bind(getCurrentTimestamp(), user.id).run();

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No authorization token' }, 401);
    }

    const token = authHeader.substring(7);

    // Delete session from KV
    await c.env.KV.delete(`session:${token}`);

    return c.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  const auth = await requireAuth(c.req.raw, c.env);

  if (auth instanceof Response) {
    return auth;
  }

  try {
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, created_at, last_login
      FROM users
      WHERE id = ?
    `).bind(auth.userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;
