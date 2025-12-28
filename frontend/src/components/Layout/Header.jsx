import { FiRefreshCw } from 'react-icons/fi';
import { formatRelativeTime } from '../../utils/formatters';
import Button from '../UI/Button';

const Header = ({ portfolioName, lastUpdated, onRefresh, loading = false }) => {
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
