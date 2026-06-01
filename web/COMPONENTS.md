# Smart Attendance System - Web Dashboard Components

## Overview

This document describes all the UI components created for the Smart Attendance System web dashboard. All components are built with React, TypeScript, and Tailwind CSS.

### Color Scheme
- **Primary Blue**: #1A56DB
- **Dark Background**: #0F172A (Sidebar)
- **White**: Background and cards
- **Neutral Grays**: Supporting UI elements

---

## Components

### 1. **Layout Component** (`Layout.tsx`)

The main layout wrapper that provides the application structure with sidebar, header, and content area.

#### Features
- **Sidebar** (220px wide)
  - App logo with icon and branding
  - Navigation menu with 7 items (Overview, Users, Courses, Sessions, Reports, Anomalies, Audit Log)
  - Role-based visibility (Audit Log only for SUPER_ADMIN)
  - User info section with logout button
  - Active link highlighting with blue accent

- **Top Header**
  - Page title based on current route
  - Notification bell with unread count badge
  - User avatar

- **Mobile Responsive**
  - Collapsible sidebar with hamburger menu
  - Full responsive design

#### Usage
```tsx
import { Layout } from './components';

<Layout
  user={{ name: 'John Admin', role: 'SUPER_ADMIN' }}
  unreadNotifications={3}
  onLogout={() => handleLogout()}
>
  {/* Your page content */}
</Layout>
```

#### Props
```typescript
interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; role: 'ADMIN' | 'SUPER_ADMIN' | 'LECTURER' | 'STUDENT' };
  unreadNotifications?: number;
  onLogout?: () => void;
}
```

---

### 2. **Button Component** (`Button.tsx`)

Versatile button component with multiple variants and sizes.

#### Variants
- **primary** (default): Blue background with white text
- **outline**: White background with blue border
- **ghost**: Transparent background
- **danger**: Red background for destructive actions

#### Sizes
- **sm**: Small button (px-3 py-1.5)
- **md**: Medium button (px-4 py-2)
- **lg**: Large button (px-6 py-3)

#### Features
- Loading state with spinner animation
- Disabled state with reduced opacity
- Smooth transitions

#### Usage
```tsx
import { Button } from './components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="danger" isLoading>
  Saving...
</Button>

<Button variant="outline" disabled>
  Disabled Button
</Button>
```

---

### 3. **Input Component** (`Input.tsx`)

Text input with label, error messaging, and icon support.

#### Features
- Label above input
- Error message display in red
- Left icon slot
- Blue focus ring
- Full width by default
- Disabled state styling

#### Usage
```tsx
import { Input } from './components/ui';
import { Search } from 'lucide-react';

<Input 
  label="Email Address"
  placeholder="Enter email..."
  error="Invalid email format"
/>

<Input 
  label="Search"
  leftIcon={<Search size={16} />}
  placeholder="Search users..."
/>
```

#### Props
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}
```

---

### 4. **Card Component** (`Card.tsx`)

Container component with white background and border. Supports header, body, and footer sections.

#### Components
- **Card**: Main wrapper
- **CardHeader**: Optional header with title and action slot
- **CardBody**: Main content area
- **CardFooter**: Optional footer with buttons

#### Features
- White background with gray border
- 12px border radius
- Optional shadow
- Flexible layout

#### Usage
```tsx
import { Card, CardHeader, CardBody, CardFooter } from './components/ui';

<Card shadow>
  <CardHeader action={<Button>Action</Button>}>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    <p>Card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button variant="ghost">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

---

### 5. **Badge Component** (`Badge.tsx`)

Small pill-shaped label for status indicators.

#### Variants
- **good**: Green background (success)
- **warning**: Amber background (warning)
- **atRisk**: Orange background (at risk)
- **critical**: Red background (critical)
- **primary**: Blue background
- **neutral**: Gray background (default)

#### Usage
```tsx
import { Badge } from './components/ui';

<Badge variant="good">Active</Badge>
<Badge variant="critical">Critical</Badge>
<Badge variant="warning">In Progress</Badge>
```

---

### 6. **Table Component** (`Table.tsx`)

Full-featured data table with sorting, loading states, and empty states.

#### Features
- Black header row with white text
- Alternating row colors (white and light blue)
- Horizontal scroll wrapper for responsiveness
- Loading skeleton rows
- Empty state slot
- Column customization with render functions
- Hover effects

#### Usage
```tsx
import { Table } from './components/ui';

const columns = [
  { key: 'id', label: 'ID', width: 'w-20' },
  { key: 'name', label: 'Name' },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <Badge variant={value === 'active' ? 'good' : 'neutral'}>{value}</Badge>
  },
];

const data = [
  { id: '1', name: 'John Doe', status: 'active' },
  { id: '2', name: 'Jane Smith', status: 'inactive' },
];

<Table 
  columns={columns}
  data={data}
  isLoading={false}
  emptyState={<p>No data available</p>}
/>
```

