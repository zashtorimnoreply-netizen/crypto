import { useState, useCallback } from 'react';
import { FiKey, FiEye, FiEyeOff, FiExternalLink, FiInfo, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
import useImport from '../../hooks/useImport';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Loading from '../UI/Loading';

const BYBIT_API_DOCS_URL = 'https://bybit-exchange.com/docsV3/user/api-connectors';

const BybitSync = ({ portfolioId, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  const { syncBybit, loading, progress, clearError } = useImport(portfolioId);

  const validateCredentials = useCallback(() => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return false;
    }
    if (apiKey.length < 20 || apiKey.length > 50) {
      setError('Invalid API Key format (20-50 characters expected)');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(apiKey)) {
      setError('API Key should be alphanumeric');
      return false;
    }
    if (!apiSecret.trim()) {
      setError('API Secret is required');
      return false;
    }
    if (apiSecret.length < 50) {
      setError('Invalid API Secret format (50+ characters expected)');
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(apiSecret)) {
      setError('API Secret should be alphanumeric');
      return false;
    }
    return true;
  }, [apiKey, apiSecret]);

  const handleSync = async () => {
    clearError();
    setErrorDetails(null);
    setSyncResult(null);

    if (!validateCredentials()) {
      return;
    }

    // Check protocol warning for HTTPS
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError('Warning: Using HTTP. API credentials should only be used over HTTPS.');
    }

    const result = await syncBybit(apiKey, apiSecret);
    
    if (result) {
      setSyncResult(result);
      
      if (result.success) {
        // Clear credentials after successful sync for security
        setApiKey('');
        setApiSecret('');
        
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        // Store error details for display
        setErrorDetails(result.errors || []);
      }
    }
  };

  const handleClearCredentials = () => {
    setApiKey('');
    setApiSecret('');
    setError(null);
    setSyncResult(null);
    setErrorDetails(null);
    clearError();
  };

  const isFormValid = apiKey.trim() && apiSecret.trim() && !loading;

  const getStatusMessage = () => {
    if (loading) {
      if (progress < 30) return 'Fetching trades from Bybit...';
      if (progress < 70) return 'Processing trades...';
      return 'Finalizing...';
    }
    return null;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Card className="w-full" padding={false}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sync Bybit</h3>
          <a
            href={BYBIT_API_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            How to get your Bybit API credentials?
            <FiExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-4">
          {/* API Key Field */}
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiKey className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                placeholder="Paste your Bybit API key here"
                className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-gray-400 text-gray-900"
                disabled={loading}
                aria-describedby="api-key-hint"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            {apiKey && (
              <button
                onClick={handleClearCredentials}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <FiInfo className="w-3 h-3" />
                Clear API credentials
              </button>
            )}
          </div>

          {/* API Secret Field */}
          <div>
            <label htmlFor="api-secret" className="block text-sm font-medium text-gray-700 mb-2">
              API Secret
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiKey className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="api-secret"
                type="password"
                value={apiSecret}
                onChange={(e) => {
                  setApiSecret(e.target.value);
                  setError(null);
                }}
                placeholder="Paste your Bybit API secret here"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-gray-400 text-gray-900"
                disabled={loading}
                aria-describedby="api-secret-hint"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 flex items-start gap-2">
              <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                API credentials are only used for this sync and not stored. 
                Ensure you're using HTTPS (or localhost for testing).
              </span>
            </p>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span className="flex items-center gap-2">
                  <FiLoader className="w-3 h-3 animate-spin" />
                  {getStatusMessage()}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
            </div>
          )}

          {/* Validation Error */}
          {error && !syncResult && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {syncResult?.success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FiCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Synced {syncResult.fetched} trades. {syncResult.imported} new, {syncResult.skipped} duplicates skipped
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Last sync: {formatTimestamp(syncResult.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Result */}
          {syncResult && !syncResult.success && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    {syncResult.error || 'Sync failed. Please check your credentials and try again.'}
                  </p>
                  {syncResult.fetched > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      {syncResult.fetched} trades fetched, {syncResult.imported} imported, {syncResult.skipped} failed
                    </p>
                  )}
                  
                  {/* Error type specific messages */}
                  {syncResult.errorType === 'rate_limited' && (
                    <p className="text-xs text-red-600 mt-1">
                      Bybit API is temporarily unavailable. Please try again in 1 minute.
                    </p>
                  )}
                  {syncResult.errorType === 'network' && (
                    <p className="text-xs text-red-600 mt-1">
                      Check your internet connection and try again.
                    </p>
                  )}

                  {errorDetails && errorDetails.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-red-700">Error Details:</p>
                      <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                        {errorDetails.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err.message || err.error || 'Unknown error'}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Retry button */}
                  <button
                    onClick={handleSync}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync Button */}
          {!syncResult?.success && (
            <Button
              onClick={handleSync}
              disabled={!isFormValid}
              variant="primary"
              className="w-full"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Syncing...
                </span>
              ) : (
                'Sync from Bybit'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BybitSync;
