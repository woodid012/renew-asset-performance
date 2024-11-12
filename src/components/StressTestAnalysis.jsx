import React from 'react';
import { calculateAssetRevenue } from './portfolioUtils.jsx';

const StressTestAnalysis = ({ assets, constants, getMerchantPrice, selectedYear }) => {
  if (!assets || Object.keys(assets).length === 0) return null;

  const calculateStressScenario = (volumeChange, greenPriceChange, blackPriceChange) => {
    return Object.values(assets).reduce((total, asset) => {
      const baseRevenue = calculateAssetRevenue(asset, selectedYear, constants, getMerchantPrice);
      const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
      const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
      const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + greenPriceChange/100);
      const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + blackPriceChange/100);
      return total + contractedGreen + contractedBlack + merchantGreen + merchantBlack;
    }, 0);
  };

  // Calculate base case for comparison
  const baseCase = Object.values(assets).reduce((sum, asset) => {
    const baseRev = calculateAssetRevenue(asset, selectedYear, constants, getMerchantPrice);
    return sum + baseRev.total;
  }, 0);

  const volumeVar = constants.volumeVariation || 0;
  const greenVar = constants.greenPriceVariation || constants.priceVariation || 0;
  const blackVar = constants.blackPriceVariation || constants.priceVariation || 0;

  // Define scenarios
  const scenarios = [
    {
      name: "Worst Case",
      description: "Maximum adverse changes in all variables",
      changes: `Volume: -${volumeVar}% Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: calculateStressScenario(-volumeVar, -greenVar, -blackVar)
    },
    {
      name: "Volume Stress",
      description: "Only volume decreases",
      changes: `Volume: -${volumeVar}%`,
      revenue: calculateStressScenario(-volumeVar, 0, 0)
    },
    {
      name: "Price Stress",
      description: "Only prices decrease",
      changes: `Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: calculateStressScenario(0, -greenVar, -blackVar)
    },
    {
      name: "Green Price Stress",
      description: "Only green price decreases",
      changes: `Green: -${greenVar}%`,
      revenue: calculateStressScenario(0, -greenVar, 0)
    },
    {
      name: "Black Price Stress",
      description: "Only black price decreases",
      changes: `Black: -${blackVar}%`,
      revenue: calculateStressScenario(0, 0, -blackVar)
    }
  ];

  return (
    <div className="space-y-1 text-sm">
      <div className="text-xs text-gray-500 mb-2">
        Impact of extreme scenarios on annual revenue for year {selectedYear}
      </div>
      {scenarios.map((scenario, index) => (
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
  );
};

export default StressTestAnalysis;