# User Stories

## Status Overview

| Code  | User Story                                | Status  |
| ----- | ----------------------------------------- | ------- |
| US001 | User Registration                         | ✅ DONE |
| US002 | User Login                                | ✅ DONE |
| US003 | Session Management                        | ✅ DONE |
| US004 | Create Business                           | ✅ DONE |
| US005 | Assign Users to Business                  | ✅ DONE |
| US006 | Upload Business Logo                      | 📋 TODO |
| US007 | Create Portfolio                          | 📋 TODO |
| US008 | Toggle Portfolio Visibility               | 📋 TODO |
| US009 | View All Portfolios (Admin)               | 📋 TODO |
| US010 | View Visible Portfolios (Business Member) | 📋 TODO |
| US011 | View My Businesses                        | 📋 TODO |
| US012 | Add Comment to Portfolio                  | 📋 TODO |
| US013 | View Portfolio Comments                   | 📋 TODO |

---

## Authentication & Authorization

### US001: User Registration

**As a** visitor
**I want to** create a new account
**So that** I can access the platform and be assigned to businesses

**Acceptance Criteria:**

- ✅ User provides email and password
- ✅ Password meets security requirements (min 8 chars)
- ⚠️ Email verification sent _(not implemented - kept simple)_
- ✅ User is redirected to login after successful registration
- ✅ Session cookie is created on login

---

### US002: User Login

**As a** registered user
**I want to** log in with my credentials
**So that** I can access my assigned businesses and portfolios

**Acceptance Criteria:**

- ✅ User can login with email and password
- ✅ Session is stored in HTTP-only cookie
- ✅ User role (user/admin) determines access privileges per business
- ⚠️ Failed login attempts are rate-limited _(not implemented - kept simple)_
- ✅ User is redirected to their dashboard

---

### US003: Session Management

**As a** logged-in user
**I want to** stay logged in across browser sessions
**So that** I don't have to re-authenticate constantly

**Acceptance Criteria:**

- ✅ Session data stored in secure, HTTP-only cookies
- ✅ Session expires after 30 days of inactivity _(extended from 7 days)_
- ✅ User can manually log out to invalidate session

---

## Business Management

### US004: Create Business

**As a** logged-in user
**I want to** create a new business
**So that** I can manage portfolios for that business

**Acceptance Criteria:**

- User provides business name
- Creator automatically becomes admin of the business
- Business is created with default settings
- User is redirected to business dashboard

---

### US005: Assign Users to Business

**As a** business admin
**I want to** assign users to my business by their email address
**So that** they can view portfolios and collaborate

**Acceptance Criteria:**

- ✅ Admin can add users by entering their email address
- ✅ System validates that email belongs to registered user
- ✅ User is assigned with role (member only in this implementation)
- ✅ Assigned user can now see the business in their dashboard
- ⚠️ Assigned user receives notification of access granted _(not implemented)_
- ✅ Admin can view list of all assigned users
- 📋 Admin can remove user access _(future enhancement)_

---

### US006: Upload Business Logo

**As a** business admin
**I want to** upload a logo for my business
**So that** the business has visual branding

**Acceptance Criteria:**

- Admin can upload image files (PNG, JPG, WEBP)
- Maximum file size: 5MB
- Image is validated and sanitized server-side
- Image is resized/optimized automatically
- Logo displays on business profile

---

## Portfolio Management

### US007: Create Portfolio

**As a** business admin
**I want to** create a portfolio for my business
**So that** I can showcase work/projects to business members

**Acceptance Criteria:**

- Admin can create portfolio with title
- Portfolio is set to hidden by default
- Portfolio is associated with the business
- Portfolio appears in admin's portfolio list

---

### US008: Toggle Portfolio Visibility

**As a** business admin
**I want to** set portfolios as visible or hidden
**So that** I can control which portfolios business members can see

**Acceptance Criteria:**

- Admin can toggle portfolio between visible/hidden
- Hidden portfolios only visible to business admins
- Visible portfolios shown to all users assigned to the business
- Visibility change takes effect immediately
- Users not assigned to the business cannot see any portfolios

---

### US009: View All Portfolios (Admin)

**As a** business admin
**I want to** see all portfolios for my business
**So that** I can manage all content regardless of visibility status

**Acceptance Criteria:**

- Admin sees both visible and hidden portfolios
- List shows portfolio title and visibility status
- Admin can filter/sort portfolios
- Each portfolio shows its current visibility state (visible/hidden)

---

### US010: View Visible Portfolios (Business Member)

**As a** user assigned to a business
**I want to** see all visible portfolios for that business
**So that** I can view the work/projects I have access to

**Acceptance Criteria:**

- User only sees portfolios marked as visible
- Hidden portfolios are completely hidden from view
- List shows portfolio title and business name
- User cannot see visibility toggle controls
- User can only see portfolios for businesses they're assigned to

---

### US011: View My Businesses

**As a** logged-in user
**I want to** see a list of all businesses I have access to
**So that** I can navigate to the business and view its portfolios

**Acceptance Criteria:**

- Dashboard shows all businesses where user is assigned
- Each business shows user's role (admin/member)
- User can click to view business details and portfolios
- Businesses where user is admin are clearly indicated

---

## Comments

### US012: Add Comment to Portfolio

**As a** user assigned to a business
**I want to** add comments to visible portfolios
**So that** I can provide feedback and collaborate with other team members

**Acceptance Criteria:**

- User can add comment to any visible portfolio in their assigned businesses
- Comment content is validated and sanitized (XSS prevention)
- Comment displays username and timestamp
- Comment appears immediately after submission
- Empty comments are rejected

---

### US013: View Portfolio Comments

**As a** user assigned to a business
**I want to** see all comments on a portfolio
**So that** I can read feedback and discussions

**Acceptance Criteria:**

- Comments displayed in chronological order
- Each comment shows author name and timestamp
- User can see all comments on portfolios they have access to
- Comment count is visible on portfolio list
