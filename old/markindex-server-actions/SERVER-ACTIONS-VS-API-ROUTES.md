# Server Actions vs API Routes - Security Comparison

This document provides a comprehensive comparison between Next.js Server Actions and API Routes from a security perspective.

## TL;DR

**Both approaches are equally secure when implemented correctly.**

The choice between them is about:
- Architecture preferences
- Developer experience
- Client requirements
- Team familiarity

**Not about security.**

## Side-by-Side Comparison

### Authentication Example

#### API Routes
```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  // Find user
  const user = await query('SELECT * FROM users WHERE email = $1', [email]);

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(32).toString('hex');

  await query(
    'INSERT INTO sessions (user_id, session_token, csrf_token, expires_at) VALUES ($1, $2, $3, $4)',
    [user.id, sessionToken, csrfToken, expiresAt]
  );

  // Set cookie
  cookies().set('session_token', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    csrfToken  // Client must store and send in future requests
  });
}

// Client usage:
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
});
```

#### Server Actions
```typescript
// app/actions/auth.ts
'use server'

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Find user
  const user = await query('SELECT * FROM users WHERE email = $1', [email]);

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Create session
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const csrfToken = crypto.randomBytes(32).toString('hex');

  await query(
    'INSERT INTO sessions (user_id, session_token, csrf_token, expires_at) VALUES ($1, $2, $3, $4)',
    [user.id, sessionToken, csrfToken, expiresAt]
  );

  // Set cookie
  cookies().set('session_token', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });

  // No need to send CSRF token - Next.js handles it automatically
  return {
    success: true,
    data: { id: user.id, email: user.email }
  };
}

// Client usage:
import { loginUser } from '@/app/actions/auth';

const result = await loginUser(formData);
// or directly in form:
<form action={loginUser}>...</form>
```

### CSRF Protection Comparison

#### API Routes (Manual CSRF)

**Server:**
```typescript
// Login: Generate and send CSRF token
export async function POST(request: Request) {
  // ... authentication
  const csrfToken = crypto.randomBytes(32).toString('hex');

  // Store in session
  await query(
    'INSERT INTO sessions (..., csrf_token) VALUES (..., $3)',
    [..., csrfToken]
  );

  // Send to client
  return NextResponse.json({ csrfToken });
}

// Protected routes: Validate CSRF token
export async function POST(request: Request) {
  const csrfToken = request.headers.get('X-CSRF-Token');
  const session = await getSession();

  if (!csrfToken || csrfToken !== session.csrf_token) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // ... proceed with operation
}
```

**Client:**
```typescript
// Store CSRF token (after login)
const { csrfToken } = await response.json();
localStorage.setItem('csrfToken', csrfToken);

// Send in every request
fetch('/api/items', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': localStorage.getItem('csrfToken')
  },
  body: JSON.stringify(data)
});
```

#### Server Actions (Automatic CSRF)

**Server:**
```typescript
// No CSRF token needed!
'use server'

export async function createItem(formData: FormData) {
  // Next.js automatically validates:
  // - Origin header matches host
  // - Referer is same-origin
  // - Request is POST
  // - Action ID is valid

  // ... just implement your logic
}
```

**Client:**
```typescript
// No CSRF token needed!
import { createItem } from '@/app/actions/items';

await createItem(formData);
// That's it!
```

**How Next.js Protects Server Actions:**
1. Origin header must match host
2. Referer must be same-origin
3. Actions only callable via POST
4. Action IDs are cryptographically random
5. Actions can't be called from external sites

### Data Operations Example

#### API Routes
```typescript
// app/api/items/route.ts
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await query(
    'SELECT * FROM items WHERE visibility = $1 OR user_id = $2',
    ['public', session.user.id]
  );

  return NextResponse.json({ items: items.rows });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // CSRF validation
  const csrfToken = request.headers.get('X-CSRF-Token');
  if (csrfToken !== session.csrf_token) {
    return NextResponse.json({ error: 'Invalid CSRF' }, { status: 403 });
  }

  const body = await request.json();

  // Validation
  if (!body.title || body.title.length > 255) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }

  const result = await query(
    'INSERT INTO items (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
    [session.user.id, body.title, body.content]
  );

  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
}
```

