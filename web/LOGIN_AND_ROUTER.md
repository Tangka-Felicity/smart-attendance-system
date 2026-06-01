# Login & Router Setup Guide

## Overview

This document describes the login page, authentication system, protected routes, and app router setup for the Smart Attendance System web dashboard.

## File Structure

```
src/
├── pages/
│   ├── Login/
│   │   └── LoginPage.tsx        ← Login page with blue/white design
│   ├── Overview/
│   │   └── OverviewExample.tsx
│   ├── Users/
│   │   └── UsersPage.tsx
│   ├── Courses/
│   │   └── CoursesPage.tsx
│   ├── Sessions/
│   │   ├── SessionsPage.tsx
│   │   └── SessionDetailPage.tsx
│   ├── Reports/
│   │   └── ReportsPage.tsx
│   ├── Anomalies/
│   │   └── AnomaliesPage.tsx
│   └── Audit/
│       └── AuditPage.tsx
├── components/
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx       ← Route protection wrapper
│   └── ...
├── context/
│   └── AuthContext.tsx          ← Authentication context
├── api/
│   └── client.ts                ← API client with auth interceptors
├── App.tsx                      ← Main router setup
└── main.tsx                     ← App entry point with BrowserRouter
```

## Components

### 1. LoginPage (`src/pages/Login/LoginPage.tsx`)

Full-page login form with blue and white design.

#### Design
- **Left Side (Hidden on Mobile)**
  - Solid blue background (#1A56DB)
  - Large white clipboard emoji in circle
  - "Smart Attendance System" title
  - "Lecturer & Admin Portal" subtitle
  - Three feature badges:
    - 🔒 Secure QR Check-in
    - 📍 GPS Verified
    - 👤 Face Recognition

- **Right Side (White Background)**
  - "Welcome Back" heading
  - Centered login card
  - Email input with envelope icon
  - Password input with lock icon and toggle to show/hide
  - Error banner (red) if login fails
  - Blue "Sign In" button with loading state
  - Version footer

#### Usage
The LoginPage is automatically accessed when visiting `/login` or when not authenticated.

#### Features
- Form validation (email and password required)
- Real-time password visibility toggle
- Loading state on button during authentication
- Error message display
- Automatic redirect to `/` on successful login

#### Integration with AuthContext
```typescript
const { login, loading } = useAuth();
```

### 2. ProtectedRoute (`src/components/ProtectedRoute.tsx`)

Wrapper component that checks authentication status and protects routes.

#### Features
- Checks `isAuthenticated` from `AuthContext`
- Redirects to `/login` if not authenticated
- Shows centered loading spinner while checking auth status
- Blue spinner color matching theme

#### Usage
```typescript
// In App.tsx
<Route
  element={
    <ProtectedRoute>
      <Layout>
        <Routes>
          {/* Protected routes */}
        </Routes>
      </Layout>
    </ProtectedRoute>
  }
/>
```

#### Props
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

### 3. AuthContext (`src/context/AuthContext.tsx`)

Context for managing authentication state across the app.

#### Context Type
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
```

#### Features
- Session persistence (restores user from localStorage on mount)
- Automatic token refresh on 401 errors
- Token storage in localStorage
- Role-based access control (ADMIN, SUPER_ADMIN, LECTURER, STUDENT)

#### Usage
```typescript
import { useAuth } from '../context/AuthContext';

const { user, isAuthenticated, loading, login, logout } = useAuth();

// Login
await login(email, password);

// Logout
await logout();
```

#### Environment Setup
The AuthContext expects the following API endpoints (see `src/api/client.ts`):
- `POST /auth/login` - Login endpoint
- `POST /auth/logout` - Logout endpoint
- `GET /auth/me` - Get current user

API Base URL: `http://localhost:8000/v1`

### 4. API Client (`src/api/client.ts`)

Axios client with request/response interceptors for handling authentication.

#### Features
- Automatic Bearer token injection in headers
- Automatic token refresh on 401 response
- Refresh token handling
- Clear storage and redirect to login on auth failure

#### Available APIs
```typescript
// Auth
authApi.login(email, password)
authApi.logout(refreshToken)
authApi.me()

// Users
usersApi.list(params)
usersApi.create(body)
usersApi.get(id)
usersApi.update(id, body)
// ... etc

// Courses, Sessions, Attendance, etc.
```

## Router Setup

### App.tsx Route Configuration

```
/login                      → LoginPage (public, no layout)
/                           → OverviewPage (protected, with layout)
/users                      → UsersPage (protected, with layout)
/courses                    → CoursesPage (protected, with layout)
/sessions                   → SessionsPage (protected, with layout)
/sessions/:id               → SessionDetailPage (protected, with layout)
/reports                    → ReportsPage (protected, with layout)
/anomalies                  → AnomaliesPage (protected, with layout)
/audit                      → AuditPage (protected, SUPER_ADMIN only)
/*                          → Redirect to / (catch-all)
```

### Architecture

```
BrowserRouter (in main.tsx)
  └── AuthProvider (in App.tsx)
       └── QueryClientProvider (in App.tsx)
            └── Routes
                 ├── Public Route: /login → LoginPage
                 └── Protected Routes (wrapped in ProtectedRoute):
                      └── Layout wrapper
                           └── Route children
```

## Authentication Flow

### Login Flow
1. User visits `/login`
2. Enters email and password
3. Click "Sign In"
4. LoginPage calls `useAuth().login(email, password)`
5. API call to `POST /auth/login`
6. Token and user data received
7. Tokens stored in localStorage
8. User context updated
9. Redirect to `/` (OverviewPage)

### Protected Route Access
1. User tries to access `/users` (or any protected route)
2. ProtectedRoute checks `isAuthenticated`
3. If not authenticated: redirect to `/login`
4. If loading: show spinner
5. If authenticated: render children

### Token Refresh
1. API call returns 401 status
2. Request interceptor catches error
3. Automatically makes refresh request to `POST /auth/refresh`
4. Updates access token in localStorage
5. Retries original request with new token
6. If refresh fails: clear storage and redirect to `/login`

### Logout Flow
1. User clicks logout button in sidebar
2. Layout calls `useAuth().logout()`
3. API call to `POST /auth/logout` (optional)
4. Tokens cleared from localStorage
5. User context cleared
6. Redirect to `/login`

## Configuration

### Base API URL
Update in `src/api/client.ts`:
```typescript
const client: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/v1',  // Change this
});
```

### Token Refresh Endpoint
Update in `src/api/client.ts`:
```typescript
const response = await axios.post(
  'http://localhost:8000/v1/auth/refresh',  // Change this
  { refresh_token: refreshToken }
);
```

### Query Client Options
Update in `src/App.tsx`:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1,
    },
  },
});
```

## Dependencies

Required packages:
```bash
npm install react-router-dom
npm install @tanstack/react-query
npm install axios
npm install lucide-react
```

## Environment Variables

While optional, you can set these in `.env`:
```
VITE_API_BASE_URL=http://localhost:8000/v1
VITE_APP_VERSION=1.0.0
```

Then update `src/api/client.ts`:
```typescript
const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/v1',
});
```

## Common Patterns

### Using Auth in Components
```typescript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }
  
  return <p>Welcome, {user?.name}!</p>;
};
```

### Making Authenticated API Calls
```typescript
import { usersApi } from '../api/client';

