import { useState, useRef } from 'react';
import { FiUpload, FiFile } from 'react-icons/fi';
import { uploadCSVTrades } from '../../services/portfolioService';
import { isValidFileType, isValidFileSize } from '../../utils/validators';
import Card from '../UI/Card';
import Button from '../UI/Button';

const CSVUpload = ({ portfolioId, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!isValidFileType(selectedFile, ['.csv'])) {
      setError('Please select a CSV file');
      return;
    }

    if (!isValidFileSize(selectedFile, 5)) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await uploadCSVTrades(portfolioId, file);
      setSuccess(`Successfully imported ${response.data?.imported || 0} trades`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload CSV');
      console.error('CSV upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Import CSV" className="w-full">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
          >
            <FiUpload className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              {file ? file.name : 'Click to select CSV file'}
            </span>
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <FiFile className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-900 flex-1">{file.name}</span>
            <span className="text-xs text-blue-600">
              {(file.size / 1024).toFixed(2)} KB
            </span>
          </div>
        )}

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
          onClick={handleUpload}
          disabled={!file || loading}
          variant="primary"
          className="w-full"
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </Button>
      </div>
    </Card>
  );
};

export default CSVUpload;
