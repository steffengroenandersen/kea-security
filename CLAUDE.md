# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a security-focused academic project for a KEA security course exam. The application ("MarkIndex") demonstrates secure web application development practices with authentication, authorization, and multi-level privileges. The project is built as a template for a company to migrate existing applications to a secure foundation.

**Key Security Features Implemented:**
- Secure authentication using Copenhagen Book framework (Argon2id password hashing, cryptographically secure session tokens)
- Role-based access control (admin/member roles per business)
- Protection against SQL injection (using Drizzle ORM with parameterized queries)
- XSS protection (HTTP-only cookies, input validation with Zod)
- CSRF protection (SameSite cookies, server-side validation)
- Generic error messages to prevent information leakage

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Authentication**: Custom implementation following Copenhagen Book guidelines
- **Password Hashing**: Argon2id via @node-rs/argon2
- **Validation**: Zod schemas
- **UI**: React 19, Tailwind CSS 4, Radix UI components

## Common Development Commands

### Database Operations
```bash
# Start PostgreSQL database (in Docker)
cd markindex
docker-compose up -d

# Generate database migrations from schema changes
npm run db:generate

# Push migrations to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Connect to database with psql
psql postgresql://postgres:postgres@localhost:5432/markindex
```

### Development Server
```bash
cd markindex
npm run dev          # Start development server at http://localhost:3000
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Environment Setup
1. Copy `.env.example` to `.env.local` in the `markindex/` directory
2. The default database URL is: `postgresql://postgres:postgres@localhost:5432/markindex`

## Architecture Overview

### Directory Structure
```
markindex/
├── app/                    # Next.js App Router pages
│   ├── app/               # Protected routes (require authentication)
│   │   ├── business-manager/  # List all user's businesses
│   │   └── [businessUuid]/    # Individual business view
│   ├── login/             # Login page
│   ├── signup/            # Registration page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── auth/             # Login/signup forms
│   ├── business/         # Business-related components
│   └── ui/               # Reusable UI components (shadcn/ui)
├── lib/
│   ├── actions/          # Server actions
│   │   ├── auth.ts       # signup(), login(), logout()
│   │   └── business.ts   # createBusiness(), getUserBusinesses()
│   ├── auth/             # Authentication utilities
│   │   ├── session.ts    # Session management (Copenhagen Book pattern)
│   │   ├── password.ts   # Argon2id password hashing
│   │   ├── business.ts   # Business authorization helpers
│   │   └── index.ts      # Barrel exports
│   ├── db/
│   │   ├── schema.ts     # Drizzle ORM schema definitions
│   │   └── index.ts      # Database connection
│   └── utils.ts          # Utility functions
├── middleware.ts          # Route protection middleware
└── drizzle/              # Database migrations
```

### Security Architecture

**Authentication Flow (Copenhagen Book):**
1. User registers with email/password → password hashed with Argon2id (19MiB memory, 2 iterations)
2. User logs in → credentials validated → session created with cryptographically secure token (160 bits entropy)
3. Session stored in HTTP-only, SameSite=lax cookie (secure in production)
4. Middleware checks for session cookie on protected routes (`/app/*`)
5. Server components validate session token against database
6. Sessions expire after 30 days, auto-extend if <15 days remaining

**Authorization Pattern:**
- Users can belong to multiple businesses with different roles (admin/member)
- Business access verified via `getUserBusinessAccess(userId, businessUuid)`
- Admin privileges checked via `isBusinessAdmin(userId, businessUuid)`
- All business operations validate user access server-side

**UUID Strategy:**
- Each entity has two UUIDs: `uuid` (internal) and `publicUuid` (public-facing)
- `uuid` used in URLs and client-facing operations (prevents enumeration)
- Internal IDs are serial integers (database efficiency)

### Database Schema

**Core Tables:**
- `user`: Users with UUIDs, email, and Argon2id password hash
- `session`: Session tokens with expiration (30-day lifetime)
- `business`: Business entities with name and optional logo
- `user_business`: Junction table linking users to businesses with roles (admin/member)
- `portfolio`: Business portfolios with visibility (visible/hidden)
- `comment`: User comments on portfolios

**Key Relationships:**
- One-to-many: user → sessions
- Many-to-many: users ↔ businesses (via user_business with role)
- One-to-many: business → portfolios
- Many-to-many: users can comment on multiple portfolios

See `database-schema.md` for full schema details.

## Security Implementation Notes

### Input Validation
- All user input validated with Zod schemas server-side
- Client-side validation for UX only - never trusted
- Server actions use `"use server"` directive
- Form data validated before database operations

### Error Handling
- Generic error messages ("Something went wrong") to prevent enumeration attacks
- No distinction between "user not found" vs "wrong password"
- No specific validation errors exposed to client on authentication failures
- Prevents leaking information about existing users/businesses

### Database Security
- All queries use Drizzle ORM with parameterized queries (SQL injection protection)
- Transactions used for multi-step operations (e.g., creating business + assigning admin)
- No raw SQL queries in application code

### Session Security
- HTTP-only cookies (JavaScript cannot access)
- SameSite=lax (CSRF protection while allowing navigation)
- Secure flag enabled in production (HTTPS only)
- Session tokens have 160 bits of entropy (exceeds Copenhagen Book minimum of 112 bits)
- Sessions automatically cleaned up on expiration

## User Stories Implementation Status

See `user-stories.md` for complete list. Current status:
- ✅ US001-US003: Authentication & session management (DONE)
- ✅ US004: Create business (DONE - partially implemented, listing works)
- 📋 US005-US013: Remaining features (TODO)

## Important Development Patterns

### Adding New Server Actions
1. Create action in `lib/actions/` with `"use server"` directive
2. Validate user session first using `getSessionToken()` and `validateSessionToken()`
3. Validate input with Zod schema
4. Perform authorization checks if needed (e.g., `isBusinessAdmin()`)
5. Return generic errors to prevent information leakage
6. Handle `NEXT_REDIRECT` errors specially (rethrow them)

### Adding Protected Routes
1. Place under `/app/app/` directory (automatically protected by middleware)
2. Validate session in page component server-side
3. Check specific permissions as needed (business access, admin role, etc.)
4. Redirect to `/login` if unauthorized

### Database Schema Changes
1. Modify `lib/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:push` to apply to database
4. Update TypeScript types automatically via Drizzle

## Project Context

This is an exam project with specific requirements:
- Must demonstrate protection against: SQL injection, XSS, CSRF, XXE, client-side manipulation
- Must implement: multi-level auth, registration, sessions, private/public items, comments, file upload
- Report focuses on security analysis and vulnerability mitigation (not feature completeness)
- Due date: December 10, 2025

See `assignment.md` for complete project requirements and grading criteria.
