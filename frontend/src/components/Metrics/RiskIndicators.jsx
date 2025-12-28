import Card from '../UI/Card';
import TrafficLight from '../UI/TrafficLight';
import Tooltip from '../UI/Tooltip';
import { 
  getVolatilityColor, 
  getDrawdownColor,
  getVolatilityLabel,
  getDrawdownLabel
} from '../../utils/metricsHelpers';

const RiskIndicators = ({ metrics, loading }) => {
  if (loading) {
    return (
      <Card title="Risk Indicators">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!metrics || !metrics.key_metrics) {
    return (
      <Card title="Risk Indicators">
        <div className="text-center py-8 text-gray-500">
          No risk data available
        </div>
      </Card>
    );
  }

  const { key_metrics } = metrics;
  const volatility = key_metrics.volatility_percent ?? 0;
  const maxDrawdown = key_metrics.max_drawdown_percent ?? 0;
  const sharpeRatio = key_metrics.sharpe_ratio ?? 0;

  const indicators = [
    {
      title: 'Volatility',
      value: volatility > 0 ? `${volatility.toFixed(1)}%` : 'N/A',
      label: getVolatilityLabel(volatility),
      color: getVolatilityColor(volatility),
      tooltip: `Price fluctuations. ${volatility.toFixed(1)}% means your portfolio typically swings ±${volatility.toFixed(1)}% annually. Green (<20%) = low risk, Yellow (20-50%) = moderate risk, Red (>50%) = high risk.`,
    },
    {
      title: 'Max Drawdown',
      value: maxDrawdown !== 0 ? `${maxDrawdown.toFixed(1)}%` : 'N/A',
      label: getDrawdownLabel(maxDrawdown),
      color: getDrawdownColor(maxDrawdown),
      tooltip: `Largest peak-to-trough decline. Shows worst-case scenario. Green (>-10%) = minor, Yellow (-10% to -30%) = moderate, Red (<-30%) = severe.`,
    },
    {
      title: 'Sharpe Ratio',
      value: sharpeRatio > 0 ? sharpeRatio.toFixed(2) : 'N/A',
      label: sharpeRatio > 2 ? 'Excellent' : sharpeRatio > 1 ? 'Good' : sharpeRatio > 0 ? 'Fair' : 'N/A',
      color: sharpeRatio > 2 ? 'green' : sharpeRatio > 1 ? 'yellow' : 'gray',
      tooltip: 'Risk-adjusted returns. Higher is better. Above 2 is excellent, above 1 is good, below 1 means you could get better returns with less risk elsewhere.',
    },
  ];

  return (
    <Card title="Risk Indicators">
      <div className="space-y-4">
        {indicators.map((indicator, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900">{indicator.title}</p>
                <Tooltip content={indicator.tooltip} position="right" multiline maxWidth="max-w-md">
                  <span className="text-gray-400 text-xs cursor-help hover:text-gray-600">ⓘ</span>
                </Tooltip>
              </div>
              <p className="text-xl font-bold text-gray-700">{indicator.value}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">{indicator.label}</span>
              <TrafficLight color={indicator.color} size="lg" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RiskIndicators;
