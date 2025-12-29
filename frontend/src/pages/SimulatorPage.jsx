import { useCallback, useState, useRef } from 'react';
import Header from '../components/Layout/Header';
import LeftPanel from '../components/Layout/LeftPanel';
import RightPanel from '../components/Layout/RightPanel';
import DCAParameterForm from '../components/Simulator/DCAParameterForm';
import DCAResultsView from '../components/Simulator/DCAResultsView';
import ExportButton from '../components/UI/ExportButton';
import useSimulation from '../hooks/useSimulation';

const SimulatorPage = () => {
  const { simulationData, loading, error, runSimulation, clearResults } = useSimulation();
  const [lastParams, setLastParams] = useState(null);
  const dcaChartRef = useRef(null);

  const handleRunSimulation = useCallback(
    async (params) => {
      setLastParams(params);
      await runSimulation(params);
    },
    [runSimulation]
  );

  const handleRetry = useCallback(() => {
    if (!lastParams) return;
    runSimulation(lastParams);
  }, [lastParams, runSimulation]);

  const handleClear = useCallback(() => {
    setLastParams(null);
    clearResults();
  }, [clearResults]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        portfolioName="DCA Simulator"
        onRefresh={handleClear}
        loading={loading}
      />

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        <LeftPanel>
          <DCAParameterForm onRunSimulation={handleRunSimulation} loading={loading} apiError={error} />
        </LeftPanel>

        <RightPanel>
          <div ref={dcaChartRef}>
            {simulationData && (
              <div className="flex justify-end mb-4">
                <ExportButton 
                  elementRef={dcaChartRef} 
                  filename="dca_simulation"
                  label="Export Simulation"
                />
              </div>
            )}
            <DCAResultsView simulationData={simulationData} loading={loading} error={error} onRetry={handleRetry} />
          </div>
        </RightPanel>
      </div>
    </div>
  );
};

export default SimulatorPage;
