import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { CHART_COLORS } from '../../utils/constants';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';

const AllocationChart = ({ data, loading, error, onRetry }) => {
  if (loading) {
    return (
      <Card title="Portfolio Allocation">
        <Loading size="md" />
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

  if (!data || data.length === 0) {
    return (
      <Card title="Portfolio Allocation">
        <p className="text-center text-gray-500 py-8">No allocation data available</p>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    name: item.symbol,
    value: parseFloat(item.value || item.percentage),
    percentage: item.percentage,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <Card title="Portfolio Allocation" subtitle="Current holdings by value">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} ${formatPercentage(percentage)}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [
                formatCurrency(value),
                `${props.payload.name} (${formatPercentage(props.payload.percentage)})`,
              ]}
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => `${value}: ${formatPercentage(entry.payload.percentage)}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default AllocationChart;
