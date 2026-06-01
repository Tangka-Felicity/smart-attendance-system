# Setup Guide for Smart Attendance Dashboard Components

## Prerequisites

This guide ensures your web dashboard is properly set up with all required dependencies and configurations.

## Required Dependencies

The dashboard components require the following npm packages:

```bash
npm install react react-dom
npm install typescript @types/react @types/react-dom
npm install tailwindcss postcss autoprefixer
npm install lucide-react
npm install react-router-dom
```

### Package Versions (Recommended)
- React: ^18.2.0
- TypeScript: ^5.0.0
- Tailwind CSS: ^3.3.0
- lucide-react: ^0.263.0
- react-router-dom: ^6.11.0

## Tailwind CSS Setup

### 1. Initialize Tailwind (if not already done)

```bash
npx tailwindcss init -p
```

This creates:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration

### 2. Configure tailwind.config.js

Update your `tailwind.config.js` to include the template paths:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'slate': {
          '950': '#0F172A', // Sidebar dark background
        },
        'blue': {
          '600': '#1A56DB', // Primary blue
        },
      },
      spacing: {
        'sidebar': '220px',
      },
    },
  },
  plugins: [],
}
```

### 3. Add Tailwind Directives

In your main CSS file (e.g., `src/index.css`), add:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Optional: Add custom styles */
@layer components {
  .transition-all {
    @apply transition-all duration-200;
  }
}
```

## Project Structure

Ensure your project has this structure:

```
web/
├── src/
│   ├── components/
│   │   ├── Layout.tsx                    ← Main layout
│   │   ├── ComponentShowcase.tsx         ← Component demo
│   │   ├── index.ts                      ← Barrel export
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Table.tsx
│   │       ├── Modal.tsx
│   │       ├── StatCard.tsx
│   │       ├── ProgressBar.tsx
│   │       └── index.ts                  ← Barrel export
│   ├── pages/
│   │   ├── Overview/
│   │   │   └── OverviewExample.tsx       ← Example page
│   │   ├── Users/
│   │   ├── Courses/
│   │   ├── Sessions/
│   │   ├── Reports/
│   │   ├── Anomalies/
│   │   ├── Audit/
│   │   └── Login/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── COMPONENTS.md
```

## App Router Setup Example

Here's how to set up React Router with the layout:

```typescript
// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components';
import OverviewPage from './pages/Overview/OverviewExample';

function App() {
  const user = {
    name: 'Admin User',
    role: 'SUPER_ADMIN' as const,
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <Layout
              user={user}
              unreadNotifications={0}
              onLogout={() => console.log('logout')}
            >
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/anomalies" element={<AnomaliesPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Routes>
            </Layout>
          }
        >
          {/* Nested routes */}
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
```

## Icon Library (lucide-react)

The components use icons from lucide-react. Here are all used icons:

```typescript
import { 
  Bell,           // Notifications
  LogOut,         // Logout
  Menu,           // Mobile menu
  X,              // Close
  Search,         // Search input
  Plus,           // Add button
  Edit2,          // Edit action
  Trash2,         // Delete action
  TrendingUp,     // Positive trend
  TrendingDown,   // Negative trend
} from 'lucide-react';
```

### Using Custom Icons

If you prefer different icons, install another library:

```bash
npm install react-icons
```

Then import from `react-icons/fa` or `react-icons/md`, etc.

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Development Server

Start the development server:

```bash
npm run dev
```

For Vite projects, this typically runs on `http://localhost:5173`

## Building for Production

```bash
npm run build
```

This will create an optimized production build in the `dist/` directory.

## Testing the Components

To test all components:

1. Import the ComponentShowcase component
2. Add it to your router
3. View at `http://localhost:5173/showcase`

```typescript
// src/App.tsx
import ComponentShowcase from './components/ComponentShowcase';

// In your routes:
<Route path="/showcase" element={<ComponentShowcase />} />
```

## Common Issues & Solutions

### Issue: Tailwind CSS not working
**Solution**: 
- Verify `tailwind.config.js` includes correct content paths
- Ensure CSS file has `@tailwind` directives
- Rebuild the project: `npm run dev`

### Issue: Lucide icons not rendering
**Solution**:
- Verify lucide-react is installed: `npm ls lucide-react`
- Import icons correctly: `import { IconName } from 'lucide-react'`
- Check that icons are used correctly in JSX

### Issue: TypeScript errors
**Solution**:
- Run `npm install @types/react @types/react-dom`
- Verify TypeScript version: `npm ls typescript`
- Check `tsconfig.json` configuration

### Issue: Layout sidebar not showing on mobile
**Solution**:
- Ensure viewport meta tag in HTML: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Check mobile breakpoints in Layout.tsx (md: breakpoint)

## Performance Optimization

### Code Splitting (Lazy Loading)

For large applications, use React.lazy():

```typescript
import { lazy, Suspense } from 'react';

const UsersPage = lazy(() => import('./pages/Users/UsersPage'));
const CoursesPage = lazy(() => import('./pages/Courses/CoursesPage'));

// In routes:
<Suspense fallback={<div>Loading...</div>}>
  <Route path="/users" element={<UsersPage />} />
</Suspense>
```

### Tree Shaking

The components are designed for tree-shaking. Only imported components are bundled:

```typescript
// Only Button is bundled
import { Button } from './components/ui';
```

## Browser Support

The components support:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Modern CSS features used:
- CSS Grid
- Flexbox
- CSS Custom Properties (for animations)

## Accessibility Features

The components include:
- ✅ Semantic HTML (button, input, table, etc.)
- ✅ ARIA labels and roles where needed
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators (blue ring)
- ✅ Color contrast ratios (WCAG AA compliant)
- ✅ Screen reader friendly

## Next Steps

1. ✅ Review [COMPONENTS.md](./COMPONENTS.md) for detailed API documentation
2. ✅ Check [OverviewExample.tsx](./src/pages/Overview/OverviewExample.tsx) for real-world usage
3. ✅ View [ComponentShowcase.tsx](./src/components/ComponentShowcase.tsx) for all variants
4. Create your own page components following the example structure
5. Integrate with your backend API
6. Add state management (Redux, Zustand, etc.) if needed
7. Implement authentication flow

## Support

For issues or questions:
1. Check the [COMPONENTS.md](./COMPONENTS.md) documentation
2. Review the example implementations
3. Check component prop interfaces for available options
4. Review Tailwind CSS documentation: https://tailwindcss.com
5. Review lucide-react icons: https://lucide.dev
