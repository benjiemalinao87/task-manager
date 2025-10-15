// Generate UUID (Web Crypto API)
export function generateId(): string {
  return crypto.randomUUID();
}

// Generate secure random token for invitations
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get current ISO timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Simple email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength validation
export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}
