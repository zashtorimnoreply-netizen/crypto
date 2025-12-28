import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatPercentage, formatDate } from '../../utils/formatters';
import { CHART_COLORS } from '../../utils/constants';
import Card from '../UI/Card';
import Loading from '../UI/Loading';

const ComparisonChart = ({ data, loading }) => {
  if (loading) {
    return (
      <Card title="Performance Comparison">
        <Loading size="md" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card title="Performance Comparison">
        <p className="text-center text-gray-500 py-8">No comparison data available</p>
      </Card>
    );
  }

  return (
    <Card title="Performance Comparison" subtitle="Portfolio vs. Benchmarks">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => formatDate(date, 'MMM dd')}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              tickFormatter={(value) => formatPercentage(value / 100)}
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value) => formatPercentage(value / 100)}
              labelFormatter={(date) => formatDate(date)}
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="btc"
              name="BTC"
              stroke={CHART_COLORS[1]}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="eth"
              name="ETH"
              stroke={CHART_COLORS[2]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ComparisonChart;
