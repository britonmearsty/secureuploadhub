# Custom 404 Not Found Pages

This project includes specialized 404 pages for different sections of the application, each tailored to provide contextual help and navigation options.

## 📁 Available Custom 404 Pages

### 1. **Root 404** (`/app/not-found.tsx`)
- **Triggers**: Any invalid route at the root level
- **Icon**: FileQuestion (generic file not found)
- **Theme**: Neutral colors (primary/accent) with ThemeWrapper
- **Actions**: Go Home, Go Back
- **Links**: Dashboard, Sign In, Privacy, Terms

### 2. **Admin 404** (`/app/admin/not-found.tsx`)
- **Triggers**: Invalid admin routes (`/admin/*`)
- **Icon**: Shield (security/admin themed)
- **Theme**: Red/destructive colors (restricted access)
- **Actions**: Admin Dashboard, Go Home
- **Links**: User Management, Analytics, Settings, Billing
- **Context**: Emphasizes permission/access issues
- **Theme Provider**: Uses existing admin layout (no wrapper needed)

### 3. **Dashboard 404** (`/app/dashboard/not-found.tsx`)
- **Triggers**: Invalid dashboard routes (`/dashboard/*`)
- **Icon**: LayoutDashboard (dashboard themed)
- **Theme**: Blue/info colors (workspace focused)
- **Actions**: My Dashboard, My Portals
- **Links**: Upload Portals, Clients, Settings, Billing
- **Context**: User workspace navigation
- **Theme Provider**: Uses existing dashboard layout ThemeProvider

### 4. **Auth 404** (`/app/auth/not-found.tsx`)
- **Triggers**: Invalid auth routes (`/auth/*`)
- **Icon**: LogIn (authentication themed)
- **Theme**: Yellow/warning colors (auth issues) with ThemeWrapper
- **Actions**: Sign In, Go Home
- **Links**: Sign In, Create Account, Privacy Policy, Terms
- **Context**: Authentication and account help

### 5. **API 404** (`/app/api/not-found.tsx`)
- **Triggers**: Invalid API routes (`/api/*`)
- **Icon**: Code (developer/technical themed)
- **Theme**: Red/destructive colors (error state) with ThemeWrapper
- **Actions**: Go Home, Dashboard
- **Links**: API Documentation, Dashboard, Authentication
- **Context**: Developer-focused with technical details
- **Special**: Includes HTTP error details and developer resources, monospace font

### 6. **Portal 404** (`/app/p/not-found.tsx`)
- **Triggers**: Invalid portal routes (`/p/*`)
- **Icon**: Upload (file upload themed)
- **Theme**: Yellow/warning colors (portal issues) with ThemeWrapper
- **Actions**: Go Home, Create Portal
- **Links**: Sign In, Learn More, Privacy Policy, Security
- **Context**: Explains portal-specific issues (expired, deleted, restricted)

## 🎨 Design Features

### Theme Awareness
- **Smart Theme Handling**: Pages use ThemeWrapper for public routes, existing ThemeProvider for authenticated routes
- **No Theme Conflicts**: Resolved nested ThemeProvider issues by using ThemeWrapper for public pages
- **Dynamic Styling**: All decorative elements adapt to light/dark themes
- **Consistent Experience**: Maintains theme consistency across all 404 pages

### Visual Consistency
- Large animated "404" text with pulse effect
- Floating themed icons with smooth animation
- Consistent button styling and hover effects
- Theme-aware decorative background elements
- Custom `animate-float` keyframe animation

### User Experience
- Contextual messaging for each section
- Multiple navigation options
- Relevant quick links for each area
- Professional error explanations
- Responsive design for all screen sizes

## 🔧 Technical Implementation

### Next.js App Router
- Uses the standard `not-found.tsx` convention
- Automatic route-based 404 handling
- No additional routing configuration needed

### Theme Integration
- **ThemeWrapper Component**: Created for public pages that don't have existing ThemeProvider
- **Existing ThemeProviders**: Admin and dashboard layouts keep their existing theme setup
- **No Conflicts**: Removed ThemeProvider from root layout to prevent nesting issues
- **CSS Variables**: Uses existing CSS custom properties from `globals.css`

### File Structure
```
app/
├── not-found.tsx              # Root 404 (with ThemeWrapper)
├── admin/not-found.tsx        # Admin 404 (uses admin layout)
├── dashboard/not-found.tsx    # Dashboard 404 (uses dashboard ThemeProvider)
├── auth/not-found.tsx         # Auth 404 (with ThemeWrapper)
├── api/not-found.tsx          # API 404 (with ThemeWrapper)
└── p/not-found.tsx            # Portal 404 (with ThemeWrapper)

components/
└── theme-wrapper.tsx          # ThemeProvider wrapper for public pages
```

## 🚀 How It Works

When a user navigates to an invalid route:

1. **Next.js** automatically looks for the closest `not-found.tsx` file
2. **Route matching** determines which custom 404 page to show
3. **Theme handling** applies appropriate theme provider:
   - Public routes use `ThemeWrapper` with system default
   - Admin/Dashboard routes use existing layout ThemeProviders
4. **Contextual content** provides relevant help and navigation

## 🎯 Benefits

- **Better UX**: Users get contextual help instead of generic errors
- **No Theme Conflicts**: Proper theme provider hierarchy prevents issues
- **Reduced confusion**: Clear explanations of what went wrong
- **Improved navigation**: Relevant links to get users back on track
- **Professional appearance**: Maintains brand consistency
- **Developer friendly**: API 404 includes technical details
- **Accessibility**: Proper semantic HTML and keyboard navigation

## 🧪 Testing

Use the test URLs in `test-404-routing.md` to verify each custom 404 page works correctly with proper theming and navigation.