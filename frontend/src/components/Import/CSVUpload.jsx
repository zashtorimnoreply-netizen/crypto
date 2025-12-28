import { useState, useRef, useCallback } from 'react';
import { FiUpload, FiFile, FiX, FiAlertCircle, FiCheck, FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';
import useImport from '../../hooks/useImport';
import { getCsvTemplate } from '../../services/portfolioService';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Loading from '../UI/Loading';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const CSVUpload = ({ portfolioId, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  
  const { uploadCSV, loading, error, progress, clearError } = useImport(portfolioId);
  const [uploadResult, setUploadResult] = useState(null);

  const validateFile = useCallback((file) => {
    setFileError(null);
    
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { valid: false, error: 'Invalid file type (CSV only)' };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File too large (max ${MAX_FILE_SIZE_MB}MB)` };
    }

    return { valid: true };
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
        setFileError(null);
        clearError();
        setUploadResult(null);
      } else {
        setFileError(validation.error);
        setSelectedFile(null);
      }
    }
  }, [validateFile, clearError]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      
      if (validation.valid) {
        setSelectedFile(file);
        setFileError(null);
        clearError();
        setUploadResult(null);
      } else {
        setFileError(validation.error);
        setSelectedFile(null);
      }
    }
  }, [validateFile, clearError]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await uploadCSV(selectedFile);
    if (result) {
      setUploadResult(result);
      if (result.success && onSuccess) {
        onSuccess(result);
      }
    }
  };

  const handleRetry = async () => {
    setUploadResult(null);
    clearError();
    if (selectedFile) {
      await handleUpload();
    }
  };

  const handleDownloadErrorReport = useCallback(() => {
    if (!uploadResult?.errors?.length) return;

    const headers = ['Row Number', 'Error', 'Suggested Fix'];
    const rows = uploadResult.errors.map((err) => [
      err.row || err.line || 'N/A',
      err.message || err.error || 'Unknown error',
      err.suggestion || err.fix || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'import_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [uploadResult]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusMessage = () => {
    if (loading) {
      if (progress < 30) return 'Uploading...';
      if (progress < 70) return 'Processing...';
      return 'Finalizing...';
    }
    return null;
  };

  return (
    <Card className="w-full" padding={false}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV</h3>
        
        {/* Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg transition-all duration-200 ease-in-out
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : selectedFile 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
          style={{ minHeight: '200px' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          role="region"
          aria-label="File upload drop zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Choose CSV file"
            disabled={loading}
          />

          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {loading ? (
              <Loading size="lg" text={getStatusMessage()} />
            ) : selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <FiCheck className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(selectedFile.size)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRemoveFile();
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  aria-label="Remove file"
                >
                  <FiX className="w-4 h-4" />
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FiUpload className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Drag CSV here or click to select
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum file size: {MAX_FILE_SIZE_MB}MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{getStatusMessage()}</span>
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

        {/* File Error */}
        {fileError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{fileError}</p>
          </div>
        )}

        {/* Upload Error */}
        {error && !fileError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {uploadResult?.success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  Imported {uploadResult.imported}/{uploadResult.total} trades successfully
                </p>
                {uploadResult.skipped > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {uploadResult.skipped} duplicates skipped
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Partial Success with Errors */}
        {uploadResult && !uploadResult.success && uploadResult.errors?.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Imported {uploadResult.imported}/{uploadResult.total} trades. {uploadResult.errors.length} rows with errors.
                </p>
                
                {/* Expandable Error Details */}
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="mt-2 text-sm text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                >
                  {showErrorDetails ? (
                    <>
                      <FiChevronUp className="w-4 h-4" />
                      Hide error details
                    </>
                  ) : (
                    <>
                      <FiChevronDown className="w-4 h-4" />
                      Show error details
                    </>
                  )}
                </button>

                {showErrorDetails && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-yellow-100">
                        <tr>
                          <th className="px-3 py-2 font-medium text-yellow-800">Row</th>
                          <th className="px-3 py-2 font-medium text-yellow-800">Error</th>
                          <th className="px-3 py-2 font-medium text-yellow-800">Suggested Fix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {uploadResult.errors.slice(0, 10).map((err, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-yellow-700">{err.row || err.line || idx + 1}</td>
                            <td className="px-3 py-2 text-yellow-700">{err.message || err.error || 'Unknown error'}</td>
                            <td className="px-3 py-2 text-yellow-600">{err.suggestion || err.fix || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadResult.errors.length > 10 && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Showing 10 of {uploadResult.errors.length} errors. Download full report below.
                      </p>
                    )}
                  </div>
                )}

                {/* Download Error Report */}
                <button
                  onClick={handleDownloadErrorReport}
                  className="mt-3 text-sm text-yellow-700 hover:text-yellow-800 flex items-center gap-1"
                >
                  <FiDownload className="w-4 h-4" />
                  Download error report
                </button>

                {/* Retry Button */}
                <button
                  onClick={handleRetry}
                  className="mt-3 ml-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Retry import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {!loading && selectedFile && !uploadResult?.success && (
          <div className="mt-6">
            <Button
              onClick={handleUpload}
              variant="primary"
              className="w-full"
              size="lg"
            >
              Upload CSV
            </Button>
          </div>
        )}

        {/* Template Download Link */}
        {!loading && !selectedFile && (
          <div className="mt-4 text-center">
            <button
              onClick={async () => {
                try {
                  const response = await getCsvTemplate();
                  const blob = new Blob([response.data], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', 'trade_import_template.csv');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Failed to download template:', err);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
            >
              <FiDownload className="w-4 h-4" />
              Download CSV template
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CSVUpload;
