import { useState, useCallback } from 'react';
import { uploadCSVTrades, syncBybitTrades } from '../services/portfolioService';

export const useImport = (portfolioId) => {
  const [csvStatus, setCsvStatus] = useState(null);
  const [bybitStatus, setBybitStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadCSV = useCallback(async (file) => {
    if (!file || !portfolioId) {
      setError('File and portfolio are required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setCsvStatus('uploading');

      const response = await uploadCSVTrades(portfolioId, file);
      
      const result = {
        success: true,
        imported: response.data?.imported || 0,
        total: response.data?.total || 0,
        errors: response.data?.errors || [],
        skipped: response.data?.skipped || 0,
        timestamp: new Date().toISOString(),
      };

      setProgress(100);
      setCsvStatus('success');
      setCsvStatus(null);
      
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to upload CSV';
      const errorDetails = err.response?.data?.details || [];
      
      setError(errorMessage);
      setCsvStatus('error');
      
      return {
        success: false,
        error: errorMessage,
        errors: errorDetails,
        imported: err.response?.data?.imported || 0,
        total: err.response?.data?.total || 0,
        timestamp: new Date().toISOString(),
      };
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [portfolioId]);

  const syncBybit = useCallback(async (apiKey, apiSecret) => {
    if (!apiKey || !apiSecret || !portfolioId) {
      setError('API credentials and portfolio are required');
      return null;
    }

    let progressInterval = null;

    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      setBybitStatus('syncing');

      // Simulate progress for UX (real progress requires server streaming)
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await syncBybitTrades(portfolioId, apiKey, apiSecret);
      
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(100);

      const result = {
        success: true,
        fetched: response.data?.fetched || 0,
        imported: response.data?.imported || 0,
        skipped: response.data?.skipped || 0,
        errors: response.data?.errors || [],
        timestamp: new Date().toISOString(),
      };

      setBybitStatus('success');
      setBybitStatus(null);
      
      return result;
    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setLoading(false);
      setProgress(0);

      const errorMessage = err.response?.data?.error || 'Failed to sync Bybit trades';
      const errorDetails = err.response?.data?.details || [];
      const statusCode = err.response?.status;

      let errorType = 'error';
      if (statusCode === 401) {
        setError('Authentication failed. Check API key and secret');
      } else if (statusCode === 429) {
        setError('Bybit API temporarily unavailable. Try again in 1 minute');
        errorType = 'rate_limited';
      } else if (statusCode === 0 || !err.response) {
        setError('Connection failed. Check internet and try again');
        errorType = 'network';
      } else {
        setError(errorMessage);
      }

      setBybitStatus(errorType);

      return {
        success: false,
        error: errorMessage,
        errorType,
        errors: errorDetails,
        fetched: err.response?.data?.fetched || 0,
        imported: err.response?.data?.imported || 0,
        skipped: err.response?.data?.skipped || 0,
        timestamp: new Date().toISOString(),
      };
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearStatus = useCallback((type) => {
    if (type === 'csv') {
      setCsvStatus(null);
    } else if (type === 'bybit') {
      setBybitStatus(null);
    }
  }, []);

  return {
    csvStatus,
    bybitStatus,
    loading,
    error,
    progress,
    uploadCSV,
    syncBybit,
    clearError,
    clearStatus,
  };
};

export default useImport;
