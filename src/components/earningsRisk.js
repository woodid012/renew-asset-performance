import { calculateAssetRevenue } from './portfolioUtils.jsx';

export const generateScenarios = (assets, constants, getMerchantPrice) => {
  if (!assets || Object.keys(assets).length === 0) return [];
  
  const numScenarios = 1000;
  const scenarios = [];

  for (let i = 0; i < numScenarios; i++) {
    Object.values(assets).forEach(asset => {
      for (let year = constants.analysisStartYear; year <= constants.analysisEndYear; year++) {
        // Generate independent variations for each risk factor
        const volumeChange = (Math.random() * 2 - 1) * constants.volumeVariation;
        const greenPriceChange = (Math.random() * 2 - 1) * (constants.greenPriceVariation || constants.priceVariation); // Fallback for compatibility
        const blackPriceChange = (Math.random() * 2 - 1) * (constants.blackPriceVariation || constants.priceVariation); // Fallback for compatibility

        // Get base revenue components first
        const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        
        // Apply volume variation to both contracted and merchant
        const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
        const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
        
        // Apply volume and respective price variations to merchant components
        const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + greenPriceChange/100);
        const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + blackPriceChange/100);

        const totalRevenue = contractedGreen + contractedBlack + merchantGreen + merchantBlack;

        scenarios.push({
          asset: asset.name,
          year,
          volumeChange,
          greenPriceChange,
          blackPriceChange,
          revenue: totalRevenue,
          components: {
            contractedGreen,
            contractedBlack,
            merchantGreen,
            merchantBlack
          }
        });
      }
    });
  }

  // Add validation logging
  const yearData = scenarios.filter(s => s.year === constants.analysisStartYear);
  const baseCase = Object.values(assets).reduce((sum, asset) => {
    const baseRev = calculateAssetRevenue(asset, constants.analysisStartYear, constants, getMerchantPrice);
    return sum + baseRev.total;
  }, 0);
  
  const p50 = [...yearData].sort((a, b) => a.revenue - b.revenue)[Math.floor(yearData.length * 0.5)].revenue;
  console.log('Validation:', {
    baseCase,
    p50,
    difference: ((p50 - baseCase) / baseCase * 100).toFixed(2) + '%',
    numScenarios: yearData.length,
    variations: {
      volume: constants.volumeVariation,
      greenPrice: constants.greenPriceVariation || constants.priceVariation,
      blackPrice: constants.blackPriceVariation || constants.priceVariation
    }
  });

  return scenarios;
};

export const createHistogramData = (data, year) => {
  if (!data.length) return [];
  
  // Get all scenarios for the given year
  const yearData = data.filter(s => s.year === year);
  
  // Group by asset first
  const assetGroups = {};
  yearData.forEach(scenario => {
    if (!assetGroups[scenario.asset]) {
      assetGroups[scenario.asset] = [];
    }
    assetGroups[scenario.asset].push(scenario.revenue);
  });

  // Sum the revenues per scenario across all assets
  const combinedRevenues = [];
  const numScenarios = Object.values(assetGroups)[0].length;
  
  for (let i = 0; i < numScenarios; i++) {
    const totalRevenue = Object.values(assetGroups).reduce((sum, assetRevenues) => {
      return sum + assetRevenues[i];
    }, 0);
    combinedRevenues.push(totalRevenue);
  }

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

export const calculateStatistics = (data, year, assets, constants, getMerchantPrice) => {
  if (!data.length) {
    return {
      baseCase: 0,
      p90: 0,
      p50: 0,
      p10: 0,
      min: 0,
      max: 0,
      p90Changes: { volume: 0, greenPrice: 0, blackPrice: 0 },
      p50Changes: { volume: 0, greenPrice: 0, blackPrice: 0 },
      p10Changes: { volume: 0, greenPrice: 0, blackPrice: 0 }
    };
  }

  // Get all scenarios for the given year and calculate total portfolio revenue
  const yearData = data.filter(s => s.year === year);
  
  // Group by asset first
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

  // Sum the revenues per scenario across all assets
  const combinedScenarios = [];
  const numScenarios = Object.values(assetGroups)[0].length;
  
  for (let i = 0; i < numScenarios; i++) {
    const totalRevenue = Object.values(assetGroups).reduce((sum, assetScenarios) => {
      return sum + assetScenarios[i].revenue;
    }, 0);

    // Average the changes across assets for this scenario
    const avgChanges = Object.values(assetGroups).reduce((changes, assetScenarios) => {
      changes.volume += assetScenarios[i].changes.volume;
      changes.greenPrice += assetScenarios[i].changes.greenPrice;
      changes.blackPrice += assetScenarios[i].changes.blackPrice;
      return changes;
    }, { volume: 0, greenPrice: 0, blackPrice: 0 });

    const numAssets = Object.keys(assetGroups).length;
    combinedScenarios.push({
      revenue: totalRevenue,
      changes: {
        volume: avgChanges.volume / numAssets,
        greenPrice: avgChanges.greenPrice / numAssets,
        blackPrice: avgChanges.blackPrice / numAssets
      }
    });
  }

  // Sort scenarios by revenue for percentile calculations
  combinedScenarios.sort((a, b) => a.revenue - b.revenue);

  // Calculate base case
  const baseCase = Object.values(assets).reduce((sum, asset) => {
    const baseRev = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
    return sum + baseRev.total;
  }, 0);

  // Find index for each percentile
  const p90Index = Math.floor(combinedScenarios.length * 0.1);
  const p50Index = Math.floor(combinedScenarios.length * 0.5);
  const p10Index = Math.floor(combinedScenarios.length * 0.9);

  return {
    baseCase: baseCase,
    p90: combinedScenarios[p90Index].revenue,
    p50: combinedScenarios[p50Index].revenue,
    p10: combinedScenarios[p10Index].revenue,
    min: combinedScenarios[0].revenue,
    max: combinedScenarios[combinedScenarios.length - 1].revenue,
    p90Changes: combinedScenarios[p90Index].changes,
    p50Changes: combinedScenarios[p50Index].changes,
    p10Changes: combinedScenarios[p10Index].changes
  };
};