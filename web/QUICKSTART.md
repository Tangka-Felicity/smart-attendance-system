# Quick Start Guide - Web Dashboard

## Project Structure

Your web dashboard has been set up with:
- ✅ Reusable UI component library (Layout, Button, Input, Card, Badge, Table, Modal, StatCard, ProgressBar)
- ✅ Beautiful login page with blue/white design
- ✅ Complete router with 8 pages
- ✅ Authentication system with token refresh
- ✅ Protected routes with loading states

## Running the Dashboard

### Prerequisites
```bash
# Node.js 16+ and npm
node --version
npm --version
```

### Installation
```bash
cd web
npm install
```

### Development
```bash
npm run dev
```
The app will start at `http://localhost:5173`

### Building
```bash
npm run build
npm run preview  # Preview production build
```

## Login Credentials

For testing with the mock API:
```
Email: any@email.com
Password: any password

(Backend must be running for real authentication)
```

## File Guide

### Pages
| Path | File | Purpose |
|------|------|---------|
| `/login` | `src/pages/Login/LoginPage.tsx` | Authentication form |
| `/` | `src/pages/Overview/OverviewExample.tsx` | Dashboard home |
| `/users` | `src/pages/Users/UsersPage.tsx` | User management |
| `/courses` | `src/pages/Courses/CoursesPage.tsx` | Course management |
| `/sessions` | `src/pages/Sessions/SessionsPage.tsx` | Session list |
| `/sessions/:id` | `src/pages/Sessions/SessionDetailPage.tsx` | Session details |
| `/reports` | `src/pages/Reports/ReportsPage.tsx` | Reports |
| `/anomalies` | `src/pages/Anomalies/AnomaliesPage.tsx` | Anomalies |
| `/audit` | `src/pages/Audit/AuditPage.tsx` | Audit log (SUPER_ADMIN only) |

### Key Components
| Component | File | Purpose |
|-----------|------|---------|
| Layout | `src/components/Layout.tsx` | Main app layout with sidebar |
| ProtectedRoute | `src/components/ProtectedRoute.tsx` | Route authentication guard |
| Button | `src/components/ui/Button.tsx` | Reusable button |
| Input | `src/components/ui/Input.tsx` | Form input with validation |
| Card | `src/components/ui/Card.tsx` | Container component |
| Badge | `src/components/ui/Badge.tsx` | Status indicator |
| Table | `src/components/ui/Table.tsx` | Data table |
| Modal | `src/components/ui/Modal.tsx` | Dialog component |
| StatCard | `src/components/ui/StatCard.tsx` | Metric card |
| ProgressBar | `src/components/ui/ProgressBar.tsx` | Progress indicator |

### Core Systems
| System | File | Purpose |
|--------|------|---------|
| Authentication | `src/context/AuthContext.tsx` | User state & auth logic |
| Router | `src/App.tsx` | React Router setup |
| API Client | `src/api/client.ts` | Axios with interceptors |
| Entry Point | `src/main.tsx` | App initialization |

## Using Components

### Simple Button
```tsx
import { Button } from './components/ui';

<Button variant="primary" size="md">
  Click Me
</Button>
```

### Form Input
```tsx
import { Input } from './components/ui';

<Input 
  label="Email"
  placeholder="your@email.com"
  error={error}
/>
```

### Data Table
```tsx
import { Table } from './components/ui';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
];

<Table columns={columns} data={users} isLoading={loading} />
```

### Modal Dialog
```tsx
import { Modal, Button } from './components/ui';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={<Button onClick={() => setIsOpen(false)}>Close</Button>}
>
  <p>Are you sure?</p>
</Modal>
```

## Authentication

### Check if User is Logged In
```tsx
import { useAuth } from './context/AuthContext';

const { isAuthenticated, user } = useAuth();

if (!isAuthenticated) {
  return <Navigate to="/login" />;
}

return <p>Welcome {user?.name}</p>;
```