const fetchUsers = async () => {
  try {
    const response = await usersApi.list();
    console.log(response.data);
  } catch (error) {
    // Handle error - will auto-redirect to login on 401
  }
};
```

### Using React Query with API
```typescript
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/client';

const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => usersApi.list(),
});
```

## Troubleshooting

### Issue: Login not working
**Solution**: 
- Check backend is running on `http://localhost:8000`
- Verify `/auth/login` endpoint exists
- Check network tab in DevTools for error response

### Issue: Stuck on loading spinner
**Solution**:
- Check AuthProvider is wrapping the app
- Verify token exists in localStorage
- Check `/auth/me` endpoint works

### Issue: Logout doesn't redirect
**Solution**:
- Ensure logout button calls Layout's handleLogout or useAuth().logout()
- Check redirect logic in handleLogout

### Issue: Tokens not persisting
**Solution**:
- Check browser localStorage is enabled
- Verify tokens are being set in localStorage
- Check token key names match in storage and retrieval

## Security Considerations

1. **Token Storage**: Currently using localStorage (suitable for most web apps)
   - Alternative: Use httpOnly cookies for better security
   
2. **HTTPS**: Always use HTTPS in production
   
3. **Token Expiry**: Set short expiry times for access tokens (5-15 min)
   
4. **Refresh Token**: Store refresh tokens securely (httpOnly cookies)
   
5. **CORS**: Configure CORS properly on backend
   
6. **Role-Based Routes**: Check user role before rendering sensitive routes (add role checks)

## Next Steps

1. Test login with backend API
2. Implement role-based access restrictions on routes
3. Add password reset functionality
4. Add "Remember me" functionality
5. Add two-factor authentication
6. Add social login (Google, GitHub, etc.)
7. Implement session timeout
8. Add login audit logging
