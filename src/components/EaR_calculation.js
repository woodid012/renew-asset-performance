import { calculateAssetRevenue } from './RevCalculations.jsx';

// Helper function to calculate revenue with variations
const calculateVariedRevenue = (baseRevenue, volumeChange, greenPriceChange, blackPriceChange) => {
  // Always apply volume change
  const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
  const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
  
  // Apply price changes only to merchant components
  const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + (greenPriceChange || 0)/100);
  const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + (blackPriceChange || 0)/100);
  
  return contractedGreen + contractedBlack + merchantGreen + merchantBlack;
};

// Calculate portfolio revenue for a specific scenario
const calculatePortfolioRevenue = (assets, year, constants, getMerchantPrice, volumeChange = 0, greenPriceChange = 0, blackPriceChange = 0) => {
  return Object.values(assets).reduce((total, asset) => {
    const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
    return total + calculateVariedRevenue(baseRevenue, volumeChange, greenPriceChange, blackPriceChange);
  }, 0);
};

export const generateScenarios = (assets, constants, getMerchantPrice) => {
  if (!assets || Object.keys(assets).length === 0) return [];
  
  const numScenarios = 1000;
  const scenarios = [];

  for (let i = 0; i < numScenarios; i++) {
    Object.values(assets).forEach(asset => {
      for (let year = constants.analysisStartYear; year <= constants.analysisEndYear; year++) {
        // Generate variations - handle case where variations might be 0
        const volumeChange = constants.volumeVariation ? 
          (Math.random() * 2 - 1) * constants.volumeVariation : 0;
        
        const greenPriceChange = constants.greenPriceVariation ? 
          (Math.random() * 2 - 1) * constants.greenPriceVariation : 0;
        
        const blackPriceChange = constants.blackPriceVariation ? 
          (Math.random() * 2 - 1) * constants.blackPriceVariation : 0;

        // Get base revenue components
        const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        const revenue = calculateVariedRevenue(baseRevenue, volumeChange, greenPriceChange, blackPriceChange);

        scenarios.push({
          asset: asset.name,
          year,
          volumeChange,
          greenPriceChange,
          blackPriceChange,
          revenue,
          baseRevenue: baseRevenue.total
        });
      }
    });
  }

  return scenarios;
};

export const createHistogramData = (data, year) => {
  if (!data.length) return [];
  
  // Get all scenarios for the given year
  const yearData = data.filter(s => s.year === year);
  
  // Group by asset and sum revenues
  const assetGroups = {};
  yearData.forEach(scenario => {
    if (!assetGroups[scenario.asset]) {
      assetGroups[scenario.asset] = [];
    }
    assetGroups[scenario.asset].push(scenario.revenue);
  });

  // Sum revenues across assets for each scenario
  const combinedRevenues = Array(Object.values(assetGroups)[0].length).fill(0)
    .map((_, i) => Object.values(assetGroups)
      .reduce((sum, assetRevenues) => sum + assetRevenues[i], 0));

  // Create histogram bins
  const min = Math.min(...combinedRevenues);
  const max = Math.max(...combinedRevenues);
  const binCount = 20;
  const binWidth = (max - min) / binCount;
  
  const bins = Array(binCount).fill(0);
  combinedRevenues.forEach(rev => {
    const binIndex = Math.min(Math.floor((rev - min) / binWidth), binCount - 1);
    bins[binIndex]++;
  });

  return Array(binCount).fill(0).map((_, index) => ({
    revenue: (min + (index + 0.5) * binWidth).toFixed(1),
    frequency: bins[index],
    binStart: (min + index * binWidth).toFixed(1),
    binEnd: (min + (index + 1) * binWidth).toFixed(1)
  }));
};

