# SUPABASE AUTHENTICATION SYSTEM - COMPLETE GUIDE

## Overview

This is a production-ready authentication system built with Supabase featuring:
- ✅ Google OAuth integration
- ✅ Email/Password authentication
- ✅ Real-time session management
- ✅ JWT verification middleware
- ✅ Row Level Security (RLS)
- ✅ Secure session handling
- ✅ Auto token refresh

---

## File Structure

```
Final Horizon AI/
├── services/
│   └── authService.ts              # Core Supabase auth service
├── components/
│   ├── AuthForm.tsx                # Login/Signup UI component
│   └── ProtectedRoute.tsx           # Protected route wrapper
├── contexts/
│   └── AuthContext.tsx             # Auth state context provider
├── api/
│   └── auth-middleware.ts          # Backend JWT verification
└── database/
    └── rls-policies.sql            # RLS policies & schema
```

---

## Setup Instructions

### 1. Environment Variables

Create `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from Supabase Dashboard → Settings → API Keys

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new OAuth 2.0 credential (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
4. Copy Client ID
5. Go to Supabase Dashboard → Authentication → Providers
6. Enable Google and paste Client ID
7. Set redirect URL to: `https://yourdomain.com/auth/callback`

### 3. Setup Database

In Supabase SQL Editor, run `database/rls-policies.sql` to create:
- Tables (users, profiles, roadmaps, quiz_results, learning_progress)
- RLS policies
- Indexes
- Triggers

### 4. Configure App.tsx

```tsx
import { AuthProvider } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/login" element={<AuthForm initialMode="login" />} />
          <Route path="/auth/signup" element={<AuthForm initialMode="signup" />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

---

## Frontend Usage

### Using Auth in Components

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user?.email}!</div>;
}
```

### Sign In with Google

```tsx
import { signInWithGoogle } from '../services/authService';

async function handleGoogleSignIn() {
  const result = await signInWithGoogle();
  if (result.success) {
    console.log('Signed in with Google');
  } else {
    console.error(result.error);
  }
}
```

### Sign In with Email/Password

```tsx
import { signInWithEmail } from '../services/authService';

async function handleEmailLogin(email: string, password: string) {
  const result = await signInWithEmail(email, password);
  if (result.success) {
    console.log('Logged in!', result.user);
  } else {
    console.error(result.error);
  }
}
```

### Sign Up

```tsx
import { signUpWithEmail } from '../services/authService';

async function handleSignUp(email: string, password: string, name: string) {
  const result = await signUpWithEmail(email, password, name);
  if (result.success) {
    console.log('Account created! Check email to confirm.');
  } else {
    console.error(result.error);
  }
}
```

### Sign Out

```tsx
import { signOut } from '../services/authService';

async function handleLogout() {
  const result = await signOut();
  if (result.success) {
    window.location.href = '/auth/login';
  }
}
```

### Logout Button Example

```tsx
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';

function LogoutButton() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <button onClick={handleLogout} className="btn btn-secondary">
      Logout
    </button>
  );
}
```

---

## Backend Usage

### Setup Express Server

```tsx
import express from 'express';
import {
  authMiddleware,
  requireRole,
  rateLimitByUser,
  securityHeaders,
} from './api/auth-middleware';

const app = express();

// Apply security middleware
app.use(securityHeaders);
app.use(express.json());

// Protected route - requires authentication
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Admin-only route
app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
  // Only admins can access this
  res.json({ success: true, message: 'Admin endpoint' });
});

// Rate limited route
app.get('/api/search', authMiddleware, rateLimitByUser(60, 60), (req, res) => {
  // User can make 60 requests per minute
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('API running on port 3001');
});
```

### Making Authenticated API Requests

**Frontend:**
```tsx
import { getAccessToken } from '../services/authService';

async function fetchUserData() {
  const token = await getAccessToken();

  const response = await fetch('/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}
```

**Backend:**
```tsx
// The token is automatically verified by authMiddleware
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    userId: req.user?.id,
    email: req.user?.email,
  });
});
```

---

## Security Best Practices

### ✅ DO:

- Use HTTPS in production
- Store tokens in HttpOnly cookies (if backend available)
- Enable CORS properly
- Use RLS on all database tables
- Validate input on backend
- Use rate limiting
- Implement CSRF protection
- Add security headers
- Keep JWT secrets safe
- Refresh tokens before expiration

### ❌ DON'T:

- Store sensitive data in localStorage
- Keep tokens in regular cookies (without HttpOnly)
- Disable HTTPS in production
- Expose API keys in frontend code
- Disable RLS on tables with user data
- Trust client-side validation alone
- Disable security headers
- Log sensitive data
- Use weak passwords
- Hardcode credentials

