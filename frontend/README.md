# Crypto Portfolio Frontend

React-based frontend for the Crypto Portfolio visualizer.

## Tech Stack

- **React 18+** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **React Router** - Navigation
- **React Icons** - Icon library
- **date-fns** - Date formatting

## Project Structure

```
src/
├── components/
│   ├── Layout/          # Layout components (Header, LeftPanel, RightPanel)
│   ├── Charts/          # Chart components (EquityCurve, Allocation, Comparison)
│   ├── Metrics/         # Metrics display components
│   ├── Import/          # CSV and Bybit import components
│   ├── UI/              # Reusable UI components (Button, Card, Loading, etc.)
│   └── Navigation/      # Navigation components
├── pages/               # Page components (Dashboard, Portfolio, Settings)
├── services/            # API service layer
├── hooks/               # Custom React hooks
├── context/             # React Context for global state
├── utils/               # Utility functions (formatters, validators, constants)
└── styles/              # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running (see main project README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
VITE_API_URL=http://localhost:3000/api
VITE_REFRESH_INTERVAL=300000
VITE_ENV=development
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Features

- ✅ Two-panel responsive layout
- ✅ Portfolio equity curve visualization
- ✅ Portfolio allocation pie chart
- ✅ CSV trade import
- ✅ Bybit API integration
- ✅ Real-time portfolio metrics
- ✅ Error boundary for graceful error handling
- ✅ Loading states and skeletons
- ✅ Global state management with Context API

## API Integration

The frontend communicates with the backend API at the URL specified in `VITE_API_URL`.

Key endpoints:
- `GET /portfolios` - List all portfolios
- `GET /portfolios/:id` - Get portfolio details
- `GET /portfolios/:id/equity-curve` - Get equity curve data
- `POST /csv/upload` - Upload CSV trades
- `POST /bybit/sync` - Sync Bybit trades

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: http://localhost:3000/api)
- `VITE_REFRESH_INTERVAL` - Auto-refresh interval in ms (default: 300000)
- `VITE_ENV` - Environment (development/production)

## Development

### Code Style

- Use functional components with hooks
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Keep components small and focused
- Use custom hooks for reusable logic

### Adding New Components

1. Create component file in appropriate directory
2. Export component as default
3. Import and use in parent component
4. Add any necessary styles using Tailwind classes

### Adding New API Endpoints

1. Add service function in `src/services/`
2. Create custom hook if needed in `src/hooks/`
3. Use in components

## Troubleshooting

### API Connection Issues

- Verify backend is running on correct port
- Check `VITE_API_URL` in `.env.local`
- Check browser console for CORS errors

### Build Errors

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## License

MIT
