/**
 * Input Validation Module
 *
 * Provides server-side validation for all user inputs.
 *
 * SECURITY PRINCIPLE: Never trust client-side validation
 * - Client-side validation is for UX only (quick feedback)
 * - ALL validation must be duplicated on server
 * - Attackers can bypass client-side checks using browser dev tools, curl, etc.
 *
 * Validation Strategies:
 * - Whitelist validation (only accept known-good values)
 * - Length limits (prevent DoS and buffer overflows)
 * - Format validation (regex for structured data)
 * - Type checking (ensure correct data types)
 */

/**
 * Validate email address
 *
 * Uses simplified regex pattern that catches 99.9% of real emails
 *
 * SOURCE: General email validation pattern (public domain)
 *
 * TRADE-OFFS:
 * - Full RFC 5322 compliance is extremely complex (supports comments, quoted strings, IP addresses)
 * - This pattern is simpler, more readable, and catches invalid emails
 * - Edge cases not supported: emails with comments, quoted local parts, IP domain literals
 * - ACCEPTABLE because these edge cases are rare in practice
 * - Production should also verify email with confirmation link (stronger validation)
 *
 * @param email - Email address to validate
 * @returns boolean - True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Must not be empty
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Maximum length (prevents excessively long inputs)
  if (email.length > 255) {
    return false;
  }

  // Simplified email regex
  // Requires: localpart @ domain . tld
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);
}

/**
 * Validate password strength
 *
 * Requirements:
 * - Minimum 8 characters (NIST recommendation)
 * - At least one letter (a-z or A-Z)
 * - At least one number (0-9)
 *
 * TRADE-OFFS:
 * - More complex requirements (special chars, mixed case) often lead to predictable patterns
 * - Example: "Password1!" is common and weak despite meeting complex requirements
 * - Length is the most important factor for password strength
 * - Production should check against Have I Been Pwned API (compromised passwords database)
 *
 * @param password - Password to validate
 * @returns boolean - True if password meets requirements
 */
export function isStrongPassword(password: string): boolean {
  // Must not be empty
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Minimum length
  if (password.length < 8) {
    return false;
  }

  // Maximum length (prevents DoS via extremely long passwords)
  if (password.length > 128) {
    return false;
  }

  // Must contain at least one letter
  const hasLetter = /[a-zA-Z]/.test(password);

  // Must contain at least one number
  const hasNumber = /[0-9]/.test(password);

  return hasLetter && hasNumber;
}

/**
 * Sanitize string input
 *
 * Trims whitespace and enforces length limits
 *
 * @param input - String to sanitize
 * @param maxLength - Maximum allowed length
 * @returns string - Sanitized string
 */
export function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate item visibility value
 *
 * WHITELIST VALIDATION: Only accept known-good values
 * This prevents unexpected values from being stored in database
 *
 * @param visibility - Visibility value to validate
 * @returns 'private' | 'public' - Valid visibility value (defaults to 'private')
 */
export function validateVisibility(visibility: any): 'private' | 'public' {
  // Whitelist: only these values are allowed
  const allowedValues: ('private' | 'public')[] = ['private', 'public'];

  if (allowedValues.includes(visibility)) {
    return visibility;
  }

  // Default to private (most secure option)
  return 'private';
}

/**
 * Validate user role value
 *
 * WHITELIST VALIDATION: Only accept known-good values
 *
 * SECURITY: Never trust role from client input
 * - This should only be used for admin-assigned roles
 * - Regular registration should always default to 'user'
 *
 * @param role - Role value to validate
 * @returns 'user' | 'admin' - Valid role value (defaults to 'user')
 */
export function validateRole(role: any): 'user' | 'admin' {
  // Whitelist: only these values are allowed
  const allowedValues: ('user' | 'admin')[] = ['user', 'admin'];

  if (allowedValues.includes(role)) {
    return role;
  }

  // Default to user (least privileged)
  return 'user';
}

/**
 * Validate integer ID
 *
 * Ensures ID is a positive integer
 *
 * @param id - ID value to validate (string or number)
 * @returns number - Validated integer ID
 * @throws Error if ID is invalid
 */
export function validateId(id: any): number {
  const parsed = parseInt(id, 10);

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid ID: must be positive integer');
  }

  return parsed;
}

/**
 * Validate file upload
 *
 * Checks file type and size
 *
 * SECURITY:
 * - Whitelist MIME types (only allow known-safe image types)
 * - Size limit prevents DoS via large uploads
 * - Production should also check magic bytes (file signature)
 *
 * @param file - File object
 * @param options - Validation options
 * @returns boolean - True if file is valid
 */
export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSizeBytes?: number;
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  // Default configuration
  const allowedTypes = options.allowedTypes || [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  const maxSizeBytes = options.maxSizeBytes || 5 * 1024 * 1024;  // 5MB default

  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Validate MIME type (whitelist)
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  // Validate file size
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate text content length
 *
 * Ensures content is within acceptable length limits
 *
 * @param content - Text content
 * @param minLength - Minimum length (default 1)
 * @param maxLength - Maximum length
 * @returns boolean - True if length is valid
 */
export function validateContentLength(
  content: string,
  minLength: number = 1,
  maxLength: number
): { valid: boolean; error?: string } {
  if (typeof content !== 'string') {
    return { valid: false, error: 'Content must be a string' };
  }

  const trimmed = content.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Content too short (minimum ${minLength} characters)`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Content too long (maximum ${maxLength} characters)`,
    };
  }

  return { valid: true };
}
