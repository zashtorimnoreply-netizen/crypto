import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiCopy, FiCheck, FiExternalLink, FiAlertCircle } from 'react-icons/fi';
import Card from './Card';

const ShareDialog = ({ isOpen, onClose, portfolioId, portfolioName }) => {
  const [reportUrl, setReportUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Initialize title with portfolio name when dialog opens
  useEffect(() => {
    if (isOpen && portfolioName) {
      setTitle(`${portfolioName} - ${new Date().toLocaleDateString()}`);
    }
  }, [isOpen, portfolioName]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCopied(false);
      setReportUrl('');
      setTitle(`${portfolioName} - ${new Date().toLocaleDateString()}`);
      setDescription('');
    }
  }, [isOpen, portfolioName]);

  const generateReport = useCallback(async () => {
    if (!portfolioId) {
      setError('Portfolio ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      // Use api service when available, otherwise use fetch
      let response;
      if (window.api) {
        response = await window.api.post('/reports', {
          portfolioId,
          title,
          description,
        });
      } else {
        // Fallback to fetch
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        response = await fetch(`${baseUrl}/api/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            portfolioId,
            title,
            description,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create report');
        }
        
        response = { data: await response.json() };
      }

      if (response.data?.success) {
        setReportUrl(response.data.report.publicUrl);
      } else {
        setError(response.data?.error || 'Failed to create report');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while generating the report');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, title, description]);

  const copyToClipboard = useCallback(async () => {
    if (!reportUrl) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        // Modern approach
        await navigator.clipboard.writeText(reportUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = reportUrl;
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
          } catch {
          setError('Unable to copy to clipboard');
          textArea.remove();
        }
      }
    } catch (err) {
      setError('Unable to copy to clipboard');
    }
  }, [reportUrl]);

  const viewReport = useCallback(() => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  }, [reportUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-800 bg-opacity-50"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal container */}
        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 id="share-dialog-title" className="text-lg font-medium leading-6 text-gray-900">
                Share Your Portfolio
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate a public link to share your portfolio snapshot
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <FiAlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Content */}
          {!reportUrl ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="report-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Report Title
                </label>
                <input
                  id="report-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter report title"
                />
              </div>

              <div>
                <label htmlFor="report-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a description for this report"
                />
              </div>

              <button
                onClick={generateReport}
                disabled={loading || !title.trim()}
                className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? (
                  <>
                    Generating Report...
                    <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </>
                ) : (
                  'Generate Public Link'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="public-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Public Link
                </label>
                <div className="flex space-x-2">
                  <input
                    id="public-url"
                    type="text"
                    value={reportUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      copied
                        ? 'border-green-300 text-green-700 bg-green-50 focus:ring-green-500'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500'
                    }`}
                  >
                    {copied ? (
                      <>
                        <FiCheck className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <FiCopy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <FiCheck className="inline w-4 h-4 mr-1" />
                  Report created successfully! Your link is ready to share.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={viewReport}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FiExternalLink className="w-4 h-4 mr-2" />
                  View Report
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;