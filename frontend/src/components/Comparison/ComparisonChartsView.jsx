import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../../utils/formatters';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';

const COLORS = {
  portfolio: '#2563eb',
  btc100: '#9ca3af',
  btcEth70_30: '#14b8a6',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const dateObj = parseISO(label);
  const displayDate = format(dateObj, 'MMM dd, yyyy');

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">{displayDate}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          let colorClass = 'text-gray-900';
          if (entry.dataKey === 'portfolio') colorClass = 'text-blue-600';
          else if (entry.dataKey === 'btc100') colorClass = 'text-gray-500';
          else if (entry.dataKey === 'btcEth70_30') colorClass = 'text-teal-500';

          return (
            <div key={index} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{entry.name}:</span>
              <span className={`font-medium ${colorClass}`}>
                {entry.value !== null ? formatCurrency(entry.value) : 'N/A'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomLegend = ({ payload, onLegendClick }) => {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-2">
      {payload.map((entry, index) => {
        return (
          <div 
            key={index} 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onLegendClick?.(entry.dataKey)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

const ComparisonChartsView = ({ 
  data, 
  loading, 
  error, 
  onRetry,
  showLegend = true,
}) => {
  const [visibleLines, setVisibleLines] = useState({
    portfolio: true,
    btc100: true,
    btcEth70_30: true,
  });

  const handleLegendClick = (dataKey) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(item => ({
      ...item,
      displayDate: format(parseISO(item.date), 'MMM dd'),
    }));
  }, [data]);

  const hasData = chartData.length > 0;

  if (loading) {
    return (
      <Card title="Portfolio vs Presets" subtitle="Compare your portfolio performance against benchmark strategies">
        <Loading size="md" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Portfolio vs Presets" subtitle="Compare your portfolio performance against benchmark strategies">
        <Error message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card title="Portfolio vs Presets" subtitle="Compare your portfolio performance against benchmark strategies">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No data available for the selected date range</p>
          <p className="text-sm text-gray-400">Try expanding the date range or importing trades</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Portfolio vs Presets" 
      subtitle="Compare your portfolio performance against benchmark strategies"
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6B7280' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, 'USD', 0)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#6B7280' }}
              domain={['dataMin - 1000', 'dataMax + 1000']}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend 
                content={<CustomLegend 
                  payload={[
                    { value: 'Your Portfolio', color: COLORS.portfolio },
                    { value: 'BTC 100%', color: COLORS.btc100 },
                    { value: 'BTC/ETH 70/30', color: COLORS.btcEth70_30 },
                  ]} 
                  onLegendClick={handleLegendClick} 
                />} 
              />
            )}
            
            {/* Portfolio Line */}
            {visibleLines.portfolio && (
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke={COLORS.portfolio}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: COLORS.portfolio, strokeWidth: 0 }}
                name="Your Portfolio"
                connectNulls
              />
            )}

            {/* BTC 100% Line */}
            {visibleLines.btc100 && (
              <Line
                type="monotone"
                dataKey="btc100"
                stroke={COLORS.btc100}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: COLORS.btc100, strokeWidth: 0 }}
                name="BTC 100%"
                connectNulls
              />
            )}

            {/* BTC/ETH 70/30 Line */}
            {visibleLines.btcEth70_30 && (
              <Line
                type="monotone"
                dataKey="btcEth70_30"
                stroke={COLORS.btcEth70_30}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: COLORS.btcEth70_30, strokeWidth: 0 }}
                name="BTC/ETH 70/30"
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ComparisonChartsView;
