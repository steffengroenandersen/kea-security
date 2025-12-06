# Markindex - KEA Security Course

A minimal but production-ready web application demonstrating core security principles. Built as a secure template for SecureFlow Solutions to ensure consistent security across client projects.

## Features

### Core Functionality
- ✅ Multi-level authentication (user/admin roles)
- ✅ User registration with validation
- ✅ Session-based authentication
- ✅ Items with private/public visibility
- ✅ Comment system
- ✅ Profile picture upload

### Security Features
- ✅ **SQL Injection Prevention**: Parameterized queries throughout
- ✅ **XSS Prevention**: React JSX escaping + CSP headers + httpOnly cookies
- ✅ **CSRF Prevention**: Token validation + SameSite cookies
- ✅ **XXE Prevention**: JSON-only, no XML parsing
- ✅ **Server-side Validation**: All inputs validated server-side
- ✅ **Password Security**: bcrypt hashing (salt rounds = 10)
- ✅ **TLS/HTTPS**: Caddy automatic HTTPS with HSTS
- ✅ **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **Secure Cookies**: httpOnly, Secure, SameSite=Lax

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with node-postgres (parameterized queries)
- **ORM Alternative**: Drizzle ORM (optional, for comparison)
- **Authentication**: Custom session-based auth
- **Password Hashing**: bcrypt
- **Deployment**: Hetzner VPS, Docker, Caddy

> **Note**: This project demonstrates **both** raw SQL (primary) and Drizzle ORM (alternative) approaches. Both are equally secure. See `DRIZZLE-SECURITY-GUIDE.md` for detailed comparison.

## Project Structure

```
/markindex
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts    # User registration
│   │   │   │   ├── login/route.ts       # User login
│   │   │   │   ├── logout/route.ts      # User logout
│   │   │   │   └── session/route.ts     # Get current session
│   │   │   ├── items/
│   │   │   │   ├── route.ts             # List/create items
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts         # Get/update/delete item
│   │   │   │       └── comments/route.ts # Create comment
│   │   │   ├── upload/route.ts          # Profile picture upload
│   │   │   └── admin/
│   │   │       └── users/route.ts       # Admin: list users
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx           # Login page
│   │   │   └── register/page.tsx        # Registration page
│   │   ├── dashboard/page.tsx           # User dashboard
│   │   ├── items/
│   │   │   ├── page.tsx                 # Items list
│   │   │   └── [id]/page.tsx            # Item detail
│   │   ├── profile/page.tsx             # User profile
│   │   ├── admin/page.tsx               # Admin panel
│   │   ├── layout.tsx                   # Root layout
│   │   └── page.tsx                     # Home page
│   ├── lib/
│   │   ├── db.ts                        # Database connection
│   │   ├── auth.ts                      # Authentication utilities
│   │   ├── validation.ts                # Input validation
│   │   └── csrf.ts                      # CSRF protection
│   ├── components/
│   │   ├── Navbar.tsx                   # Navigation component
│   │   └── AuthGuard.tsx                # Authentication wrapper
│   └── middleware.ts                    # Security headers + auth
├── public/
│   └── uploads/                         # User-uploaded files
├── init.sql                             # Database schema
├── docker-compose.yml                   # Docker configuration
├── Caddyfile                            # Caddy configuration
├── Dockerfile                           # Application container
├── package.json                         # Dependencies
└── README.md                            # This file
```

## Security Implementation Details

### 1. SQL Injection Prevention

**Method**: Parameterized queries (raw SQL) + Drizzle ORM (alternative)

#### Raw SQL Approach (Primary)
```typescript
// ✅ SECURE - Parameters passed separately
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ INSECURE - Never concatenate user input
// const query = `SELECT * FROM users WHERE email = '${email}'`;
```

#### Drizzle ORM Approach (Alternative)
```typescript
// ✅ EQUALLY SECURE - Automatic parameterization
import { eq } from 'drizzle-orm';
const result = await db
  .select()
  .from(users)
  .where(eq(users.email, email));

// Drizzle generates: SELECT * FROM users WHERE email = $1
// With parameter: [email]
```

**Both are equally secure** - Drizzle automatically generates parameterized queries.

**File References**:
- Raw SQL: `src/lib/db.ts:query()`
- Drizzle: `src/lib/db.drizzle.ts` and `src/lib/db.drizzle.schema.ts`
- Comparison: `DRIZZLE-SECURITY-GUIDE.md`
- Examples: `src/app/api/auth/register/route.ts` (raw SQL), `src/app/api/items-drizzle/route.ts` (Drizzle)

