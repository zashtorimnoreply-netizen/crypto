import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsGrid from './MetricsGrid';
import { sampleMetricsData, sampleMetricsScenarios } from '../../utils/sampleMetrics';

/**
 * This file demonstrates the MetricsGrid component with various scenarios
 * Run with: npm run test
 */

describe('MetricsGrid Component', () => {
  it('should render all 4 metric cards', () => {
    render(<MetricsGrid metrics={sampleMetricsData} loading={false} />);
    
    // Check for card titles
    expect(screen.getByText('Total Profit/Loss')).toBeInTheDocument();
    expect(screen.getByText('Volatility')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('YTD Return')).toBeInTheDocument();
  });

  it('should display loading skeletons when loading', () => {
    const { container } = render(<MetricsGrid metrics={null} loading={true} />);
    
    // Check for loading skeleton animations
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display error message when error is present', () => {
    render(<MetricsGrid metrics={null} loading={false} error="Failed to fetch" />);
    
    expect(screen.getByText('Failed to load metrics')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('should render with low risk scenario', () => {
    render(<MetricsGrid metrics={sampleMetricsScenarios.lowRisk} loading={false} />);
    
    // Low volatility should be displayed
    expect(screen.getByText(/15\.0%/)).toBeInTheDocument();
  });

  it('should render with high risk scenario', () => {
    render(<MetricsGrid metrics={sampleMetricsScenarios.highRisk} loading={false} />);
    
    // High volatility should be displayed
    expect(screen.getByText(/65\.0%/)).toBeInTheDocument();
  });

  it('should render with empty portfolio scenario', () => {
    render(<MetricsGrid metrics={sampleMetricsScenarios.empty} loading={false} />);
    
    // Should display N/A for empty metrics
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('should format PnL with correct sign and color', () => {
    const { container } = render(
      <MetricsGrid metrics={sampleMetricsData} loading={false} />
    );
    
    // Check for positive PnL with green color
    const pnlElements = container.querySelectorAll('.text-green-600');
    expect(pnlElements.length).toBeGreaterThan(0);
  });

  it('should display traffic lights for all cards', () => {
    const { container } = render(
      <MetricsGrid metrics={sampleMetricsData} loading={false} />
    );
    
    // Check for traffic light elements (should be 4, one per card)
    const trafficLights = container.querySelectorAll('[aria-label*="indicator"]');
    expect(trafficLights.length).toBe(4);
  });
});

describe('Traffic Light Colors', () => {
  it('should show green traffic light for positive PnL', () => {
    const { container } = render(
      <MetricsGrid metrics={sampleMetricsData} loading={false} />
    );
    
    const greenLights = container.querySelectorAll('.bg-\\[\\#10B981\\]');
    expect(greenLights.length).toBeGreaterThan(0);
  });

  it('should show red traffic light for negative PnL', () => {
    const { container } = render(
      <MetricsGrid metrics={sampleMetricsScenarios.highRisk} loading={false} />
    );
    
    const redLights = container.querySelectorAll('.bg-\\[\\#EF4444\\]');
    expect(redLights.length).toBeGreaterThan(0);
  });

  it('should show yellow traffic light for moderate volatility', () => {
    const { container } = render(
      <MetricsGrid metrics={sampleMetricsScenarios.moderateRisk} loading={false} />
    );
    
    const yellowLights = container.querySelectorAll('.bg-\\[\\#F59E0B\\]');
    expect(yellowLights.length).toBeGreaterThan(0);
  });
});

/**
 * Visual Testing Guide
 * 
 * To visually test the component, add this to any page:
 * 
 * import MetricsGrid from './components/Metrics/MetricsGrid';
 * import { sampleMetricsData, sampleMetricsScenarios } from './utils/sampleMetrics';
 * 
 * // Default scenario
 * <MetricsGrid metrics={sampleMetricsData} />
 * 
 * // Low risk
 * <MetricsGrid metrics={sampleMetricsScenarios.lowRisk} />
 * 
 * // High risk
 * <MetricsGrid metrics={sampleMetricsScenarios.highRisk} />
 * 
 * // Moderate risk
 * <MetricsGrid metrics={sampleMetricsScenarios.moderateRisk} />
 * 
 * // Empty portfolio
 * <MetricsGrid metrics={sampleMetricsScenarios.empty} />
 * 
 * // Loading state
 * <MetricsGrid metrics={null} loading={true} />
 * 
 * // Error state
 * <MetricsGrid metrics={null} error="Network error" />
 */
