/**
 * Input Validation Utilities
 * Centralized validation functions to prevent injection attacks
 */

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 50) return false;
  // Allow alphanumeric, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 256) return false;
  return true;
}

export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateGameId(gameId: string): boolean {
  if (!gameId || typeof gameId !== 'string') return false;
  if (gameId.trim().length === 0) return false;
  return validateUUID(gameId);
}

export function validateAmount(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  if (amount <= 0 || amount > 1000000) return false; // Max $1M
  return true;
}

export function sanitizeString(str: string, maxLength: number = 1000): string {
  if (!str) return '';
  return str.substring(0, maxLength).trim();
}

export function validatePaymentMethod(method: string): boolean {
  if (!method || typeof method !== 'string') return false;
  if (method.length < 2 || method.length > 100) return false;
  // Allow alphanumeric and common payment method names
  const methodRegex = /^[a-zA-Z0-9_\-.\s]+$/;
  return methodRegex.test(method);
}

/**
 * Validate request body doesn't contain suspicious patterns
 */
export function isSuspiciousInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bOR\b.*=.*)/i,
    /(\bDROP\b)/i,
    /(\bUNION\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b)/i,
    /(\bUPDATE\b)/i,
    /(\bDELETE\b)/i,
    /(-{2}|\/\*|\*\/)/,
  ];
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) return true;
  }
  
  // Check for script tags
  if (/<script|<iframe|<img|onerror|onclick/i.test(input)) return true;
  
  return false;
}
