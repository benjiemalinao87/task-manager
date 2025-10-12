import { verify } from '@tsndr/cloudflare-worker-jwt';
import type { Env, AuthContext, SessionData } from '../types';

export async function requireAuth(
  request: Request,
  env: Env
): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - No token provided' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT signature
    const isValid = await verify(token, env.JWT_SECRET);

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check session in KV
    const sessionData = await env.KV.get(`session:${token}`, 'json') as SessionData | null;

    if (!sessionData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Session expired' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return {
      userId: sessionData.userId,
      userEmail: sessionData.email
    };

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
