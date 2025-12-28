import { FiCheck, FiX, FiAlertTriangle, FiLoader, FiRefreshCw, FiRotateCcw, FiXCircle } from 'react-icons/fi';
import Button from '../UI/Button';
import { formatRelativeTime } from '../../utils/formatters';

const ImportStatus = ({ 
  status = 'success', 
  message, 
  count,
  details,
  timestamp,
  onRefresh,
  onRetry,
  onDismiss,
  onImportAgain,
  className = ''
}) => {
  const statusConfig = {
    success: {
      icon: FiCheck,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
      iconBgColor: 'bg-green-100',
    },
    error: {
      icon: FiX,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-800',
      iconBgColor: 'bg-red-100',
    },
    warning: {
      icon: FiAlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-800',
      iconBgColor: 'bg-yellow-100',
    },
    loading: {
      icon: FiLoader,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-800',
      iconBgColor: 'bg-blue-100',
    },
  };

  const config = statusConfig[status] || statusConfig.loading;
  const Icon = config.icon;

  const hasActions = onRefresh || onRetry || onDismiss || onImportAgain;

  const renderDetails = () => {
    if (!details) return null;

    if (typeof details === 'object') {
      return (
        <div className="mt-3 space-y-1">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 capitalize">{key}:</span>
              <span className={`font-medium ${config.textColor}`}>{value}</span>
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(details)) {
      return (
        <div className="mt-3 space-y-1">
          {details.map((item, idx) => (
            <div key={idx} className="text-xs text-gray-600">
              {typeof item === 'object' ? JSON.stringify(item) : item}
            </div>
          ))}
        </div>
      );
    }

    return <p className="mt-2 text-xs text-gray-600">{details}</p>;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      return formatRelativeTime(new Date(ts));
    } catch {
      return ts;
    }
  };

  return (
    <div className={`p-4 ${config.bgColor} border ${config.borderColor} rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.iconBgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${config.iconColor} ${status === 'loading' ? 'animate-spin' : ''}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className={`text-sm font-medium ${config.textColor}`}>
                {message}
              </p>
              
              {count !== undefined && count !== null && (
                <p className={`text-xs ${config.textColor} mt-1 opacity-80`}>
                  {count}
                </p>
              )}

              {renderDetails()}

              {timestamp && (
                <p className={`text-xs ${config.textColor} mt-2 opacity-70`}>
                  {formatTimestamp(timestamp)}
                </p>
              )}
            </div>

            {/* Actions */}
            {hasActions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {onRefresh && (
                  <Button
                    onClick={onRefresh}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label="Refresh portfolio"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5 mr-1" />
                    Refresh
                  </Button>
                )}
                {onImportAgain && (
                  <Button
                    onClick={onImportAgain}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label="Import again"
                  >
                    <FiRotateCcw className="w-3.5 h-3.5 mr-1" />
                    Import Again
                  </Button>
                )}
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    aria-label="Retry"
                  >
                    <FiRotateCcw className="w-3.5 h-3.5 mr-1" />
                    Retry
                  </Button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className={`p-1 rounded-full hover:bg-black/5 ${config.textColor}`}
                    aria-label="Dismiss"
                  >
                    <FiXCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportStatus;