#### Server Actions
```typescript
// app/actions/items.ts
'use server'

export async function getItems() {
  const session = await requireAuth(); // Throws if not authenticated

  const items = await query(
    'SELECT * FROM items WHERE visibility = $1 OR user_id = $2',
    ['public', session.user.id]
  );

  return { success: true, data: items.rows };
}

export async function createItem(formData: FormData) {
  const session = await requireAuth();

  // No CSRF check needed - automatic

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // Validation
  if (!title || title.length > 255) {
    return { success: false, error: 'Invalid title' };
  }

  const result = await query(
    'INSERT INTO items (user_id, title, content) VALUES ($1, $2, $3) RETURNING *',
    [session.user.id, title, content]
  );

  revalidatePath('/items'); // Automatic cache invalidation

  return { success: true, data: result.rows[0] };
}
```

## Security Feature Comparison

| Security Feature | API Routes | Server Actions | Winner |
|-----------------|------------|----------------|---------|
| **SQL Injection Prevention** | ✅ Parameterized queries | ✅ Parameterized queries | 🤝 Tie |
| **XSS Prevention** | ✅ JSX escaping + CSP | ✅ JSX escaping + CSP | 🤝 Tie |
| **CSRF Protection** | ✅ Manual token validation | ✅ Automatic origin validation | Server Actions (simpler) |
| **Session Security** | ✅ httpOnly cookies | ✅ httpOnly cookies | 🤝 Tie |
| **Password Hashing** | ✅ bcrypt | ✅ bcrypt | 🤝 Tie |
| **Server-side Validation** | ✅ Manual | ✅ Manual | 🤝 Tie |
| **Authorization** | ✅ Manual checks | ✅ Manual checks | 🤝 Tie |
| **Code on Client** | ❌ None | ❌ None | 🤝 Tie |
| **Type Safety** | ⚠️ Partial (request/response) | ✅ Full (end-to-end) | Server Actions |

## Code Complexity Comparison

### Lines of Code for Same Functionality

**API Routes:**
- Authentication endpoint: ~80 lines
- CSRF validation middleware: ~30 lines
- Protected endpoint: ~50 lines
- Client code: ~40 lines
- **Total: ~200 lines**

**Server Actions:**
- Authentication action: ~50 lines
- Protected action: ~30 lines
- Client code: ~20 lines
- **Total: ~100 lines**

**Difference: 50% less code with Server Actions**

### Boilerplate Reduction

**API Routes require:**
- Request parsing (`await request.json()`)
- Response creation (`NextResponse.json()`)
- HTTP status codes
- CSRF token generation
- CSRF token validation
- CSRF token client storage
- CSRF token sending in headers

**Server Actions require:**
- FormData extraction (`formData.get()`)
- Return object (`{ success, data/error }`)

## Security Testing

### SQL Injection Test

**Both fail equally (which is good!):**

```bash
# Malicious input
title: "Test' OR '1'='1"

# API Route result:
# Stored as: "Test' OR '1'='1" (literal string)
# Attack fails ✅

# Server Action result:
# Stored as: "Test' OR '1'='1" (literal string)
# Attack fails ✅
```

### CSRF Test

**API Routes:**
```bash
# Try POST without CSRF token
curl -X POST http://localhost:3000/api/items \
  -H "Cookie: session_token=valid" \
  -d '{"title":"test"}'

# Result: 403 Forbidden - "Invalid CSRF token" ✅
```

**Server Actions:**
```bash
# Try calling from different origin
# <form action="http://localhost:3000/action-id" method="POST">

# Result: Next.js blocks (origin mismatch) ✅
```

### Authorization Test

**Both enforce equally:**

