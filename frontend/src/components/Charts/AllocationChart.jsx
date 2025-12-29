import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { CHART_COLORS } from '../../utils/constants';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';

const AllocationChart = ({ 
  data, 
  totalValue = 0,
  loading, 
  error, 
  onRetry, 
  onSliceClick,
  highlightedSymbol 
}) => {
  const [activeIndex, setActiveIndex] = useState(null);

  // Memoize chart data transformation to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item, index) => ({
      name: item.symbol,
      value: parseFloat(item.value),
      percent: item.percent,
      holdings: item.holdings,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [data]);

  const handlePieClick = (entry, index) => {
    setActiveIndex(index);
    onSliceClick?.(entry.name);
  };

  const handleMouseEnter = (entry, index) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  // Custom label for pie slices
  const renderLabel = useMemo(() => {
    return (entry) => {
      if (entry.percent < 5) return '';
      return `${entry.percent.toFixed(1)}%`;
    };
  }, []);

  // Custom center label showing total value
  const renderCenterLabel = useMemo(() => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <tspan
          x="50%"
          dy="-0.5em"
          className="text-sm fill-gray-500"
          style={{ fontSize: '14px' }}
        >
          Total Value
        </tspan>
        <tspan
          x="50%"
          dy="1.5em"
          className="text-xl font-bold fill-gray-900"
          style={{ fontSize: '20px', fontWeight: 'bold' }}
        >
          {formatCurrency(totalValue)}
        </tspan>
      </text>
    );
  }, [totalValue]);

  if (loading) {
    return (
      <Card title="Portfolio Allocation">
        <div className="py-12">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Portfolio Allocation">
        <Error message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card title="Portfolio Allocation">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No allocation data available</p>
          <p className="text-sm text-gray-400">
            Import trades to see portfolio allocation
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Portfolio Allocation" subtitle="Current holdings by value">
      <div className="h-96 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              innerRadius={70}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              onClick={handlePieClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              activeIndex={
                highlightedSymbol 
                  ? chartData.findIndex(item => item.name === highlightedSymbol)
                  : activeIndex
              }
              activeShape={{
                outerRadius: 130,
                stroke: '#3B82F6',
                strokeWidth: 2,
              }}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="cursor-pointer transition-all"
                  opacity={highlightedSymbol && highlightedSymbol !== entry.name ? 0.5 : 1}
                />
              ))}
            </Pie>
            {renderCenterLabel()}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
                    <p className="text-sm text-gray-600">
                      Holdings: {data.holdings.toFixed(8).replace(/\.?0+$/, '')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Value: {formatCurrency(data.value)}
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {data.percent.toFixed(2)}% of portfolio
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={50}
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value, entry) => {
                const percent = entry.payload.percent;
                return `${value}: ${percent.toFixed(1)}%`;
              }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(AllocationChart);
