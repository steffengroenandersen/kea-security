/**
 * Drizzle ORM Schema Definition
 *
 * This file demonstrates how to use Drizzle ORM as an alternative to raw SQL
 * while maintaining the same security properties.
 *
 * SECURITY: Drizzle ORM provides SQL injection protection through:
 * - Type-safe query builder (prevents malformed queries)
 * - Automatic parameterization (all values passed as parameters)
 * - Schema validation (TypeScript types match database schema)
 *
 * WHY DRIZZLE IS SECURE:
 * 1. Values are ALWAYS parameterized (never concatenated into SQL strings)
 * 2. TypeScript provides compile-time safety (catch errors before runtime)
 * 3. Query builder prevents SQL injection by design (no raw string interpolation)
 * 4. Similar to parameterized queries in raw SQL, but with better DX
 *
 * COMPARISON TO RAW SQL:
 * Raw SQL:    query('SELECT * FROM users WHERE email = $1', [email])
 * Drizzle:    db.select().from(users).where(eq(users.email, email))
 * Both are equally secure - Drizzle generates parameterized queries internally
 */

import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users Table
 *
 * Stores user accounts with bcrypt-hashed passwords
 *
 * SECURITY NOTES:
 * - password_hash: NEVER store plain text passwords
 * - role: Enum-like constraint ensures only valid roles
 * - email: UNIQUE constraint prevents duplicate accounts
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // SECURITY: Password hash from bcrypt (never store plain text)
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  // SECURITY: Role validation should happen in application code
  // Drizzle doesn't support CHECK constraints, so validate in code
  role: varchar('role', { length: 20 }).notNull().default('user'),
  profile_picture: varchar('profile_picture', { length: 500 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Sessions Table
 *
 * Stores active user sessions with CSRF tokens
 *
 * SECURITY NOTES:
 * - session_token: Cryptographically random (crypto.randomBytes)
 * - csrf_token: Separate token for CSRF protection
 * - expires_at: Sessions must expire (24 hours default)
 * - UNIQUE constraint prevents token reuse
 */
export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // SECURITY: Random session token stored in httpOnly cookie
  session_token: varchar('session_token', { length: 255 }).notNull().unique(),
  // SECURITY: CSRF token for state-changing operations
  csrf_token: varchar('csrf_token', { length: 255 }).notNull(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Items Table
 *
 * User-generated content with visibility control
 *
 * SECURITY NOTES:
 * - visibility: Controls access (private/public)
 * - user_id: Foreign key enforces data ownership
 * - Cascade delete ensures data consistency
 */
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  // SECURITY: Visibility should be validated as 'private' | 'public' in code
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Comments Table
 *
 * Comments on items
 *
 * SECURITY NOTES:
 * - Cascade delete on item deletion
 * - Foreign keys ensure referential integrity
 * - Content should be validated for length in application code
 */
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Relations
 *
 * Define relationships between tables for type-safe joins
 * These are used by Drizzle's query builder for relational queries
 */
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  items: many(items),
  comments: many(comments),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.user_id],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  item: one(items, {
    fields: [comments.item_id],
    references: [items.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 *
 * Export TypeScript types for use in application code
 * These provide type safety throughout the application
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
