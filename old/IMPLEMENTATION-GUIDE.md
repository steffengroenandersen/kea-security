# Implementation Guide - Secure Web Application

This guide explains the remaining files you need to create to complete the application. The core security infrastructure is already built.

## What's Already Created

✅ **Core Infrastructure**:
- Database schema (`init.sql`)
- Database utilities (`src/lib/db.ts`)
- Authentication system (`src/lib/auth.ts`)
- Validation utilities (`src/lib/validation.ts`)
- CSRF protection (`src/lib/csrf.ts`)
- Security middleware (`src/middleware.ts`)

✅ **API Routes**:
- User registration (`src/app/api/auth/register/route.ts`)
- User login (`src/app/api/auth/login/route.ts`)
- User logout (`src/app/api/auth/logout/route.ts`)
- Session check (`src/app/api/auth/session/route.ts`)

✅ **Deployment**:
- Docker configuration (`docker-compose.yml`, `Dockerfile`)
- Caddy configuration (`Caddyfile`)
- Project configuration (`package.json`, `tsconfig.json`, etc.)

## Files You Need to Create

### 1. API Routes for Items

**File**: `src/app/api/items/route.ts`

```typescript
/**
 * Items API - List and Create
 * GET /api/items - List items (visibility-based)
 * POST /api/items - Create new item
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { validateContentLength, validateVisibility } from '@/lib/validation';

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admin sees all, users see public items + their own
  let result;
  if (session.user?.role === 'admin') {
    result = await query(
      'SELECT items.*, users.email as owner_email FROM items JOIN users ON items.user_id = users.id ORDER BY created_at DESC'
    );
  } else {
    result = await query(
      'SELECT items.*, users.email as owner_email FROM items JOIN users ON items.user_id = users.id WHERE visibility = $1 OR user_id = $2 ORDER BY created_at DESC',
      ['public', session.user!.id]
    );
  }

  return NextResponse.json({ items: result.rows });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Validate title
  const titleValidation = validateContentLength(body.title, 1, 255);
  if (!titleValidation.valid) {
    return NextResponse.json({ error: titleValidation.error }, { status: 400 });
  }

  // Validate content (optional, but limit if provided)
  if (body.content) {
    const contentValidation = validateContentLength(body.content, 0, 10000);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 });
    }
  }

  // Validate visibility (whitelist)
  const visibility = validateVisibility(body.visibility);

  const result = await query(
    'INSERT INTO items (user_id, title, content, visibility) VALUES ($1, $2, $3, $4) RETURNING *',
    [session.user!.id, body.title.trim(), body.content?.trim() || null, visibility]
  );

  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
}
```

**File**: `src/app/api/items/[id]/route.ts`

```typescript
/**
 * Single Item API
 * GET /api/items/:id - Get item details
 * PUT /api/items/:id - Update item
 * DELETE /api/items/:id - Delete item
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { validateId } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = validateId(params.id);

  // Check access (own item, public item, or admin)
  const result = await query(
    'SELECT items.*, users.email as owner_email FROM items JOIN users ON items.user_id = users.id WHERE items.id = $1 AND (visibility = $2 OR user_id = $3 OR $4 = $5)',
    [itemId, 'public', session.user!.id, session.user!.role, 'admin']
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  return NextResponse.json({ item: result.rows[0] });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = validateId(params.id);
  const body = await request.json();

  // Verify ownership
  const check = await query(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [itemId, session.user!.id]
  );

  if (check.rows.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await query(
    'UPDATE items SET title = $1, content = $2, visibility = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
    [body.title, body.content, validateVisibility(body.visibility), itemId]
  );

  return NextResponse.json({ item: result.rows[0] });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = validateId(params.id);

  // Verify ownership
  const check = await query(
    'SELECT * FROM items WHERE id = $1 AND user_id = $2',
    [itemId, session.user!.id]
  );

  if (check.rows.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await query('DELETE FROM items WHERE id = $1', [itemId]);

  return NextResponse.json({ message: 'Item deleted' });
}
```

