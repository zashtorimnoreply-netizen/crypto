# CSS Setup Documentation

## Overview
This project uses **Tailwind CSS v4** for styling. The setup has been updated to work with the latest version of Tailwind.

## Important Changes from Tailwind v3 to v4

### 1. CSS Import Syntax
**Old (v3):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**New (v4):**
```css
@import "tailwindcss";
```

### 2. PostCSS Configuration
The project uses `@tailwindcss/postcss` plugin instead of the traditional `tailwindcss` plugin in `postcss.config.js`.

## Configuration Files

### `/frontend/tailwind.config.js`
- Defines content paths for Tailwind to scan
- Custom color palette (primary, success, warning, error, neutral)
- Custom spacing values (18, 88, 112, 128)

### `/frontend/postcss.config.js`
- Uses `@tailwindcss/postcss` for Tailwind v4
- Includes `autoprefixer` for browser compatibility

### `/frontend/src/index.css`
- Main CSS file with Tailwind import
- Custom CSS variables for colors
- Global styles for scrollbar
- Reset styles

## Installation

### Initial Setup
```bash
cd frontend
npm install --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is required due to peer dependency conflicts between Sentry (which requires React 18) and React 19. This is configured in `.npmrc` for convenience.

### Dependencies
- `tailwindcss@^4.1.18` - Main Tailwind CSS framework
- `@tailwindcss/postcss@^4.1.18` - PostCSS plugin for Tailwind v4
- `postcss@^8.5.6` - CSS transformer
- `autoprefixer@^10.4.23` - Adds vendor prefixes

## Development

### Start Development Server
```bash
npm run dev
```
Vite will compile CSS on-the-fly and hot-reload changes.

### Build for Production
```bash
npm run build
```
Tailwind will purge unused styles for optimal bundle size (~33KB minified).

## Styling Components

### Use Tailwind Utility Classes
```jsx
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
  <h1 className="text-4xl font-bold text-blue-600">Portfolio</h1>
  <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
    Upload CSV
  </button>
</div>
```

### Custom Colors (from tailwind.config.js)
- `bg-primary` → #3B82F6 (blue)
- `text-success` → #10B981 (green)
- `border-warning` → #F59E0B (yellow/orange)
- `bg-error` → #EF4444 (red)
- `text-neutral` → #6B7280 (gray)

### Custom Spacing
- `p-18` → 4.5rem
- `m-88` → 22rem
- `w-112` → 28rem
- `h-128` → 32rem

## Troubleshooting

### CSS Not Loading
1. Verify `src/index.css` contains `@import "tailwindcss";`
2. Check `src/main.jsx` imports `./index.css`
3. Clear cache: `rm -rf node_modules/.cache`
4. Rebuild: `npm run build`

### Build Errors
1. Delete `node_modules` and `package-lock.json`
2. Reinstall: `npm install --legacy-peer-deps`
3. Check for missing dependencies (e.g., `react-is`)

### Styles Not Applying
1. Ensure class names are correct (use Tailwind docs)
2. Check browser DevTools → Elements → Styles
3. Verify the CSS file is loaded in Network tab
4. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Peer Dependency Warnings
The project uses React 19, but some dependencies (like Sentry) require React 18. These warnings are safe to ignore as the code is compatible. The `.npmrc` file automatically uses `--legacy-peer-deps`.

## Verifying Setup

### Check Installed Packages
```bash
npm list tailwindcss postcss autoprefixer @tailwindcss/postcss
```

### Check Build Output
```bash
npm run build
```
Look for `dist/assets/index-*.css` (~33KB)

### Inspect Generated CSS
```bash
head -50 dist/assets/index-*.css
```
Should show Tailwind utility classes and custom styles.

## Additional Resources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Vite CSS Documentation](https://vitejs.dev/guide/features.html#css)
- [PostCSS Documentation](https://postcss.org/)

## Notes

- Tailwind v4 uses a new engine that's faster and requires less configuration
- The `@import "tailwindcss";` syntax is the only way to include Tailwind in v4
- Production builds automatically purge unused styles based on `content` paths in `tailwind.config.js`
- Custom styles in `index.css` are preserved and included in the final bundle
- All components should use `className` (not `class` in JSX)
