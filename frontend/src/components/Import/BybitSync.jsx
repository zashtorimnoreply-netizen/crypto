import { useState } from 'react';
import { FiKey, FiCalendar } from 'react-icons/fi';
import { syncBybitTrades } from '../../services/portfolioService';
import { isValidApiKey } from '../../utils/validators';
import Card from '../UI/Card';
import Button from '../UI/Button';

const BybitSync = ({ portfolioId, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [startTime, setStartTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSync = async () => {
    setError(null);
    setSuccess(null);

    if (!isValidApiKey(apiKey)) {
      setError('Please enter a valid API key');
      return;
    }

    if (!isValidApiKey(apiSecret)) {
      setError('Please enter a valid API secret');
      return;
    }

    if (!portfolioId) {
      setError('No portfolio selected');
      return;
    }

    try {
      setLoading(true);
      const response = await syncBybitTrades(portfolioId, apiKey, apiSecret, startTime);
      setSuccess(`Successfully synced ${response.data?.imported || 0} trades`);
      
      // Clear sensitive data
      setApiKey('');
      setApiSecret('');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sync Bybit trades');
      console.error('Bybit sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Sync Bybit Trades" className="w-full">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="relative">
            <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Bybit API key"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Secret
          </label>
          <div className="relative">
            <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your Bybit API secret"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date (Optional)
          </label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <Button
          onClick={handleSync}
          disabled={!apiKey || !apiSecret || loading}
          variant="primary"
          className="w-full"
        >
          {loading ? 'Syncing...' : 'Sync Trades'}
        </Button>

        <p className="text-xs text-gray-500">
          Note: API credentials are never stored and only used for this sync operation.
        </p>
      </div>
    </Card>
  );
};

export default BybitSync;
