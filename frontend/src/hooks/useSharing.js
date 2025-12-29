import { useState, useCallback } from 'react';
import api from '../services/api';

/**
 * useSharing - Hook for managing portfolio report sharing
 * 
 * Interface:
 * {
 *   reportUrl,
 *   loading,
 *   error,
 *   generateReport,
 *   copyToClipboard,
 *   reports,
 *   loadReports,
 * }
 * 
 * Usage:
 * const {
 *   reportUrl,
 *   loading,
 *   error,
 *   generateReport,
 *   copyToClipboard,
 *   reports,
 *   loadReports,
 * } = useSharing(portfolioId);
 */
const useSharing = (portfolioId) => {
  const [reportUrl, setReportUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [copied, setCopied] = useState(false);

  /**
   * Generate a new public report
   * @param {Object} options - { title, description, expiresAt }
   * @returns {Promise<{publicUrl: string}>} - Report URL
   */
  const generateReport = useCallback(async (options = {}) => {
    if (!portfolioId) {
      const error = new Error('Portfolio ID is required');
      setError(error.message);
      throw error;
    }

    setLoading(true);
    setError(null);
    setCopied(false);
    setReportUrl('');

    try {
      const response = await api.post('/reports', {
        portfolioId,
        title: options.title,
        description: options.description,
        expiresAt: options.expiresAt,
      });

      if (response.data?.success) {
        const { publicUrl } = response.data.report;
        setReportUrl(publicUrl);
        return { publicUrl };
      } else {
        const errorMessage = response.data?.error || 'Failed to create report';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred while generating the report';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  /**
   * Copy text to clipboard with fallback support
   * @param {string} text - Text to copy
   * @returns {Promise<void>}
   */
  const copyToClipboard = useCallback(async (text) => {
    if (!text) {
      const error = new Error('No text provided to copy');
      setError(error.message);
      throw error;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Modern secure approach
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
          textArea.remove();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch (copyError) {
          textArea.remove();
          throw copyError;
        }
      }
    } catch {
      const errorMessage = 'Unable to copy to clipboard';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Load all reports for a portfolio
   * @returns {Promise<Array>} - List of reports
   */
  const loadReports = useCallback(async () => {
    if (!portfolioId) {
      const error = new Error('Portfolio ID is required');
      setReportsError(error.message);
      throw error;
    }

    setReportsLoading(true);
    setReportsError(null);

    try {
      const response = await api.get(`/portfolios/${portfolioId}/reports`);

      if (response.data?.success) {
        setReports(response.data.reports);
        return response.data.reports;
      } else {
        const errorMessage = response.data?.error || 'Failed to load reports';
        setReportsError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred while loading reports';
      setReportsError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setReportsLoading(false);
    }
  }, [portfolioId]);

  /**
   * Clear all states
   */
  const reset = useCallback(() => {
    setReportUrl('');
    setLoading(false);
    setError(null);
    setCopied(false);
    setReports([]);
    setReportsLoading(false);
    setReportsError(null);
  }, []);

  return {
    // Current report generation state
    reportUrl,
    loading,
    error,
    
    // Report list state
    reports,
    reportsLoading,
    reportsError,
    
    // Copy state
    copied,
    
    // Actions
    generateReport,
    copyToClipboard,
    loadReports,
    reset,
  };
};

export default useSharing;