```typescript
// Try accessing other user's private item

// API Route:
GET /api/items/123 (owned by user 456, current user 789)
// Result: 404 Not Found ✅

// Server Action:
await getItemById(123) // owned by user 456, current user 789
// Result: { success: false, error: 'Item not found' } ✅
```

## When to Use Each

### Use API Routes When:

1. **Building a REST API** for external clients (mobile apps, third-party integrations)
2. **Need explicit HTTP control** (status codes, headers, caching)
3. **Team familiar with REST** architecture
4. **Want to version API** endpoints (`/api/v1`, `/api/v2`)
5. **Need WebSocket or streaming** responses
6. **Documenting API** with OpenAPI/Swagger

### Use Server Actions When:

1. **Next.js-only application** (no external API consumers)
2. **Want simpler code** with less boilerplate
3. **Need progressive enhancement** (forms work without JS)
4. **Prefer type-safe** function calls over HTTP
5. **Want automatic revalidation** and cache management
6. **Building quickly** with less complexity

## Common Misconceptions

### ❌ "Server Actions are less secure than API Routes"
**False.** Both are equally secure when implemented correctly. Security comes from:
- Parameterization (both use it)
- Server-side validation (both require it)
- Authentication (both enforce it)
- Authorization (both implement it)

### ❌ "Server Actions don't need CSRF protection"
**Misleading.** Server Actions **do** have CSRF protection, it's just automatic. Next.js validates origin headers for you.

### ❌ "API Routes give more control"
**Partially true.** API Routes give explicit control over HTTP layer, but Server Actions give control over business logic. Both can be equally secure.

### ❌ "Server Actions expose server code to client"
**False.** Only a function reference is sent to client. Actual code executes server-side. Client can't see implementation.

## Migration Path

### From API Routes to Server Actions

1. **Move authentication:**
   - `app/api/auth/*/route.ts` → `app/actions/auth.ts`
   - Remove CSRF token generation/validation
   - Use `cookies()` instead of `request.headers.get('cookie')`

2. **Move data operations:**
   - `app/api/items/route.ts` → `app/actions/items.ts`
   - Change `NextResponse.json()` to `return { success, data }`
   - Remove CSRF validation
   - Add `revalidatePath()` calls

3. **Update client code:**
   - Replace `fetch('/api/...` with `import { action } from '@/app/actions/...'`
   - Remove CSRF token handling
   - Use FormData or direct function calls

### From Server Actions to API Routes

1. **Create API routes:**
   - `app/actions/auth.ts` → `app/api/auth/*/route.ts`
   - Add CSRF token generation
   - Add CSRF validation middleware
   - Use Request/Response objects

2. **Update client code:**
   - Replace `action(formData)` with `fetch('/api/...')`
   - Add CSRF token storage/sending
   - Handle HTTP responses

## Conclusion

**Both approaches are equally secure.**

Choose based on:
- ✅ Architecture requirements
- ✅ Team preferences
- ✅ Client needs (external API or internal only)
- ✅ Complexity tolerance

**Don't choose based on security** - they're equivalent.

## For Your Report

### If Using API Routes:
"This project uses API routes with manual CSRF protection. All state-changing operations validate CSRF tokens to prevent cross-site request forgery attacks. Sessions are managed with httpOnly cookies, and all database queries use parameterization to prevent SQL injection."

### If Using Server Actions:
"This project uses Next.js Server Actions which provide automatic CSRF protection through origin validation. Next.js validates that all requests originate from the same domain, preventing cross-site attacks. Sessions are managed with httpOnly cookies, and all database queries use parameterization to prevent SQL injection."

### If Comparing Both:
"This project demonstrates that both API routes and Server Actions provide equal security when implemented correctly. The key security principles - parameterization, server-side validation, authentication, and authorization - remain the same. The difference is in implementation complexity: API routes require manual CSRF token management, while Server Actions handle it automatically through origin validation."

## Additional Resources

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)
