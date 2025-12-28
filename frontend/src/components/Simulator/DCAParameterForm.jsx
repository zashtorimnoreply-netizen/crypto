import { useMemo, useState } from 'react';
import { FiChevronDown, FiLoader, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { format, startOfYear, subYears } from 'date-fns';
import Card from '../UI/Card';
import Button from '../UI/Button';

const ASSET_OPTIONS = [
  { value: 'BTC', label: 'BTC' },
  { value: 'ETH', label: 'ETH' },
  { value: 'BTC_ETH_70_30', label: 'BTC/ETH (70/30)' },
];

const PERIOD_OPTIONS = [
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: '3Y', label: '3Y' },
  { value: '5Y', label: '5Y' },
];

const FREQUENCY_OPTIONS = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

const getDateRangeForPeriod = (period) => {
  const today = new Date();
  let start;

  switch (period) {
    case 'YTD':
      start = startOfYear(today);
      break;
    case '1Y':
      start = subYears(today, 1);
      break;
    case '3Y':
      start = subYears(today, 3);
      break;
    case '5Y':
      start = subYears(today, 5);
      break;
    default:
      start = startOfYear(today);
  }

  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  };
};

const getSimulationRequestFromForm = ({ asset, amount, period }) => {
  const { startDate, endDate } = getDateRangeForPeriod(period);

  const amountNum = parseFloat(amount);

  let requestAsset = asset;
  let pair = null;

  if (asset === 'BTC_ETH_70_30') {
    requestAsset = 'BTC';
    pair = '70/30';
  }

  return {
    startDate,
    endDate,
    amount: amountNum,
    interval: 7,
    asset: requestAsset,
    pair,
  };
};

const DCAParameterForm = ({ onRunSimulation, loading = false, apiError = null }) => {
  const [asset, setAsset] = useState('BTC');
  const [amount, setAmount] = useState('100');
  const [period, setPeriod] = useState('YTD');
  const [frequency, setFrequency] = useState('Weekly');

  const amountError = useMemo(() => {
    const value = parseFloat(amount);
    if (Number.isNaN(value)) return 'Please enter a valid amount';
    if (value <= 0) return 'Amount must be greater than 0';
    return null;
  }, [amount]);

  const derivedDateRange = useMemo(() => getDateRangeForPeriod(period), [period]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (amountError || loading) return;

    const request = getSimulationRequestFromForm({ asset, amount, period });
    await onRunSimulation?.(request);
  };

  return (
    <Card title="DCA Parameters" subtitle="Configure and run a DCA simulation">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Asset Selection */}
        <div>
          <label htmlFor="dca-asset" className="block text-sm font-medium text-gray-700 mb-2">
            Asset
          </label>
          <div className="relative">
            <select
              id="dca-asset"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 bg-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Select asset"
              disabled={loading}
            >
              {ASSET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="dca-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Monthly investment amount
          </label>
          <input
            id="dca-amount"
            type="number"
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$100"
            className={`w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              amountError ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
            aria-invalid={!!amountError}
          />
          {amountError && (
            <p className="mt-2 text-sm text-red-700 flex items-start gap-2">
              <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{amountError}</span>
            </p>
          )}
        </div>

        {/* Period */}
        <div>
          <label htmlFor="dca-period" className="block text-sm font-medium text-gray-700 mb-2">
            Time period
          </label>
          <div className="relative">
            <select
              id="dca-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 bg-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Select time period"
              disabled={loading}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Simulation range: {derivedDateRange.startDate} → {derivedDateRange.endDate}
          </p>
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="dca-frequency" className="block text-sm font-medium text-gray-700 mb-2">
            Frequency
          </label>
          <div className="relative">
            <select
              id="dca-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 bg-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Select frequency"
              disabled={loading}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 flex items-start gap-2">
              <FiInfo className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Backend currently supports weekly (7-day) purchases only.</span>
            </p>
          </div>
        </div>

        {apiError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!!amountError || loading}
          className="w-full disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <FiLoader className="w-5 h-5 animate-spin" />
              Running...
            </span>
          ) : (
            'Run Simulation'
          )}
        </Button>
      </form>
    </Card>
  );
};

export default DCAParameterForm;
