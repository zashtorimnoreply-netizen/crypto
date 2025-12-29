import { useMemo } from 'react';
import MetricsCard from './MetricsCard';
import { 
  formatCurrencyWithSign, 
  formatPercentWithSign,
  formatDateRange,
  getPnLColor,
  getVolatilityColor,
  getDrawdownColor,
  getYTDPerformanceColor,
  getVolatilityLabel,
  getDrawdownLabel
} from '../../utils/metricsHelpers';
import { TOOLTIPS } from '../../utils/tooltips';

const MetricsGrid = ({ metrics, loading = false, error = null }) => {
  // Prepare card data
  const cards = useMemo(() => {
    if (!metrics) {
      return [
        {
          id: 'pnl',
          title: 'Total Profit/Loss',
          value: '–',
          subValue: '',
          description: 'Your total gain or loss from initial investment',
          trafficLightColor: 'gray',
          tooltip: TOOLTIPS.totalPnL,
          valueColor: null,
        },
        {
          id: 'volatility',
          title: 'Volatility',
          value: '–',
          subValue: '',
          description: 'Price fluctuation measure',
          trafficLightColor: 'gray',
          tooltip: TOOLTIPS.volatility,
          valueColor: null,
        },
        {
          id: 'drawdown',
          title: 'Max Drawdown',
          value: '–',
          subValue: '',
          description: 'Largest peak-to-trough decline',
          trafficLightColor: 'gray',
          tooltip: TOOLTIPS.maxDrawdown,
          valueColor: null,
        },
        {
          id: 'ytd',
          title: 'YTD Return',
          value: '–',
          subValue: '',
          description: 'Year-to-date performance',
          trafficLightColor: 'gray',
          tooltip: TOOLTIPS.ytdReturn,
          valueColor: null,
        },
      ];
    }

    const { current_state, key_metrics } = metrics;
    const pnlValue = current_state?.pnl?.value ?? 0;
    const pnlPercent = current_state?.pnl?.percent ?? 0;
    const volatility = key_metrics?.volatility_percent ?? 0;
    const maxDrawdown = key_metrics?.max_drawdown_percent ?? 0;
    const ytdReturn = key_metrics?.ytd_return_percent ?? 0;
    const ytdBtc = key_metrics?.ytd_btc_return_percent ?? 0;
    const ytdEth = key_metrics?.ytd_eth_return_percent ?? 0;
    const drawdownFromDate = key_metrics?.max_drawdown_from_date;
    const drawdownToDate = key_metrics?.max_drawdown_to_date;

    return [
      {
        id: 'pnl',
        title: 'Total Profit/Loss',
        value: formatCurrencyWithSign(pnlValue),
        subValue: formatPercentWithSign(pnlPercent, 1) + ' return',
        description: 'Your total gain or loss from initial investment',
        trafficLightColor: getPnLColor(pnlPercent),
        tooltip: TOOLTIPS.totalPnL,
        valueColor: pnlPercent > 0 ? 'green' : pnlPercent < 0 ? 'red' : null,
      },
      {
        id: 'volatility',
        title: 'Volatility',
        value: volatility > 0 ? `${volatility.toFixed(1)}%` : 'N/A',
        subValue: volatility > 0 ? `${getVolatilityLabel(volatility)} • 30-day annualized` : 'Not available yet',
        description: 'Measures price fluctuations and risk',
        trafficLightColor: getVolatilityColor(volatility),
        tooltip: TOOLTIPS.volatility,
        valueColor: null,
      },
      {
        id: 'drawdown',
        title: 'Max Drawdown',
        value: maxDrawdown !== 0 ? `${maxDrawdown.toFixed(1)}%` : 'N/A',
        subValue: drawdownFromDate && drawdownToDate 
          ? formatDateRange(drawdownFromDate, drawdownToDate)
          : 'No significant drawdown',
        description: `${getDrawdownLabel(maxDrawdown)} decline from peak`,
        trafficLightColor: getDrawdownColor(maxDrawdown),
        tooltip: TOOLTIPS.maxDrawdown,
        valueColor: null,
      },
      {
        id: 'ytd',
        title: 'YTD Return',
        value: ytdReturn > 0 || ytdReturn < 0 ? formatPercentWithSign(ytdReturn, 1) : '0.0%',
        subValue: ytdBtc > 0 || ytdEth > 0 
          ? `BTC: ${formatPercentWithSign(ytdBtc, 1)} • ETH: ${formatPercentWithSign(ytdEth, 1)}`
          : 'Benchmark data unavailable',
        description: 'Performance vs BTC and ETH benchmarks',
        trafficLightColor: getYTDPerformanceColor(ytdReturn, ytdBtc, ytdEth),
        tooltip: TOOLTIPS.ytdReturn,
        valueColor: ytdReturn > 0 ? 'green' : ytdReturn < 0 ? 'red' : null,
      },
    ];
  }, [metrics]);

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load metrics</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {cards.map((card) => (
        <MetricsCard
          key={card.id}
          title={card.title}
          value={card.value}
          subValue={card.subValue}
          description={card.description}
          trafficLightColor={card.trafficLightColor}
          tooltip={card.tooltip}
          valueColor={card.valueColor}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default MetricsGrid;
