/**
 * Database Connection Module
 *
 * Provides secure PostgreSQL connection using parameterized queries
 * to prevent SQL injection attacks.
 *
 * Security Features:
 * - Connection pooling for better resource management
 * - SSL/TLS in production
 * - Environment-based configuration
 * - No query string concatenation (always use parameters)
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Type-safe database configuration
interface DatabaseConfig {
  connectionString: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
  max?: number;  // Maximum number of clients in pool
  idleTimeoutMillis?: number;  // Close idle clients after milliseconds
  connectionTimeoutMillis?: number;  // Timeout for new client connections
}

// Create connection configuration based on environment
function getDatabaseConfig(): DatabaseConfig {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const config: DatabaseConfig = {
    connectionString,
    max: 20,  // Max 20 concurrent connections
    idleTimeoutMillis: 30000,  // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000,  // Timeout after 2 seconds
  };

  // Enable SSL in production
  if (process.env.NODE_ENV === 'production') {
    config.ssl = {
      rejectUnauthorized: true,  // Require valid SSL certificate
    };
  }

  return config;
}

// Create connection pool (singleton pattern)
const pool = new Pool(getDatabaseConfig());

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected database error:', err);
  // In production, send to error monitoring service (e.g., Sentry)
});

/**
 * Execute a parameterized query
 *
 * SECURITY: Always use parameterized queries to prevent SQL injection
 *
 * @example
 * // SECURE - Parameters passed separately
 * const result = await query(
 *   'SELECT * FROM users WHERE email = $1',
 *   ['user@example.com']
 * );
 *
 * @example
 * // INSECURE - NEVER DO THIS
 * const email = 'user@example.com';
 * const result = await query(`SELECT * FROM users WHERE email = '${email}'`);
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries in development (>100ms)
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 *
 * Use this when you need to execute multiple queries atomically
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO sessions ...');
 *   await client.query('COMMIT');
 * } catch (error) {
 *   await client.query('ROLLBACK');
 *   throw error;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Close all database connections
 * Should be called on application shutdown
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

// Export pool for advanced usage (use query() for most cases)
export default pool;
