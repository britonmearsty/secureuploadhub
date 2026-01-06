# Testing Custom 404 Pages

## Test URLs to verify each custom 404 page works:

### 1. Root 404 (General)
- Test URL: `/this-does-not-exist`
- Expected: Root not-found page with FileQuestion icon
- Theme: Uses ThemeWrapper with system default

### 2. Admin 404
- Test URL: `/admin/invalid-page`
- Expected: Admin not-found page with Shield icon (red theme)
- Theme: Uses existing admin layout (no ThemeProvider needed)

### 3. Dashboard 404
- Test URL: `/dashboard/invalid-page`
- Expected: Dashboard not-found page with LayoutDashboard icon (blue theme)
- Theme: Uses existing dashboard layout ThemeProvider

### 4. Auth 404
- Test URL: `/auth/invalid-page`
- Expected: Auth not-found page with LogIn icon (yellow theme)
- Theme: Uses ThemeWrapper with system default

### 5. API 404
- Test URL: `/api/invalid-endpoint`
- Expected: API not-found page with Code icon (red theme, monospace font)
- Theme: Uses ThemeWrapper with system default

### 6. Portal 404
- Test URL: `/p/invalid-portal-slug`
- Expected: Portal not-found page with Upload icon (yellow theme)
- Theme: Uses ThemeWrapper with system default

## How to Test:

1. Start your development server: `npm run dev` or `yarn dev`
2. Navigate to each test URL above
3. Verify the correct 404 page appears with appropriate theming
4. Test theme switching (if available in that section)
5. Test all navigation links work correctly

## Expected Behavior:

- Each section shows its own custom 404 page
- Themes are applied correctly based on the section
- Navigation buttons work and lead to appropriate pages
- Animations and hover effects work smoothly
- Responsive design works on mobile and desktop