**File**: `src/app/api/items/[id]/comments/route.ts`

```typescript
/**
 * Comments API
 * GET /api/items/:id/comments - Get comments for item
 * POST /api/items/:id/comments - Add comment to item
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { validateId, validateContentLength } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = validateId(params.id);

  // Get comments with user information
  const result = await query(
    'SELECT comments.*, users.email FROM comments JOIN users ON comments.user_id = users.id WHERE item_id = $1 ORDER BY created_at DESC',
    [itemId]
  );

  return NextResponse.json({ comments: result.rows });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const itemId = validateId(params.id);
  const body = await request.json();

  // Validate content
  const validation = validateContentLength(body.content, 1, 5000);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify user has access to item
  const itemCheck = await query(
    'SELECT * FROM items WHERE id = $1 AND (visibility = $2 OR user_id = $3 OR $4 = $5)',
    [itemId, 'public', session.user!.id, session.user!.role, 'admin']
  );

  if (itemCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  const result = await query(
    'INSERT INTO comments (item_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
    [itemId, session.user!.id, body.content.trim()]
  );

  return NextResponse.json({ comment: result.rows[0] }, { status: 201 });
}
```

### 2. File Upload API

**File**: `src/app/api/upload/route.ts`

```typescript
/**
 * File Upload API
 * POST /api/upload - Upload profile picture
 */

import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';
import { validateFile } from '@/lib/validation';

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Generate safe filename
  const ext = file.name.split('.').pop();
  const safeFilename = `${session.user!.id}_${Date.now()}.${ext}`;
  const uploadPath = join(process.cwd(), 'public', 'uploads', safeFilename);

  // Save file
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(uploadPath, buffer);

  // Update user record
  const publicUrl = `/uploads/${safeFilename}`;
  await query(
    'UPDATE users SET profile_picture = $1 WHERE id = $2',
    [publicUrl, session.user!.id]
  );

  return NextResponse.json({ url: publicUrl });
}
```

### 3. Frontend Pages

Create these using React/Next.js with TailwindCSS for styling. Each page should:
- Use `getSessionFromRequest()` for server-side auth checks
- Include CSRF token in all POST/PUT/DELETE requests
- Display security-conscious error messages

**Files to Create**:
- `src/app/page.tsx` - Home page
- `src/app/login/page.tsx` - Login form
- `src/app/register/page.tsx` - Registration form
- `src/app/dashboard/page.tsx` - User dashboard
- `src/app/items/page.tsx` - Items list
- `src/app/items/[id]/page.tsx` - Item detail
- `src/app/profile/page.tsx` - User profile
- `src/app/admin/page.tsx` - Admin panel
- `src/app/layout.tsx` - Root layout
- `src/app/globals.css` - Global styles (Tailwind)

### 4. Components

**File**: `src/components/Navbar.tsx` - Navigation with auth state

**File**: `src/components/AuthGuard.tsx` - Client-side auth wrapper

## Quick Start

1. **Copy all security files to your project**
2. **Create the API routes** listed above (copy-paste the code)
3. **Create basic frontend pages** (can be minimal - focus is on security)
4. **Run the application**:

```bash
npm install
npm run dev
```

5. **Test security features** using the testing guide in report.md

## Key Security Principles to Remember

1. **Always use parameterized queries** - Never concatenate user input into SQL
2. **Validate server-side** - Client validation is UX only
3. **Hash passwords** - Never store plain text
4. **Use CSRF tokens** - For all state-changing operations
5. **Set secure cookies** - httpOnly, Secure, SameSite=Lax
6. **Whitelist validation** - Only accept known-good values
7. **Fail securely** - Generic error messages, secure defaults

## Documentation Notes for Report

When writing your report, reference:
- **File paths** with line numbers (e.g., `src/lib/auth.ts:35`)
- **Code examples** showing security features
- **Before/after** comparisons for vulnerable vs secure code
- **Testing results** showing attacks being prevented

Good luck with your exam!
