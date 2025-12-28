import { useState } from 'react';
import MetricsGrid from '../components/Metrics/MetricsGrid';
import RiskIndicators from '../components/Metrics/RiskIndicators';
import { sampleMetricsData, sampleMetricsScenarios } from '../utils/sampleMetrics';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

/**
 * MetricsDemo Page
 * 
 * This page showcases the MetricsGrid and RiskIndicators components
 * with different scenarios for testing and demonstration purposes.
 * 
 * To view this page, add a route to App.jsx:
 * <Route path="/demo/metrics" element={<MetricsDemo />} />
 */

const MetricsDemo = () => {
  const [currentScenario, setCurrentScenario] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const scenarios = {
    default: { label: 'Default', data: sampleMetricsData },
    lowRisk: { label: 'Low Risk (Profitable)', data: sampleMetricsScenarios.lowRisk },
    highRisk: { label: 'High Risk (Loss)', data: sampleMetricsScenarios.highRisk },
    moderateRisk: { label: 'Moderate Risk', data: sampleMetricsScenarios.moderateRisk },
    empty: { label: 'Empty Portfolio', data: sampleMetricsScenarios.empty },
  };

  const handleScenarioChange = (scenario) => {
    setCurrentScenario(scenario);
    setError(null);
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const simulateError = () => {
    setError('Failed to load metrics. Please try again.');
    setTimeout(() => setError(null), 5000);
  };

  const currentData = scenarios[currentScenario].data;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Metrics Display Demo</h1>
          <p className="text-gray-600">
            Showcase of MetricsGrid and RiskIndicators components with different scenarios
          </p>
        </div>

        {/* Controls */}
        <Card title="Controls" className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Scenario
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(scenarios).map(([key, { label }]) => (
                  <Button
                    key={key}
                    onClick={() => handleScenarioChange(key)}
                    variant={currentScenario === key ? 'primary' : 'secondary'}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test States
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={simulateLoading}>
                  Simulate Loading
                </Button>
                <Button onClick={simulateError} variant="danger">
                  Simulate Error
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics Details */}
        <Card title="Current Scenario Details" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Portfolio State</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Value:</dt>
                  <dd className="font-medium">${currentData.current_state.total_value.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Cost Basis:</dt>
                  <dd className="font-medium">${currentData.current_state.cost_basis.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">PnL:</dt>
                  <dd className={`font-medium ${currentData.current_state.pnl.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${currentData.current_state.pnl.value.toLocaleString()} 
                    ({currentData.current_state.pnl.percent.toFixed(2)}%)
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Risk Metrics</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Volatility:</dt>
                  <dd className="font-medium">{currentData.key_metrics.volatility_percent.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Max Drawdown:</dt>
                  <dd className="font-medium">{currentData.key_metrics.max_drawdown_percent.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">YTD Return:</dt>
                  <dd className="font-medium">{currentData.key_metrics.ytd_return_percent.toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sharpe Ratio:</dt>
                  <dd className="font-medium">{currentData.key_metrics.sharpe_ratio?.toFixed(2) || 'N/A'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        {/* MetricsGrid Component */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Metrics Grid</h2>
          <MetricsGrid 
            metrics={currentData} 
            loading={isLoading}
            error={error}
          />
        </div>

        {/* RiskIndicators Component */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Indicators</h2>
          <RiskIndicators 
            metrics={currentData}
            loading={isLoading}
          />
        </div>

        {/* Traffic Light Legend */}
        <Card title="Traffic Light System" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Volatility</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                  <span className="text-gray-600">Green: &lt; 20% (Low)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                  <span className="text-gray-600">Yellow: 20-50% (Moderate)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                  <span className="text-gray-600">Red: &gt; 50% (High)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Max Drawdown</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                  <span className="text-gray-600">Green: &gt; -10% (Minor)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                  <span className="text-gray-600">Yellow: -10 to -30% (Moderate)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                  <span className="text-gray-600">Red: &lt; -30% (Severe)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">PnL</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                  <span className="text-gray-600">Green: &gt; 0% (Profit)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                  <span className="text-gray-600">Red: &lt; 0% (Loss)</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">YTD vs Benchmarks</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#10B981] rounded-full"></div>
                  <span className="text-gray-600">Green: Outperforming BTC</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div>
                  <span className="text-gray-600">Yellow: Between ETH & BTC</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#EF4444] rounded-full"></div>
                  <span className="text-gray-600">Red: Underperforming ETH</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Implementation Code */}
        <Card title="Usage Example">
          <pre className="text-sm bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`import { useMetrics } from '../hooks/useMetrics';
import MetricsGrid from '../components/Metrics/MetricsGrid';
import RiskIndicators from '../components/Metrics/RiskIndicators';

const MyComponent = () => {
  const { metrics, loading, error } = useMetrics(portfolioId);
  
  return (
    <>
      <MetricsGrid 
        metrics={metrics} 
        loading={loading} 
        error={error} 
      />
      
      <RiskIndicators 
        metrics={metrics} 
        loading={loading} 
      />
    </>
  );
};`}
          </pre>
        </Card>
      </div>
    </div>
  );
};

export default MetricsDemo;
