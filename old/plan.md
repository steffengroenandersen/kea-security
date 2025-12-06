# Security Assignment Plan

## Project Overview
Build a minimal Next.js web application demonstrating core security principles for the KEA Security course exam project.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with node-postgres (pg) - raw SQL with parameterized queries
- **Authentication**: Custom session-based auth with bcrypt
- **Deployment**: Hetzner VPS with Caddy reverse proxy, Docker

## Core Features (Minimum Requirements)
1. Multi-level authentication (user/admin roles)
2. User registration with email validation
3. Session management via httpOnly cookies
4. Items list with private/public visibility
5. Comment system for items
6. Profile picture upload

## Security Features (Required)
1. **SQL Injection Prevention**: Parameterized queries
2. **XSS Prevention**: React JSX escaping + CSP headers
3. **CSRF Prevention**: Custom CSRF tokens + SameSite cookies
4. **XXE/Serialization**: Safe JSON parsing only
5. **Server-side Validation**: All inputs validated server-side
6. **Password Security**: Bcrypt hashing
7. **TLS/HTTPS**: Caddy auto-HTTPS
8. **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## Application Structure
```
/src
  /app
    /api
      /auth
        /register - User registration
        /login - User login
        /logout - Session destruction
        /session - Get current user
      /items - CRUD operations
      /items/[id]/comments - Comment on items
      /upload - Profile picture upload
      /admin - Admin operations
    /(auth)
      /login - Login page
      /register - Registration page
    /dashboard - User dashboard
    /items - Items list
    /items/[id] - Item detail with comments
    /profile - User profile
    /admin - Admin panel
  /lib
    /db.ts - Database connection
    /auth.ts - Authentication utilities
    /validation.ts - Input validation
    /csrf.ts - CSRF token utilities
  /middleware.ts - Auth & CSRF middleware
```

## Database Schema
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  profile_picture VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  csrf_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  visibility VARCHAR(20) DEFAULT 'private',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Phases
1. **Phase 1**: Project setup, database, basic auth
2. **Phase 2**: Core features (items, comments, uploads)
3. **Phase 3**: Security hardening (CSRF, headers, validation)
4. **Phase 4**: Deployment and documentation

## Report Structure
See report.md for full report template with all sections.
