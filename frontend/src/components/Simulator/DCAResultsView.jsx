import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseISO, format as formatDateFn } from 'date-fns';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';
import MetricsCard from '../Metrics/MetricsCard';
import { formatCurrency } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const dateObj = parseISO(label);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[200px]">
      <p className="text-sm font-semibold text-gray-900 mb-2">
        {formatDateFn(dateObj, 'MMM dd, yyyy')}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium text-gray-900">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DCAResultsView = ({ simulationData, loading, error, onRetry }) => {
  const metrics = simulationData?.results;

  const chartData = useMemo(() => {
    if (!simulationData?.dailyData?.length) return [];

    return simulationData.dailyData.map((d) => ({
      date: d.date,
      displayDate: formatDateFn(parseISO(d.date), 'MMM dd'),
      dcaValue: d.dcaValue,
      hodlValue: d.hodlValue,
    }));
  }, [simulationData]);

  const totalInvested = simulationData?.dca?.totalInvested ?? metrics?.dca?.totalInvested ?? 0;
  const dcaValue = metrics?.dca?.totalValue ?? 0;
  const hodlValue = metrics?.hodl?.totalValue ?? 0;
  const dcaPnl = metrics?.dca?.pnl?.value ?? 0;

  const hodlBetter = hodlValue > dcaValue;
  const diff = hodlValue - dcaValue;

  if (loading) {
    return (
      <Card title="DCA Results" subtitle="Calculating DCA performance...">
        <Loading size="md" text="Calculating DCA performance..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="DCA Results">
        <Error message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!simulationData) {
    return (
      <Card title="DCA vs. HODL" subtitle="Run a simulation to see results">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-2">
            Enter parameters and click "Run Simulation" to compare DCA vs. HODL strategies.
          </p>
          <p className="text-sm text-gray-400">
            You’ll see key metrics, a performance chart, and a risk comparison.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricsCard
            title="Total Invested"
            value={formatCurrency(totalInvested)}
            description="Total USD invested across all DCA purchases"
            trafficLightColor="gray"
          />

          <MetricsCard
            title="Final Value (DCA)"
            value={formatCurrency(dcaValue)}
            subValue={`${dcaPnl >= 0 ? '+' : ''}${formatCurrency(dcaPnl)} PnL`}
            description="Portfolio value at the end of the period using DCA"
            valueColor={dcaPnl >= 0 ? 'green' : 'red'}
            trafficLightColor="gray"
          />

          <MetricsCard
            title="Final Value (HODL)"
            value={formatCurrency(hodlValue)}
            subValue={
              hodlBetter ? (
                <span className="flex items-center gap-1 text-green-700">
                  <FiArrowUp className="w-4 h-4" />
                  Better by {formatCurrency(Math.abs(diff))}
                </span>
              ) : diff < 0 ? (
                <span className="flex items-center gap-1 text-gray-700">
                  <FiArrowDown className="w-4 h-4" />
                  Worse by {formatCurrency(Math.abs(diff))}
                </span>
              ) : (
                'Same as DCA'
              )
            }
            description="Buy once on day 1 with the total amount that would be invested via DCA"
            trafficLightColor="gray"
          />

          <MetricsCard
            title="CAGR (DCA)"
            value={`${(metrics?.dca?.cagr ?? 0).toFixed(1)}%`}
            subValue={`HODL: ${(metrics?.hodl?.cagr ?? 0).toFixed(1)}%`}
            description="Compound annual growth rate"
            trafficLightColor="gray"
          />
        </div>
      </div>

      {/* Chart */}
      <Card
        title="Performance Chart"
        subtitle={`${simulationData.period?.startDate || ''} → ${simulationData.period?.endDate || ''}`}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => formatDateFn(parseISO(value), 'MMM dd')}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value, 'USD', 0)}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} labelFormatter={(v) => v} />
              <Legend />
              <Line
                type="monotone"
                dataKey="dcaValue"
                name="DCA"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="hodlValue"
                name="HODL"
                stroke="#6B7280"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#6B7280', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Comparison */}
      <Card title="Comparison Summary" subtitle="DCA vs. Buy-and-Hold">
        <div className="space-y-4">
          <p className="text-gray-700">
            You invested <span className="font-semibold">{formatCurrency(totalInvested)}</span> with DCA and ended with{' '}
            <span className="font-semibold">{formatCurrency(dcaValue)}</span>, vs.{' '}
            <span className="font-semibold">{formatCurrency(hodlValue)}</span> if you held 100% from day 1.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Max Drawdown</p>
              <p className="text-sm font-semibold text-gray-900">
                DCA: {(metrics?.dca?.maxDrawdown ?? 0).toFixed(2)}% • HODL: {(metrics?.hodl?.maxDrawdown ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Volatility</p>
              <p className="text-sm font-semibold text-gray-900">
                DCA: {(metrics?.dca?.volatility ?? 0).toFixed(2)}% • HODL: {(metrics?.hodl?.volatility ?? 0).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              {hodlBetter
                ? 'HODL outperformed DCA over this period.'
                : hodlValue < dcaValue
                  ? 'DCA outperformed HODL over this period.'
                  : 'DCA and HODL performed similarly over this period.'}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Consider drawdown and volatility alongside returns when choosing an approach.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DCAResultsView;
