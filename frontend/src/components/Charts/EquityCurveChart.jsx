import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';

const EquityCurveChart = ({ data, loading, error, onRetry }) => {
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
        <Error message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Portfolio Equity Curve">
        <p className="text-center text-gray-500 py-8">No data available</p>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    date: item.date,
    value: parseFloat(item.total_value),
  }));

  return (
    <Card title="Portfolio Equity Curve" subtitle="Daily portfolio value over time">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDate(date, 'MMM dd')}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, 'USD', 0)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Value']}
              labelFormatter={(date) => formatDate(date)}
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default EquityCurveChart;
