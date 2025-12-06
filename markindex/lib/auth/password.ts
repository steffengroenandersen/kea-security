import { hash, verify } from "@node-rs/argon2";

// Copenhagen Book recommended Argon2id parameters:
// - Memory: 19456 KiB (19 MiB) - balanced for security/performance
// - Iterations: 2 - recommended minimum
// - Parallelism: 1 - single thread
// - Output length: 32 bytes
const HASH_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hash a password using Argon2id
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the Argon2id hash
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, HASH_OPTIONS);
}

/**
 * Verify a password against an Argon2id hash
 * @param hash - The Argon2id hash to verify against
 * @param password - The plaintext password to verify
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(hash, password, HASH_OPTIONS);
  } catch {
    // Invalid hash format or other error
    return false;
  }
}
