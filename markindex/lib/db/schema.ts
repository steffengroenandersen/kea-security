import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

// User table
export const user = pgTable("user", {
  userId: serial("user_id").primaryKey(),
  userUuid: text("user_uuid").unique().notNull(),
  userPublicUuid: text("user_public_uuid").unique().notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
});

// Session table
export const session = pgTable("session", {
  sessionId: serial("session_id").primaryKey(),
  sessionToken: text("session_token").unique().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => user.userId),
  expiresAt: timestamp("expires_at").notNull(),
});

// Business table
export const business = pgTable("business", {
  businessId: serial("business_id").primaryKey(),
  businessUuid: text("business_uuid").unique().notNull(),
  businessPublicUuid: text("business_public_uuid").unique().notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
});

// User_Business junction table
export const userBusiness = pgTable("user_business", {
  userBusinessId: serial("user_business_id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => user.userId),
  businessId: integer("business_id")
    .notNull()
    .references(() => business.businessId),
  role: text("role").notNull(), // 'admin' or 'member'
});

// Portfolio table
export const portfolio = pgTable("portfolio", {
  portfolioId: serial("portfolio_id").primaryKey(),
  portfolioUuid: text("portfolio_uuid").unique().notNull(),
  portfolioPublicUuid: text("portfolio_public_uuid").unique().notNull(),
  businessId: integer("business_id")
    .notNull()
    .references(() => business.businessId),
  title: text("title").notNull(),
  visibility: text("visibility").notNull(), // 'visible' or 'hidden'
});

// Comment table
export const comment = pgTable("comment", {
  commentId: serial("comment_id").primaryKey(),
  commentUuid: text("comment_uuid").unique().notNull(),
  portfolioId: integer("portfolio_id")
    .notNull()
    .references(() => portfolio.portfolioId),
  userId: integer("user_id")
    .notNull()
    .references(() => user.userId),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
