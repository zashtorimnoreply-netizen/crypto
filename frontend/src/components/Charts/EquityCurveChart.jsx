import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/formatters';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';
import DateRangeSelector from './DateRangeSelector';

// Custom tooltip - defined outside component to avoid re-rendering
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const dateObj = parseISO(data.date);
  const displayDate = format(dateObj, 'MMM dd, yyyy');
  const displayTime = format(dateObj, 'h:mm a');

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        {displayDate} at {displayTime}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => {
          let valueDisplay = '';
          let labelDisplay = '';

          if (entry.name === 'value') {
            valueDisplay = formatCurrency(entry.value);
            labelDisplay = 'Portfolio Value';
          } else if (entry.name === 'dailyChange') {
            const sign = entry.value >= 0 ? '+' : '';
            valueDisplay = `${sign}${formatCurrency(entry.value)}`;
            labelDisplay = 'Daily Change';
          } else if (entry.name === 'dailyChangePercent') {
            const sign = entry.value >= 0 ? '+' : '';
            valueDisplay = `${sign}${entry.value.toFixed(2)}%`;
            labelDisplay = 'Daily Change %';
          } else if (entry.name === 'btcValue') {
            valueDisplay = formatCurrency(entry.value);
            labelDisplay = 'BTC Value';
          } else if (entry.name === 'ethValue') {
            valueDisplay = formatCurrency(entry.value);
            labelDisplay = 'ETH Value';
          }

          return (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{labelDisplay}:</span>
              <span className={`font-medium ${
                entry.name === 'dailyChangePercent' || entry.name === 'dailyChange'
                  ? entry.value >= 0 ? 'text-green-600' : 'text-red-600'
                  : 'text-gray-900'
              }`}>
                {valueDisplay}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom legend - defined outside component to avoid re-rendering
const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const EquityCurveChart = ({
  portfolioName = 'Portfolio',
  data,
  loading,
  error,
  onRetry,
  stats,
  showBenchmarks = false,
}) => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' or 'area'
  const [showBTC, setShowBTC] = useState(false);
  const [showETH, setShowETH] = useState(false);

  const handleDateRangeChange = (newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    if (onRetry) {
      onRetry(newStart, newEnd);
    }
  };

  // Process chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, index) => {
      const prevValue = index > 0 ? data[index - 1].total_value : item.total_value;
      const dailyChange = item.total_value - prevValue;
      const dailyChangePercent = prevValue > 0 ? (dailyChange / prevValue) * 100 : 0;

      return {
        date: item.date,
        displayDate: format(parseISO(item.date), 'MMM dd'),
        value: parseFloat(item.total_value),
        dailyChange: parseFloat(dailyChange.toFixed(2)),
        dailyChangePercent: parseFloat(dailyChangePercent.toFixed(2)),
        timestamp: item.timestamp || new Date(item.date).getTime(),
      };
    });
  }, [data]);

  // Generate benchmark data (mock for now - would need real API)
  const benchmarkData = useMemo(() => {
    if (!showBenchmarks) return {};

    const btcData = [];
    const ethData = [];

    chartData.forEach((point, index) => {
      // Mock BTC/ETH curves based on portfolio value (would be real API data)
      const btcMultiplier = showBTC ? 1.5 + Math.sin(index * 0.1) * 0.2 : 0;
      const ethMultiplier = showETH ? 1.3 + Math.sin(index * 0.15 + 1) * 0.3 : 0;

      btcData.push({
        date: point.date,
        btcValue: point.value * btcMultiplier,
      });

      ethData.push({
        date: point.date,
        ethValue: point.value * ethMultiplier,
      });
    });

    return {
      btc: btcData,
      eth: ethData,
    };
  }, [chartData, showBenchmarks, showBTC, showETH]);

  // Merge all data for chart
  const combinedChartData = useMemo(() => {
    if (!showBenchmarks || (!showBTC && !showETH)) return chartData;

    return chartData.map((point, index) => ({
      ...point,
      ...(showBTC ? { btcValue: benchmarkData.btc[index]?.btcValue } : {}),
      ...(showETH ? { ethValue: benchmarkData.eth[index]?.ethValue } : {}),
    }));
  }, [chartData, benchmarkData, showBenchmarks, showBTC, showETH]);

  if (loading) {
    return (
      <Card title="Portfolio Equity Curve">
        <Loading size="md" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Portfolio Equity Curve">
        <Error message={error} onRetry={() => onRetry(startDate, endDate)} />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Portfolio Equity Curve">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No data available for the selected date range</p>
          <p className="text-sm text-gray-400">Try expanding the date range or importing trades</p>
        </div>
      </Card>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <Card 
      title="Portfolio Equity Curve" 
      subtitle="Daily portfolio value over time"
    >
      {/* Date Range Selector */}
      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              chartType === 'area'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Area
          </button>
        </div>

        {showBenchmarks && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBTC(!showBTC)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showBTC
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              BTC
            </button>
            <button
              onClick={() => setShowETH(!showETH)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showETH
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ETH
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={combinedChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6B7280' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, 'USD', 0)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6B7280' }}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            
            {/* Portfolio Line */}
            {chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="#3B82F6"
                fillOpacity={0.1}
                name={portfolioName}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 0 }}
                name={portfolioName}
              />
            )}

            {/* BTC Benchmark */}
            {showBTC && (
              <Line
                type="monotone"
                dataKey="btcValue"
                stroke="#F97316"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#F97316', strokeWidth: 0 }}
                name="BTC Benchmark"
                strokeDasharray="5 5"
              />
            )}

            {/* ETH Benchmark */}
            {showETH && (
              <Line
                type="monotone"
                dataKey="ethValue"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#10B981', strokeWidth: 0 }}
                name="ETH Benchmark"
                strokeDasharray="5 5"
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-1">Period Start</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(data[0]?.total_value || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Period End</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(stats.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Absolute Change</p>
            <p className={`text-sm font-semibold ${
              stats.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.change >= 0 ? '+' : ''}{formatCurrency(stats.change)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Percentage Change</p>
            <p className={`text-sm font-semibold ${
              stats.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Min Value</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(stats.minValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Max Value</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(stats.maxValue)}
            </p>
          </div>
        </div>
      )}

      {/* Volatility (if available) */}
      {stats && stats.volatility > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">30-Day Volatility</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.volatility.toFixed(2)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {stats.volatility < 20 ? 'Low' : stats.volatility < 40 ? 'Medium' : 'High'} Risk
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default EquityCurveChart;
