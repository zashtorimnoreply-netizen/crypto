import { NavLink } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import { formatRelativeTime } from '../../utils/formatters';
import Button from '../UI/Button';
import NavMenu from '../Navigation/NavMenu';

const Header = ({ portfolioName, lastUpdated, onRefresh, loading = false }) => {
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/comparison', label: 'Compare' },
    { path: '/simulator', label: 'Simulator' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {portfolioName || 'Crypto Portfolio'}
          </h1>
          {lastUpdated && (
            <p className="text-sm text-gray-600 mt-1">
              Last updated: {formatRelativeTime(lastUpdated)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile navigation */}
          <NavMenu />

          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
