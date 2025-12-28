import { useMemo } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import { formatCurrency } from '../../utils/formatters';
import TrafficLight from '../UI/TrafficLight';

const ComparisonMetricsTable = ({ data, loading, error }) => {
  const metrics = useMemo(() => {
    if (!data) return [];

    const rows = [
      {
        key: 'totalValue',
        label: 'Total Value',
        format: (val) => formatCurrency(val),
        isHigherBetter: true,
        inverseRisk: false,
      },
      {
        key: 'pnl',
        label: 'PnL',
        format: (val) => {
          if (typeof val === 'object' && val !== null) {
            const sign = val.value >= 0 ? '+' : '';
            return `${sign}${formatCurrency(val.value)} (${val.percent >= 0 ? '+' : ''}${val.percent.toFixed(2)}%)`;
          }
          return formatCurrency(val);
        },
        isHigherBetter: true,
        inverseRisk: false,
      },
      {
        key: 'volatility',
        label: 'Volatility',
        format: (val) => `${val?.toFixed(2) || 0}%`,
        isHigherBetter: false,
        inverseRisk: true,
        trafficLight: true,
      },
      {
        key: 'maxDrawdown',
        label: 'Max Drawdown',
        format: (val) => `${val?.toFixed(2) || 0}%`,
        isHigherBetter: true,
        inverseRisk: true,
        trafficLight: true,
      },
      {
        key: 'cagr',
        label: 'CAGR',
        format: (val) => `${val?.toFixed(2) || 0}%`,
        isHigherBetter: true,
        inverseRisk: false,
      },
      {
        key: 'ytdReturn',
        label: 'YTD Return',
        format: (val) => `${val >= 0 ? '+' : ''}${val?.toFixed(2) || 0}%`,
        isHigherBetter: true,
        inverseRisk: false,
      },
    ];

    return rows;
  }, [data]);

  const getBestPerformer = useMemo(() => {
    if (!data) return {};

    const result = {};
    
    metrics.forEach(metric => {
      const { key, inverseRisk } = metric;
      const values = data[key];
      if (!values) return;

      const entries = Object.entries(values).filter(([, val]) => val !== null && val !== undefined);
      if (entries.length === 0) return;

      const bestEntry = entries.reduce((best, [name, val]) => {
        if (!best) return [name, val];
        const bestValue = inverseRisk ? -best[1] : best[1];
        const currentValue = inverseRisk ? -val : val;
        return currentValue > bestValue ? [name, val] : best;
      });

      result[key] = bestEntry?.[0];
    });

    return result;
  }, [data, metrics]);

  const getTrafficLightColor = (key, value) => {
    if (!value && value !== 0) return 'gray';

    switch (key) {
      case 'volatility':
        if (value < 30) return 'green';
        if (value < 50) return 'yellow';
        return 'red';
      case 'maxDrawdown':
        if (value >= -20) return 'green';
        if (value >= -40) return 'yellow';
        return 'red';
      default:
        return 'gray';
    }
  };

  const getPnLColor = (value) => {
    if (!value && value !== 0) return 'text-gray-600';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const columns = [
    { key: 'label', label: 'Metric' },
    { key: 'portfolio', label: 'Your Portfolio' },
    { key: 'btc100', label: 'BTC 100%' },
    { key: 'btcEth70_30', label: 'BTC/ETH 70/30' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">No comparison data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Performance Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-gray-700 ${
                    col.key !== 'label' ? 'text-right' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {metrics.map((metric) => {
              const isBestPortfolio = getBestPerformer[metric.key] === 'portfolio';
              const isBestBtc100 = getBestPerformer[metric.key] === 'btc100';
              const isBestBtcEth = getBestPerformer[metric.key] === 'btcEth70_30';

              const portfolioValue = data[metric.key]?.portfolio;
              const btc100Value = data[metric.key]?.btc100;
              const btcEthValue = data[metric.key]?.btcEth70_30;

              return (
                <tr key={metric.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {metric.label}
                    {metric.trafficLight && (
                      <div className="mt-1 flex items-center gap-1">
                        <TrafficLight 
                          color={getTrafficLightColor(metric.key, portfolioValue)} 
                          size="sm" 
                        />
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right ${getPnLColor(portfolioValue?.value || portfolioValue)}`}>
                    <span className={isBestPortfolio && metric.isHigherBetter ? 'bg-green-100 px-2 py-0.5 rounded' : ''}>
                      {metric.format(portfolioValue)}
                    </span>
                    {isBestPortfolio && metric.isHigherBetter && (
                      <FiArrowUp className="inline ml-1 w-4 h-4 text-green-600" />
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right ${getPnLColor(btc100Value?.value || btc100Value)}`}>
                    <span className={isBestBtc100 && metric.isHigherBetter ? 'bg-green-100 px-2 py-0.5 rounded' : ''}>
                      {metric.format(btc100Value)}
                    </span>
                    {isBestBtc100 && metric.isHigherBetter && (
                      <FiArrowUp className="inline ml-1 w-4 h-4 text-green-600" />
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right ${getPnLColor(btcEthValue?.value || btcEthValue)}`}>
                    <span className={isBestBtcEth && metric.isHigherBetter ? 'bg-green-100 px-2 py-0.5 rounded' : ''}>
                      {metric.format(btcEthValue)}
                    </span>
                    {isBestBtcEth && metric.isHigherBetter && (
                      <FiArrowUp className="inline ml-1 w-4 h-4 text-green-600" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComparisonMetricsTable;