---

## Session Management

### Auto Token Refresh

Supabase automatically refreshes tokens when:
- Token is about to expire
- User navigates to a new page
- App is still open in browser

All handled by `authService.ts` automatically!

### Manual Token Refresh

```tsx
import { refreshSession } from '../services/authService';

async function refreshMyToken() {
  const result = await refreshSession();
  if (result.success) {
    console.log('Token refreshed!');
  }
}
```

### Get Access Token

```tsx
import { getAccessToken } from '../services/authService';

const token = await getAccessToken();
// Use token in API requests
```

---

## RLS Examples

### User Can Only Read Own Data

```sql
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);
```

### User Can Only Insert Own Data

```sql
CREATE POLICY "Users can create own records"
  ON quiz_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Admin Can Read All Data

```sql
CREATE POLICY "Admins can read all"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

---

## Password Reset Flow

### Request Password Reset

```tsx
import { requestPasswordReset } from '../services/authService';

async function requestReset() {
  const result = await requestPasswordReset('user@example.com');
  if (result.success) {
    console.log('Reset email sent!');
  }
}
```

User receives email with reset link:
```
https://yourdomain.com/auth/reset-password?token=...
```

### Handle Reset in App

```tsx
import { useSearchParams } from 'react-router-dom';
import { updatePasswordWithToken } from '../services/authService';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleReset = async (newPassword: string) => {
    const result = await updatePasswordWithToken(newPassword);
    if (result.success) {
      console.log('Password updated!');
      window.location.href = '/login';
    }
  };

  return (
    <form onSubmit={() => handleReset(...)}>
      {/* Password input */}
    </form>
  );
}
```

---

## Error Handling

All auth functions return standard response format:

```tsx
interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  session?: Session;
  error?: string;
}

// Usage:
const result = await signInWithEmail(email, password);

if (result.success) {
  console.log('Logged in!');
} else {
  console.error('Error:', result.error);
  // Show error to user
}
```

---

## Testing

### Test Google Sign-In Locally

1. Add `http://localhost:5173/auth/callback` to Google OAuth allowed URIs
2. Click "Sign in with Google"
3. Should redirect to Google login, then back to app

### Test Email Sign-Up

1. Navigate to `/auth/signup`
2. Enter valid email and password
3. Supabase sends confirmation email
4. Click link in email to confirm
5. Now can sign in

### Test Protected Routes

1. Sign out
2. Try to navigate to `/dashboard`
3. Should redirect to `/auth/login`
4. Sign in
5. Should access `/dashboard`

---

## Troubleshooting

### Issue: "CORS error when signing with Google"
**Fix:** Make sure redirect URL is registered in both Google Console AND Supabase

### Issue: "Token verification failing on backend"
**Fix:** Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in backend env vars

### Issue: "User can access other users' data"
**Fix:** Make sure RLS policies are enabled and correct. Check with:
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

### Issue: "localStorage errors"
**Fix:** Some browsers block localStorage in private mode. Supabase handles this automatically.

---

## Production Checklist

- [ ] Set HTTPS URLs in all configs
- [ ] Enable all RLS policies in database
- [ ] Test OAuth with production URLs
- [ ] Set secure cookie settings
- [ ] Enable CORS for your domain only
- [ ] Set up SMTP for auth emails
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Monitor failed login attempts
- [ ] Set up error logging
- [ ] Test password reset flow
- [ ] Verify JWT expiration times
- [ ] Enable email notifications
- [ ] Test with real users

---

## API Reference

### authService.ts Exports

```tsx
// Authentication
export const signInWithEmail: (email, password) => Promise<AuthResponse>
export const signUpWithEmail: (email, password, fullName?) => Promise<AuthResponse>
export const signInWithGoogle: () => Promise<AuthResponse>
export const signOut: () => Promise<AuthResponse>

// Session
export const getCurrentUser: () => Promise<User | null>
export const getCurrentSession: () => Promise<Session | null>
export const getAccessToken: () => Promise<string | null>
export const refreshSession: () => Promise<AuthResponse>

// Password
export const requestPasswordReset: (email) => Promise<AuthResponse>
export const updatePasswordWithToken: (newPassword) => Promise<AuthResponse>

// Utilities
export const isAuthenticated: () => Promise<boolean>
export const onAuthStateChange: (callback) => () => void
export const getUserProfile: (userId) => Promise<any>
```

---

## Support

For issues, check:
1. Supabase Documentation: https://supabase.com/docs/guides/auth
2. Error messages in browser console
3. Supabase Dashboard → Auth → User Management
4. Check RLS policies are enabled
