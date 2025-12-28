import { FiAlertCircle } from 'react-icons/fi';
import Button from './Button';

const Error = ({ 
  message = 'An error occurred', 
  onRetry, 
  fullScreen = false,
  className = '' 
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <FiAlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
        <p className="text-gray-600">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="primary" size="sm">
          Try Again
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="py-8">{content}</div>;
};

export default Error;