#### Props
```typescript
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  loadingRows?: number; // Default 5
  emptyState?: React.ReactNode;
  className?: string;
}
```

---

### 7. **Modal Component** (`Modal.tsx`)

Centered modal dialog with backdrop overlay.

#### Features
- Backdrop click to close
- Escape key to close
- Header with title and close button
- Scrollable body content
- Optional footer with buttons
- Multiple sizes (sm, md, lg)
- Prevents body scroll when open

#### Usage
```tsx
import { Modal } from './components/ui';
import { Button } from './components/ui';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={() => setIsOpen(false)}>Confirm</Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

#### Props
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```

---

### 8. **StatCard Component** (`StatCard.tsx`)

Displays a metric with number, label, and optional trend indicator.

#### Features
- Large bold number display
- Label below number
- Optional trend indicator (up/down arrow with percentage)
- Colored left border based on status
- Optional icon display
- Status variants (good, warning, critical, neutral)

#### Usage
```tsx
import { StatCard } from './components/ui';

<StatCard
  value="245"
  label="Total Students"
  icon="👥"
  status="good"
  trend={{ value: 12, isPositive: true }}
/>

<StatCard
  value="89%"
  label="Average Attendance"
  status="warning"
  trend={{ value: 5, isPositive: false }}
/>
```

#### Props
```typescript
interface StatCardProps {
  value: string | number;
  label: string;
  trend?: { value: number; isPositive: boolean };
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}
```

---

### 9. **ProgressBar Component** (`ProgressBar.tsx`)

Horizontal progress bar with dynamic color based on percentage.

#### Color Scale
- **< 40%**: Red
- **40-60%**: Orange
- **60-80%**: Amber
- **>= 80%**: Green

#### Features
- Smooth animations
- Optional label
- Automatic percentage clamping (0-100)
- Customizable height
- Right-aligned percentage display

#### Usage
```tsx
import { ProgressBar } from './components/ui';

<ProgressBar 
  percentage={85}
  label="Student A Attendance"
  showLabel={true}
/>

<ProgressBar 
  percentage={45}
  label="Course Completion"
  height={12}
/>
```

#### Props
```typescript
interface ProgressBarProps {
  percentage: number;
  label?: string;
  showLabel?: boolean; // Default: true
  height?: number; // Default: 8
  className?: string;
}
```

---

## Importing Components

### From UI Folder
```tsx
import { Button, Input, Card, Badge, Table, Modal, StatCard, ProgressBar } from './components/ui';
```

### From Components Folder
```tsx
import { Layout, Button, Input, Card, CardHeader, CardBody, CardFooter } from './components';
```

---

## Color Reference

| Color | Value | Usage |
|-------|-------|-------|
| Primary Blue | #1A56DB | Buttons, links, active states |
| Dark Slate | #0F172A | Sidebar background |
| White | #FFFFFF | Cards, header, text backgrounds |
| Gray 50 | #F8FAFF | Alternating table rows |
| Gray 100 | #F3F4F6 | Hover states |
| Gray 200 | #E5E7EB | Borders |
| Gray 600 | #4B5563 | Secondary text |
| Green 500 | Success indicator |
| Amber 500 | Warning indicator |
| Orange 500 | At-risk indicator |
| Red 500 | Critical/Danger indicator |

---

## Dependencies

The components use the following packages:
- **React**: ^18.0.0
- **TypeScript**: For type safety
- **Tailwind CSS**: For styling
- **lucide-react**: For icons (Bell, LogOut, Menu, X, Search, TrendingUp, TrendingDown)

---

## Component Showcase

A complete demo of all components can be found in `ComponentShowcase.tsx`. This file demonstrates:
- All button variants
- Input states
- All badge variants
- Stat cards with trends
- Progress bars
- Data tables
- Modal dialogs
- Complete card examples

To view the showcase:
```tsx
import ComponentShowcase from './components/ComponentShowcase';
```

---

## Best Practices

1. **Layout**: Always wrap your pages with the `Layout` component
2. **Forms**: Use `Input` component with proper labels and error handling
3. **Data Display**: Use `Table` for tabular data, `Card` for grouped content
4. **Status**: Use `Badge` for status indicators
5. **Actions**: Use `Button` with appropriate variants (danger for destructive actions)
6. **Modals**: Use for confirmations and critical actions
7. **Metrics**: Use `StatCard` for dashboard displays

---

## Responsive Design

All components are mobile-responsive:
- Sidebar collapses on mobile with hamburger menu
- Tables have horizontal scroll on small screens
- Grid layouts use responsive column counts (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Modals adjust width for mobile screens

---

## Accessibility

Components include:
- Semantic HTML
- ARIA labels where appropriate
- Keyboard navigation support (Escape to close modals)
- Focus indicators with blue ring
- Sufficient color contrast
- Disabled state styling for clarity

