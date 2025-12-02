# KEA Security Course - Project Collection

This repository contains comprehensive implementations demonstrating secure web application development with multiple architectural approaches.

## 📁 Projects

### 1. `markindex/` - API Routes Implementation
Full-stack Next.js application using traditional API routes with manual CSRF protection.

**Features:**
- ✅ API routes with REST architecture
- ✅ Manual CSRF token validation
- ✅ Raw SQL + Drizzle ORM (both approaches shown)
- ✅ Comprehensive security documentation
- ✅ 15-page exam report included

**Tech Stack:** Next.js 14, PostgreSQL, bcrypt, Drizzle ORM (optional)

**Security:** Manual CSRF, parameterized queries, httpOnly cookies, bcrypt, CSP headers

📖 **Read:** `markindex/README.md`

---

### 2. `markindex-server-actions/` - Server Actions Implementation
Alternative implementation using Next.js Server Actions with automatic CSRF protection.

**Features:**
- ✅ Server Actions (direct function calls)
- ✅ Automatic CSRF protection by Next.js
- ✅ 50% less code than API routes
- ✅ Type-safe end-to-end
- ✅ Progressive enhancement

**Tech Stack:** Next.js 14, PostgreSQL, bcrypt

**Security:** Automatic CSRF, parameterized queries, httpOnly cookies, bcrypt, CSP headers

📖 **Read:** `markindex-server-actions/README.md`

---

## 🔐 Security Features (All Projects)

| Security Feature | Implementation |
|-----------------|----------------|
| **SQL Injection Prevention** | Parameterized queries |
| **XSS Prevention** | React JSX escaping + CSP headers |
| **CSRF Prevention** | Manual tokens (API) / Automatic (Actions) |
| **Password Security** | bcrypt hashing (10 salt rounds) |
| **Session Security** | httpOnly, Secure, SameSite cookies |
| **Server-side Validation** | Never trust client input |
| **Authorization** | Role-based access control (user/admin) |
| **TLS/HTTPS** | Caddy automatic HTTPS + HSTS |
| **Security Headers** | CSP, X-Frame-Options, X-Content-Type-Options |

**All projects are equally secure** - the difference is in architecture and implementation approach.

---

## 🎯 Key Security Comparisons

### CSRF Protection: Manual vs Automatic

#### API Routes (Manual)
```typescript
// Server generates token
const csrfToken = crypto.randomBytes(32).toString('hex');

// Client sends in header
headers: { 'X-CSRF-Token': csrfToken }

// Server validates
if (csrfToken !== session.csrf_token) {
  return error;
}
```

#### Server Actions (Automatic)
```typescript
// Next.js automatically validates:
// - Origin header matches host
// - Referer is same-origin
// - Request is POST
// No manual token needed!
```

**Conclusion:** Both equally secure - Server Actions have less boilerplate.

---

## 🚀 Quick Start

### API Routes Version

```bash
cd markindex
npm install
createdb markindex
psql markindex < init.sql
cp .env.example .env.local
npm run dev
```

### Server Actions Version

```bash
cd markindex-server-actions
npm install
# Use same database
cp .env.example .env.local
npm run dev
```

---

## 📚 Documentation

- **`report.md`** - Complete 15-page security report
- **`assignment.md`** - Course requirements
- **`plan.md`** - Project architecture
- **`SERVER-ACTIONS-PROJECT-SUMMARY.md`** - Server Actions overview
- **`markindex/DRIZZLE-SECURITY-GUIDE.md`** - ORM security guide
- **`markindex-server-actions/SERVER-ACTIONS-VS-API-ROUTES.md`** - Detailed comparison

---

## 🎓 For Your Exam

### What You Can Demonstrate

1. **Multiple secure approaches** - API routes, Server Actions, raw SQL, Drizzle ORM
2. **Security equivalence** - Different tools, same security level
3. **Understanding principles** - Parameterization, validation, authorization
4. **Production-ready code** - Docker, Caddy, deployment configs

### Presentation Options

- **Option A:** Focus on one approach (10-15 min)
- **Option B:** Compare two approaches (15-20 min)
- **Option C:** Deep dive all approaches (20-25 min)

---

## 📊 Comparison Matrix

| Feature | API Routes | Server Actions |
|---------|-----------|----------------|
| CSRF Protection | Manual | Automatic |
| Type Safety | Partial | Full |
| Code Complexity | More | Less |
| Security Level | 🔒 Secure | 🔒 Secure |

**Both are equally secure** - choose based on architecture needs.

---

## 🔑 Key Takeaways

1. ✅ Security is in principles, not frameworks
2. ✅ Parameterization prevents SQL injection
3. ✅ CSRF can be manual or automatic (both secure)
4. ✅ Server-side validation is mandatory
5. ✅ Multiple approaches can be equally secure

**Choose your preferred approach and ace your exam!** 🚀
