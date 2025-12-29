import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { downloadChartAsPNG } from '../../utils/exportUtils';
import { getTooltip } from '../../utils/tooltips';
import Tooltip from './Tooltip';

const ExportButton = ({ 
  elementRef, 
  filename = 'portfolio', 
  label = 'Download PNG',
  showTooltip = true,
  className = '',
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!elementRef?.current) {
        throw new Error('Chart not found. Please try again.');
      }

      await downloadChartAsPNG(elementRef.current, filename);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
      console.error('Export error:', err);
      
      // Call error callback if provided
      if (onError) {
        onError(err);
      }
      
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${className}`}
      title={showTooltip ? getTooltip('exportPNG') : label}
    >
      <FiDownload size={16} />
      <span className="text-sm font-medium">
        {loading ? 'Exporting...' : label}
      </span>
    </button>
  );

  // Show error message below button if error occurred
  return (
    <div className="inline-flex flex-col">
      {showTooltip ? (
        <Tooltip content={getTooltip('exportPNG')} position="top">
          {button}
        </Tooltip>
      ) : button}
      
      {error && (
        <div className="text-xs text-red-600 mt-1 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
