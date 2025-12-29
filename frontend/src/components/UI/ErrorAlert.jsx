import { FiAlertCircle, FiX } from 'react-icons/fi';

const ErrorAlert = ({ 
  error, 
  onDismiss, 
  details = null, 
  className = '',
  showRetry = false,
  onRetry
}) => {
  if (!error) return null;

  // Extract error information
  const errorCode = error?.code || 'ERROR';
  const errorMessage = error?.message || error;
  const errorDetails = details || error?.details || [];

  // Determine error type styling
  const isValidationError = errorCode === 'VALIDATION_ERROR';
  const isNetworkError = errorCode === 'NETWORK_ERROR' || errorCode === 'API_ERROR';

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">
            {isValidationError && 'Please check your input'}
            {isNetworkError && 'Connection error'}
            {!isValidationError && !isNetworkError && 'Something went wrong'}
          </h3>
          
          <p className="text-red-700 text-sm mb-2">
            {typeof errorMessage === 'string' ? errorMessage : 'An unexpected error occurred'}
          </p>
          
          {Array.isArray(errorDetails) && errorDetails.length > 0 && (
            <ul className="text-red-600 text-sm list-disc list-inside mb-2 space-y-1">
              {errorDetails.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3 mt-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-red-700 hover:text-red-900 font-medium underline"
              >
                Try again
              </button>
            )}
            
            <p className="text-red-600 text-xs">
              {isNetworkError 
                ? 'Please check your connection and try again.' 
                : 'Need help? Contact support.'}
            </p>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-900 transition-colors flex-shrink-0"
            title="Dismiss"
            aria-label="Dismiss error"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
