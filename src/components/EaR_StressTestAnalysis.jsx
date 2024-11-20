// EaR_StressTestAnalysis.jsx
import React from 'react';
import { calculateAssetRevenue } from './RevCalculations';
import { generateScenarios, createHistogramData, calculateYearlyMetrics } from './EaR_calculation';

const StressTestAnalysis = ({ assets, constants, getMerchantPrice, selectedYear }) => {
  if (!assets || Object.keys(assets).length === 0) return null;

  // Move calculateStressScenario inside the year loop since it needs the year parameter
  const calculateStressScenario = (year, volumeChange, greenPriceChange, blackPriceChange) => {
    return Object.values(assets).reduce((total, asset) => {
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
      const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
      const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + greenPriceChange/100);
      const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + blackPriceChange/100);
      return total + contractedGreen + contractedBlack + merchantGreen + merchantBlack;
    }, 0);
  };

  // Generate Monte Carlo scenarios
  const scenarios = generateScenarios(assets, constants, getMerchantPrice);
  
  // Calculate base case and key metrics for selected year
  const stats = calculateYearlyMetrics(scenarios, selectedYear, assets, constants, getMerchantPrice);
  const baseCase = stats.baseCase;
  const p50Value = stats.p50;
  const p10Value = stats.p10;
  const p90Value = stats.p90;
  const range = p10Value - p90Value;
  const rangePercent = ((range / baseCase) * 100).toFixed(1);

  const volumeVar = constants.volumeVariation || 0;
  const greenVar = constants.greenPriceVariation || constants.priceVariation || 0;
  const blackVar = constants.blackPriceVariation || constants.priceVariation || 0;

  // Calculate waterfall data using Monte Carlo results for each year
  const waterfallData = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => {
      const year = constants.analysisStartYear + i;
      const yearStats = calculateYearlyMetrics(scenarios, year, assets, constants, getMerchantPrice);
      
      return {
        year,
        baseCase: yearStats.baseCase,
        p10: yearStats.p10,
        p90: yearStats.p90,
        worstCase: calculateStressScenario(year, -volumeVar, -greenVar, -blackVar),
        volumeStress: calculateStressScenario(year, -volumeVar, 0, 0),
        priceStress: calculateStressScenario(year, 0, -greenVar, -blackVar)
      };
    }
  );

  // Define stress test scenarios for the selected year
  const stressScenarios = [
    {
      name: "Worst Case",
      description: "Maximum adverse changes in all variables",
      changes: `Volume: -${volumeVar}% Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: calculateStressScenario(selectedYear, -volumeVar, -greenVar, -blackVar)
    },
    {
      name: "Volume Stress",
      description: "Only volume decreases",
      changes: `Volume: -${volumeVar}%`,
      revenue: calculateStressScenario(selectedYear, -volumeVar, 0, 0)
    },
    {
      name: "Price Stress",
      description: "Only prices decrease",
      changes: `Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: calculateStressScenario(selectedYear, 0, -greenVar, -blackVar)
    },
    {
      name: "Green Price Stress",
      description: "Only green price decreases",
      changes: `Green: -${greenVar}%`,
      revenue: calculateStressScenario(selectedYear, 0, -greenVar, 0)
    },
    {
      name: "Black Price Stress",
      description: "Only black price decreases",
      changes: `Black: -${blackVar}%`,
      revenue: calculateStressScenario(selectedYear, 0, 0, -blackVar)
    }
  ];

  // Return all calculations needed by EarningsRiskAnalysis
  return {
    scenarios: stressScenarios,
    histogramData: createHistogramData(scenarios, selectedYear),
    waterfallData,
    metrics: {
      baseCase: baseCase,
      p50: p50Value,
      p10: p10Value,
      p90: p90Value,
      range: range,
      rangePercent: rangePercent,
      p10Percent: ((p10Value / baseCase - 1) * 100).toFixed(1),
      p90Percent: ((p90Value / baseCase - 1) * 100).toFixed(1)
    },
    StressTestResults: () => (
      <div className="space-y-1 text-sm">
        <div className="text-xs text-gray-500 mb-2">
          Impact of extreme scenarios on annual revenue for year {selectedYear}
        </div>
        {stressScenarios.map((scenario, index) => (
          <div key={index} className="flex justify-between items-baseline py-1 px-2 bg-gray-50 rounded">
            <div>
              <div className="font-medium">{scenario.name}</div>
              <div className="text-xs text-gray-500">{scenario.changes}</div>
            </div>
            <div className="text-right ml-4">
              <div className="font-medium">${(scenario.revenue).toFixed(1)}M</div>
              <div className="text-xs text-red-500">
                {((scenario.revenue / baseCase - 1) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  };
};

export default StressTestAnalysis;