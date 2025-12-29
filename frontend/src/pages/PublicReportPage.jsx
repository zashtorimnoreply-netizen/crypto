import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/UI/Card';
import ErrorBoundary from '../components/ErrorBoundary';
import ExportButton from '../components/UI/ExportButton';
import { FiExternalLink, FiEye, FiCalendar, FiAlertCircle, FiLoader } from 'react-icons/fi';

const PublicReportPage = () => {
  const { reportUuid } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/reports/public/${reportUuid}`);
        
        if (response.data.success) {
          setReport(response.data.report);
        } else {
          setError(response.data.error || 'Failed to load report');
        }
      } catch (err) {
        const message = err.response?.data?.error || 
                       (err.response?.status === 404 ? 'Report not found' : 
                        err.response?.status === 410 ? 'This report has expired' :
                        'An error occurred while loading the report');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportUuid]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center py-8">
            <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Report Not Available</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              Go Back to Dashboard
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const { portfolioName, createdAt, snapshot, metadata } = report;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={reportRef}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {portfolioName}
                </h1>
                <p className="text-gray-600">
                  Public portfolio snapshot created on {formatDate(createdAt)}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <FiEye className="w-4 h-4 mr-2" />
                  Viewed {metadata.viewCount} {metadata.viewCount === 1 ? 'time' : 'times'}
                </span>
                <ExportButton 
                  elementRef={reportRef} 
                  filename={`${portfolioName.replace(/\s+/g, '_')}_snapshot`}
                  label="Download Report"
                />
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Value</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(snapshot.metrics.total_value)}
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Cost Basis</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(snapshot.metrics.cost_basis)}
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">PnL</h3>
              <p className={`text-2xl font-bold ${
                snapshot.metrics.pnl.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(snapshot.metrics.pnl.value)}
              </p>
              <p className={`text-sm ${
                snapshot.metrics.pnl.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {snapshot.metrics.pnl.percent >= 0 ? '+' : ''}{formatNumber(snapshot.metrics.pnl.percent)}%
              </p>
            </Card>

            <Card>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Positions</h3>
              <p className="text-2xl font-bold text-gray-900">
                {snapshot.stats.total_positions}
              </p>
            </Card>
          </div>

          {/* Stats */}
          <Card className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-xl font-semibold text-gray-900">{snapshot.stats.total_trades}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Winning Positions</p>
                <p className="text-xl font-semibold text-green-600">{snapshot.stats.winning_positions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Losing Positions</p>
                <p className="text-xl font-semibold text-red-600">{snapshot.stats.losing_positions}</p>
              </div>
            </div>
          </Card>

          {/* Asset Allocation */}
          <Card className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation</h2>
            <div className="divide-y divide-gray-200">
              {snapshot.allocation.length > 0 ? (
                snapshot.allocation.map((item) => (
                  <div key={item.symbol} className="py-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{item.symbol}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({item.holdings} units)
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(item.value)}</p>
                      <p className="text-sm text-gray-500">{item.percent}%</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 py-4">No active positions</p>
              )}
            </div>
          </Card>

          {/* Positions */}
          <Card className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Positions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Holdings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PnL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trades
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {snapshot.positions.map((position) => (
                    <tr key={position.symbol}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.holdings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.avg_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(position.current_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(position.position_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={position.pnl.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {position.pnl.value >= 0 ? '+' : ''}{formatCurrency(position.pnl.value)}<br />
                          ({position.pnl.percent >= 0 ? '+' : ''}{formatNumber(position.pnl.percent)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.trades_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Watermark */}
          <div className="text-center text-sm text-gray-500 mt-8">
            <FiCalendar className="inline w-4 h-4 mr-1" />
            Public portfolio snapshot shared on {formatDate(createdAt)}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PublicReportPage;