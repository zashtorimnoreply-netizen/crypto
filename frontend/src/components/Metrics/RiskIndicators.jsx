import { FiAlertTriangle, FiShield, FiActivity } from 'react-icons/fi';
import Card from '../UI/Card';

const RiskIndicators = ({ volatility, sharpeRatio, maxDrawdown, loading }) => {
  if (loading) {
    return (
      <Card title="Risk Indicators">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  const getRiskLevel = (value, type) => {
    if (type === 'volatility') {
      if (value < 10) return { label: 'Low', color: 'green' };
      if (value < 25) return { label: 'Medium', color: 'yellow' };
      return { label: 'High', color: 'red' };
    }
    if (type === 'sharpe') {
      if (value > 2) return { label: 'Excellent', color: 'green' };
      if (value > 1) return { label: 'Good', color: 'blue' };
      return { label: 'Poor', color: 'red' };
    }
    if (type === 'drawdown') {
      if (Math.abs(value) < 10) return { label: 'Low', color: 'green' };
      if (Math.abs(value) < 25) return { label: 'Medium', color: 'yellow' };
      return { label: 'High', color: 'red' };
    }
    return { label: 'N/A', color: 'gray' };
  };

  const indicators = [
    {
      icon: FiActivity,
      title: 'Volatility',
      value: volatility ? `${volatility.toFixed(2)}%` : 'N/A',
      level: volatility ? getRiskLevel(volatility, 'volatility') : null,
    },
    {
      icon: FiShield,
      title: 'Sharpe Ratio',
      value: sharpeRatio ? sharpeRatio.toFixed(2) : 'N/A',
      level: sharpeRatio ? getRiskLevel(sharpeRatio, 'sharpe') : null,
    },
    {
      icon: FiAlertTriangle,
      title: 'Max Drawdown',
      value: maxDrawdown ? `${maxDrawdown.toFixed(2)}%` : 'N/A',
      level: maxDrawdown ? getRiskLevel(maxDrawdown, 'drawdown') : null,
    },
  ];

  return (
    <Card title="Risk Indicators">
      <div className="space-y-4">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon;
          const levelColors = {
            green: 'bg-green-50 text-green-700 border-green-200',
            yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            red: 'bg-red-50 text-red-700 border-red-200',
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            gray: 'bg-gray-50 text-gray-700 border-gray-200',
          };

          return (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{indicator.title}</p>
                  <p className="text-lg font-bold text-gray-700">{indicator.value}</p>
                </div>
              </div>
              {indicator.level && (
                <span className={`px-3 py-1 text-xs font-medium border rounded-full ${levelColors[indicator.level.color]}`}>
                  {indicator.level.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RiskIndicators;
