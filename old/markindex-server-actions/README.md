# Markindex - Server Actions Implementation

This is an alternative implementation of the Markindex security project using **Next.js Server Actions** instead of API routes.

## Key Difference: Server Actions vs API Routes

### API Routes (`markindex/`)
```typescript
// API Route: app/api/items/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // ... validation and database logic
  return NextResponse.json({ item });
}

// Client calls API:
const response = await fetch('/api/items', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### Server Actions (this project)
```typescript
// Server Action: app/actions/items.ts
'use server'

export async function createItem(formData: FormData) {
  // ... validation and database logic
  return { item };
}

// Client calls action directly:
import { createItem } from '@/app/actions/items';
const result = await createItem(formData);
```

## Security Comparison

### Both Approaches Are Secure

**API Routes:**
- ✅ Explicit HTTP endpoints
- ✅ Manual CSRF protection needed
- ✅ Manual session validation
- ✅ RESTful architecture
- ✅ Can be called from any client

**Server Actions:**
- ✅ Built-in CSRF protection (Next.js handles it)
- ✅ Server-side only (never exposed to client)
- ✅ Direct function calls (no HTTP layer)
- ✅ Type-safe (TypeScript end-to-end)
- ✅ Automatic revalidation

### CSRF Protection Comparison

**API Routes (Manual):**
```typescript
// Must implement CSRF token validation
const csrfToken = request.headers.get('X-CSRF-Token');
if (csrfToken !== session.csrf_token) {
  return Response.json({ error: 'Invalid CSRF' }, { status: 403 });
}
```

**Server Actions (Automatic):**
```typescript
// Next.js automatically validates:
// - Origin header
// - Same-origin policy
// - POST-only enforcement
// No manual CSRF token needed!
```

## Project Structure

```
/markindex-server-actions
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   ├── auth.ts          # Authentication actions
│   │   │   ├── items.ts         # Item CRUD actions
│   │   │   ├── comments.ts      # Comment actions
│   │   │   └── upload.ts        # File upload actions
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx   # Login with Server Actions
│   │   │   └── register/page.tsx
│   │   ├── items/
│   │   │   ├── page.tsx         # Items list
│   │   │   └── [id]/page.tsx    # Item detail
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── db.ts                # Database (same as API version)
│   │   ├── auth.ts              # Auth utilities
│   │   ├── session.ts           # Session management for Server Actions
│   │   └── validation.ts        # Input validation
│   └── middleware.ts            # Security headers (same)
├── init.sql                     # Same database schema
└── README.md                    # This file
```

## Advantages of Server Actions

### 1. Simpler CSRF Protection
Next.js handles CSRF automatically - no manual token management needed.

### 2. Progressive Enhancement
Forms work without JavaScript (fallback to native form submission).

### 3. Type Safety
Direct function imports provide end-to-end TypeScript safety.

### 4. Less Boilerplate
No need to:
- Create separate API route files
- Parse request/response
- Handle HTTP methods
- Manage CSRF tokens manually

### 5. Automatic Revalidation
Server Actions can automatically revalidate cache and trigger re-renders.

## Security Features (Same as API Version)

All security principles remain the same:

- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **XSS Prevention**: React JSX escaping + CSP headers
- ✅ **CSRF Prevention**: Automatic with Server Actions
- ✅ **Session Security**: httpOnly cookies
- ✅ **Server-side Validation**: Never trust client
- ✅ **Password Hashing**: bcrypt
- ✅ **Authorization**: Role-based access control

## When to Use Each Approach

### Use API Routes When:
- Building a REST API for external clients
- Need explicit control over HTTP layer
- Want to expose endpoints to mobile apps
- Team is familiar with REST architecture
- Need to version API endpoints

### Use Server Actions When:
- Building Next.js-only application
- Want simpler code with less boilerplate
- Need progressive enhancement
- Want automatic CSRF protection
- Prefer type-safe function calls over HTTP

**Both are equally secure when implemented correctly.**

## Key Files to Review

### Authentication
- `src/app/actions/auth.ts` - Login, register, logout actions
- Compare with: `markindex/src/app/api/auth/*/route.ts`

### Data Operations
- `src/app/actions/items.ts` - CRUD operations
- Compare with: `markindex/src/app/api/items/route.ts`

### Session Management
- `src/lib/session.ts` - Server Action specific session helpers
- Compare with: `markindex/src/lib/auth.ts`

## Installation

```bash
cd markindex-server-actions
npm install

# Setup database (same as API version)
createdb markindex
psql markindex < init.sql

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Visit http://localhost:3000

## Security Testing

Same tests apply as API version:

```bash
# SQL Injection Test
# Try submitting form with malicious input
Title: test' OR '1'='1

# Expected: Stored as literal string (attack fails)

# Authorization Test
# Try accessing other user's private items
# Expected: Access denied

# CSRF Test
# Try calling Server Action from different origin
# Expected: Next.js blocks it automatically
```

## Comparison Table

| Feature | API Routes | Server Actions |
|---------|-----------|----------------|
| CSRF Protection | Manual | Automatic |
| Type Safety | Partial | Full |
| HTTP Layer | Explicit | Abstracted |
| External Clients | Yes | No |
| Progressive Enhancement | No | Yes |
| Boilerplate | More | Less |
| Security | ✅ Equal | ✅ Equal |

## For Your Report

### Discussing Both Approaches

"This project demonstrates two modern approaches to building secure Next.js applications:

1. **API Routes**: Traditional REST API with explicit HTTP endpoints and manual CSRF protection
2. **Server Actions**: Modern Next.js feature with automatic CSRF protection and type-safe function calls

Both approaches provide equal security when implemented correctly. The key security principles (parameterization, validation, authorization) remain the same. The difference is in the abstraction level - Server Actions handle CSRF and HTTP concerns automatically, while API routes give explicit control."

### Security Principles Are Universal

"Regardless of whether using API routes or Server Actions, the fundamental security principles remain unchanged:
- Never concatenate user input into SQL queries (parameterization)
- Always validate server-side (never trust client)
- Enforce authorization on every operation
- Use secure session management (httpOnly cookies)
- Hash passwords with bcrypt
- Apply security headers (CSP, HSTS, etc.)"

## Quick Start Guide

1. **Review the comparison**: See how same security features are implemented differently
2. **Check auth actions**: `src/app/actions/auth.ts` vs `markindex/src/app/api/auth/*/route.ts`
3. **Run both projects**: Compare developer experience
4. **Read inline comments**: Every file explains security considerations

## Summary

This implementation shows that **Server Actions are a secure alternative to API routes**. They provide:
- Same security level (when used correctly)
- Less boilerplate code
- Automatic CSRF protection
- Better type safety
- Simpler developer experience

The choice between API routes and Server Actions is about architecture and team preference, not security.