### Making API Calls
```tsx
import { usersApi } from './api/client';

// Simple call
const users = await usersApi.list();

// With React Query
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => usersApi.list(),
});
```

## Color Theme

| Color | Value | Usage |
|-------|-------|-------|
| Primary Blue | #1A56DB | Buttons, links, active states |
| Dark Sidebar | #0F172A | Sidebar background |
| White | #FFFFFF | Cards, text backgrounds |
| Light Gray | #F8FAFF | Alternating table rows |
| Border Gray | #E2E8F0 | Card borders |
| Success Green | #22C55E | Success indicators |
| Warning Amber | #FBBF24 | Warnings |
| At-Risk Orange | #F97316 | At-risk status |
| Critical Red | #EF4444 | Critical/Danger |

## Navigation

The sidebar automatically shows navigation based on user role:

### All Users
- 📊 Overview
- 👥 Users
- 📚 Courses
- 📅 Sessions
- 📈 Reports
- ⚠️ Anomalies

### SUPER_ADMIN Only
- 📋 Audit Log

## Customizing Pages

Each page is a simple React component:

```tsx
import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/ui';

export const CustomPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card shadow>
        <CardHeader>
          <h3 className="text-lg font-bold">Page Title</h3>
        </CardHeader>
        <CardBody>
          {/* Your content here */}
        </CardBody>
      </Card>
    </div>
  );
};

export default CustomPage;
```

Then register the route in `src/App.tsx`:
```tsx
<Route path="/custom" element={<CustomPage />} />
```

## Backend Integration

### API Base URL
Update in `src/api/client.ts`:
```typescript
baseURL: 'http://localhost:8000/v1'
```

### Required Endpoints
The app expects these endpoints to exist:
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user  
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh access token

All other endpoints are defined in `src/api/client.ts`

## Troubleshooting

### Login page shows but won't submit
- [ ] Check backend is running on `http://localhost:8000`
- [ ] Verify `/auth/login` endpoint exists
- [ ] Check browser console for errors

### Can't access protected routes
- [ ] Make sure you're logged in
- [ ] Check ProtectedRoute is wrapping your routes
- [ ] Verify AuthProvider is at the top level

### Styles look broken
- [ ] Clear browser cache
- [ ] Restart dev server: `npm run dev`
- [ ] Check Tailwind CSS is configured

### API calls failing
- [ ] Check backend is running
- [ ] Verify API base URL is correct
- [ ] Check network tab in DevTools
- [ ] Check CORS is enabled on backend

## TypeScript

The project uses TypeScript for type safety. Each component exports its prop types:

```tsx
// Get prop types
import { Button } from './components/ui';
import type { ButtonProps } from './components/ui/Button';

const MyComponent = (props: ButtonProps) => {
  return <Button {...props} />;
};
```

## Documentation

For detailed information, see:
- [COMPONENTS.md](./COMPONENTS.md) - UI component API
- [LOGIN_AND_ROUTER.md](./LOGIN_AND_ROUTER.md) - Auth and routing
- [SETUP.md](./SETUP.md) - Initial setup guide

## Deployment

### Build for Production
```bash
npm run build
```

This creates optimized files in the `dist/` folder.

### Deploy to Hosting
The `dist/` folder can be deployed to:
- Vercel (`vercel deploy`)
- Netlify (`netlify deploy`)
- AWS S3 + CloudFront
- Any static hosting service

### Environment Variables
Create `.env.production`:
```
VITE_API_BASE_URL=https://api.example.com/v1
```

## Support

1. Check the documentation files
2. Review example implementations
3. Check component prop types
4. Review error messages in browser console

## Next Steps

1. ✅ Run `npm install`
2. ✅ Run `npm run dev`
3. ✅ Visit `http://localhost:5173`
4. ✅ Test login (backend required)
5. ✅ Customize page components
6. ✅ Connect to your backend API