export const calculateYearlyMetrics = (data, year, assets, constants, getMerchantPrice) => {
  if (!data.length) return null;

  // Get all scenarios for the given year
  const yearData = data.filter(s => s.year === year);
  
  // Group by asset and combine scenarios
  const assetGroups = {};
  yearData.forEach(scenario => {
    if (!assetGroups[scenario.asset]) {
      assetGroups[scenario.asset] = [];
    }
    assetGroups[scenario.asset].push({
      revenue: scenario.revenue,
      changes: {
        volume: scenario.volumeChange,
        greenPrice: scenario.greenPriceChange,
        blackPrice: scenario.blackPriceChange
      }
    });
  });

  // Calculate combined scenarios
  const combinedScenarios = Array(Object.values(assetGroups)[0].length).fill(0)
    .map((_, i) => {
      const totalRevenue = Object.values(assetGroups)
        .reduce((sum, assetScenarios) => sum + assetScenarios[i].revenue, 0);

      const avgChanges = Object.values(assetGroups).reduce((changes, assetScenarios) => {
        changes.volume += assetScenarios[i].changes.volume;
        changes.greenPrice += assetScenarios[i].changes.greenPrice;
        changes.blackPrice += assetScenarios[i].changes.blackPrice;
        return changes;
      }, { volume: 0, greenPrice: 0, blackPrice: 0 });

      const numAssets = Object.keys(assetGroups).length;
      return {
        revenue: totalRevenue,
        changes: {
          volume: avgChanges.volume / numAssets,
          greenPrice: avgChanges.greenPrice / numAssets,
          blackPrice: avgChanges.blackPrice / numAssets
        }
      };
    });

  // Sort scenarios for percentile calculations
  combinedScenarios.sort((a, b) => a.revenue - b.revenue);

  // Calculate variations for stress tests
  const volumeVar = constants.volumeVariation || 0;
  const greenVar = constants.greenPriceVariation || constants.priceVariation || 0;
  const blackVar = constants.blackPriceVariation || constants.priceVariation || 0;

  const baseCase = calculatePortfolioRevenue(assets, year, constants, getMerchantPrice);
  const p90Index = Math.floor(combinedScenarios.length * 0.1);
  const p50Index = Math.floor(combinedScenarios.length * 0.5);
  const p10Index = Math.floor(combinedScenarios.length * 0.9);

  // Calculate stress test scenarios
  const stressTests = {
    worstCase: calculatePortfolioRevenue(assets, year, constants, getMerchantPrice, -volumeVar, -greenVar, -blackVar),
    volumeStress: calculatePortfolioRevenue(assets, year, constants, getMerchantPrice, -volumeVar, 0, 0),
    priceStress: calculatePortfolioRevenue(assets, year, constants, getMerchantPrice, 0, -greenVar, -blackVar),
    greenPriceStress: calculatePortfolioRevenue(assets, year, constants, getMerchantPrice, 0, -greenVar, 0),
    blackPriceStress: calculatePortfolioRevenue(assets, year, constants, getMerchantPrice, 0, 0, -blackVar)
  };

  const stressTestDescriptions = [
    {
      name: "Worst Case",
      description: "Maximum adverse changes in all variables",
      changes: `Volume: -${volumeVar}% Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: stressTests.worstCase
    },
    {
      name: "Volume Stress",
      description: "Only volume decreases",
      changes: `Volume: -${volumeVar}%`,
      revenue: stressTests.volumeStress
    },
    {
      name: "Price Stress",
      description: "Only prices decrease",
      changes: `Green: -${greenVar}% Black: -${blackVar}%`,
      revenue: stressTests.priceStress
    },
    {
      name: "Green Price Stress",
      description: "Only green price decreases",
      changes: `Green: -${greenVar}%`,
      revenue: stressTests.greenPriceStress
    },
    {
      name: "Black Price Stress",
      description: "Only black price decreases",
      changes: `Black: -${blackVar}%`,
      revenue: stressTests.blackPriceStress
    }
  ];

  // Calculate percentages relative to base case
  const p10Percent = ((combinedScenarios[p10Index].revenue - baseCase) / baseCase * 100).toFixed(1);
  const p90Percent = ((combinedScenarios[p90Index].revenue - baseCase) / baseCase * 100).toFixed(1);
  const range = combinedScenarios[p10Index].revenue - combinedScenarios[p90Index].revenue;
  const rangePercent = ((range / baseCase) * 100).toFixed(1);

  return {
    // Monte Carlo statistics
    baseCase,
    p90: combinedScenarios[p90Index].revenue,
    p50: combinedScenarios[p50Index].revenue,
    p10: combinedScenarios[p10Index].revenue,
    min: combinedScenarios[0].revenue,
    max: combinedScenarios[combinedScenarios.length - 1].revenue,
    range,
    p90Changes: combinedScenarios[p90Index].changes,
    p50Changes: combinedScenarios[p50Index].changes,
    p10Changes: combinedScenarios[p10Index].changes,
    
    // Percentage changes
    p10Percent,
    p90Percent,
    rangePercent,
    
    // Stress test results
    stressTests,
    stressTestDescriptions,
    
    // Variation parameters
    variations: {
      volume: volumeVar,
      greenPrice: greenVar,
      blackPrice: blackVar
    }
  };
};