### 2. XSS Prevention

**Methods**:
1. React's automatic JSX escaping
2. Content Security Policy headers
3. httpOnly cookies (prevent token theft)

```typescript
// React automatically escapes this
<div>{userInput}</div>  // Safe - rendered as text

// CSP header prevents inline scripts
'Content-Security-Policy': "script-src 'self'"
```

**File References**:
- CSP headers: `src/middleware.ts`
- Cookie config: `src/app/api/auth/login/route.ts`

### 3. CSRF Prevention

**Methods**:
1. CSRF tokens (Synchronizer Token Pattern)
2. SameSite=Lax cookies

```typescript
// Server validates CSRF token for state-changing operations
const csrfToken = request.headers.get('X-CSRF-Token');
if (csrfToken !== session.csrf_token) {
  return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
}

// Cookie configured with SameSite
cookies().set('session_token', token, {
  sameSite: 'lax'  // Prevents cross-site POST requests
});
```

**File References**:
- CSRF validation: `src/lib/csrf.ts`
- Middleware enforcement: `src/middleware.ts`

### 4. Server-Side Validation

**Principle**: Never trust client-side validation

```typescript
// Client-side (UX only)
if (password.length < 8) {
  setError('Password too short');
  return;
}

// Server-side (security boundary)
if (!isStrongPassword(body.password)) {
  return Response.json({ error: 'Weak password' }, { status: 400 });
}
```

**File References**:
- Validation utilities: `src/lib/validation.ts`
- Applied in: All API routes

### 5. Password Security

**Method**: bcrypt with salt rounds = 10

```typescript
// Hashing (registration)
const hash = await bcrypt.hash(password, 10);

// Verification (login)
const valid = await bcrypt.compare(password, hash);
```

**File References**:
- Implementation: `src/lib/auth.ts`

### 6. File Upload Security

**Protections**:
1. MIME type whitelist
2. File size limits
3. Safe filename generation (prevents directory traversal)

```typescript
// Validate file type
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
if (!ALLOWED_TYPES.includes(file.type)) {
  return error;
}

// Generate safe filename
const safeFilename = `${userId}_${Date.now()}.${ext}`;
```

**File References**:
- Implementation: `src/app/api/upload/route.ts`

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (for deployment)

### Development Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd markindex
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup database**
```bash
# Create PostgreSQL database
createdb markindex

# Run schema
psql markindex < init.sql
```

4. **Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

5. **Run development server**
```bash
npm run dev
```

Visit http://localhost:3000

### Production Deployment

1. **Setup server (Hetzner VPS)**
```bash
# SSH into server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. **Deploy application**
```bash
# Clone repository on server
git clone <repository-url>
cd markindex

# Create .env file with production credentials
nano .env

# Start services
docker-compose up -d
```

3. **Configure Caddy**
```bash
# Edit Caddyfile
sudo nano /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

## Testing

### Manual Security Testing

**SQL Injection**:
```bash
# Test login with SQL injection payload
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com\" OR \"1\"=\"1","password":"anything"}'

# Expected: Login fails (parameterized query prevents injection)
```

**XSS**:
```bash
# Test comment with script tag
Content: <script>alert('XSS')</script>

# Expected: Rendered as text, no script execution
```

**CSRF**:
```bash
# Test POST without CSRF token
curl -X POST http://localhost:3000/api/items \
  -H "Cookie: session_token=valid_token" \
  -d '{"title":"Test"}'

# Expected: 403 Forbidden - Invalid CSRF token
```

### Mozilla Observatory

After deployment, test with:
```bash
https://observatory.mozilla.org/
```

Expected score: A or A+

## Known Limitations

1. **File Upload**: MIME type validation only (doesn't check magic bytes)
2. **Email Validation**: Simplified regex (doesn't verify email exists)
3. **Rate Limiting**: Not implemented (vulnerable to brute force)
4. **Password Requirements**: Basic (production should check against compromised password databases)
5. **Session Management**: No "logout all devices" feature
6. **Logging**: No security event logging
7. **CSP**: Requires 'unsafe-inline' for Next.js and Tailwind

## Future Improvements

- Two-factor authentication (TOTP)
- Rate limiting (express-rate-limit)
- Email verification workflow
- Password reset functionality
- Account lockout after failed attempts
- Security event logging
- Automated vulnerability scanning
- Backup and disaster recovery

## License

This project is for educational purposes (KEA Security Course).

## Author

[Your Name]
KEA - Copenhagen School of Design and Technology
December 2025
