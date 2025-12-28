# Getting Started with Crypto Portfolio Frontend

## Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:3000/api
VITE_REFRESH_INTERVAL=300000
VITE_ENV=development
```

### 3. Start Development Server
```bash
npm run dev
```

The app will be available at **http://localhost:5173**

### 4. Verify Backend Connection
Make sure the backend API is running on **http://localhost:3000**

You can test it with:
```bash
curl http://localhost:3000/api/portfolios
```

## Development Workflow

### Running the App
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Project Structure Overview
```
frontend/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/        # Page components (routes)
│   ├── services/     # API service layer
│   ├── hooks/        # Custom React hooks
│   ├── context/      # Global state management
│   ├── utils/        # Utility functions
│   ├── App.jsx       # Main app component
│   └── main.jsx      # Entry point
├── public/           # Static assets
├── .env.local        # Environment variables (create this)
└── package.json      # Dependencies
```

## Key Features

### Dashboard Page (/)
- Portfolio overview with key metrics
- Equity curve chart showing portfolio value over time
- Asset allocation pie chart
- CSV trade import
- Bybit API integration for trade sync
- Risk indicators

### Two-Panel Layout
- **Left Panel (25%)**: Controls, data import, settings
- **Right Panel (75%)**: Charts, metrics, analytics
- Fully responsive - stacks on mobile

### State Management
- React Context API for global portfolio state
- Custom hooks for data fetching
- Automatic retry logic for failed API calls
- Loading states and error handling

## Making API Calls

### Example: Fetching Portfolio Data
```jsx
import { usePortfolioContext } from '../context/PortfolioContext';

function MyComponent() {
  const { currentPortfolio, loading, error } = usePortfolioContext();
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return <div>{currentPortfolio?.portfolio_name}</div>;
}
```

### Example: Using Custom Hooks
```jsx
import { useEquityCurve } from '../hooks/usePortfolio';

function EquityCurveChart() {
  const { data, loading, error, refetch } = useEquityCurve(portfolioId);
  
  // Use data, loading, error states
}
```

## Styling with Tailwind

All components use Tailwind CSS utility classes:

```jsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
  <p className="text-gray-600 mt-2">Description</p>
</div>
```

### Color Palette
- Primary: `text-blue-600`, `bg-blue-600`
- Success: `text-green-600`, `bg-green-600`
- Warning: `text-yellow-600`, `bg-yellow-600`
- Error: `text-red-600`, `bg-red-600`
- Neutral: `text-gray-600`, `bg-gray-600`

## Adding New Features

### 1. Add a New Component
```bash
# Create file in appropriate directory
touch src/components/MyComponent.jsx
```

```jsx
// src/components/MyComponent.jsx
const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="p-4">
      <h3>{prop1}</h3>
      <p>{prop2}</p>
    </div>
  );
};

export default MyComponent;
```

### 2. Add a New Page
```bash
touch src/pages/NewPage.jsx
```

Update `App.jsx`:
```jsx
import NewPage from './pages/NewPage';

<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/new" element={<NewPage />} />
</Routes>
```

### 3. Add a New API Service
```javascript
// src/services/myService.js
import api from './api';

export const getMyData = async (id) => {
  return api.get(`/my-endpoint/${id}`);
};
```

### 4. Create a Custom Hook
```javascript
// src/hooks/useMyData.js
import { useState, useEffect } from 'react';
import { getMyData } from '../services/myService';

export const useMyData = (id) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getMyData(id);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  return { data, loading, error };
};
```

## Troubleshooting

### Port 5173 is already in use
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
```

### API Connection Failed
1. Check if backend is running: `curl http://localhost:3000/api/portfolios`
2. Verify VITE_API_URL in `.env.local`
3. Check browser console for CORS errors
4. Ensure backend has CORS enabled for http://localhost:5173

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Tailwind Styles Not Working
1. Make sure `index.css` has Tailwind directives
2. Check `tailwind.config.js` content paths
3. Restart dev server: `Ctrl+C` then `npm run dev`

## Testing the App

### Manual Testing Checklist
- [ ] App loads without errors at http://localhost:5173
- [ ] Dashboard displays correctly
- [ ] Left and right panels are visible
- [ ] Header shows portfolio name and refresh button
- [ ] CSV upload component is functional
- [ ] Bybit sync component is functional
- [ ] Charts render (even with mock data)
- [ ] Metrics cards display
- [ ] No console errors in browser DevTools
- [ ] Responsive layout works (resize browser window)

### Browser DevTools
- **Console**: Check for errors and warnings
- **Network**: Monitor API calls and responses
- **React DevTools**: Inspect component state and props
- **Performance**: Check for slow renders

## Next Steps

1. **Test with Real Backend**: Connect to actual backend API
2. **Add Authentication**: Implement user login/signup
3. **Enhance Charts**: Add more chart types and interactions
4. **Add Tests**: Write unit and integration tests
5. **Optimize Performance**: Implement code splitting and lazy loading
6. **Add Dark Mode**: Implement theme switching
7. **Improve Mobile UX**: Enhance mobile experience
8. **Add Documentation**: Document all components and APIs

## Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Recharts Docs](https://recharts.org)
- [React Router Docs](https://reactrouter.com)
- [Axios Docs](https://axios-http.com)

## Need Help?

Check the main `FRONTEND_SETUP.md` for complete documentation of the frontend architecture and implementation details.
