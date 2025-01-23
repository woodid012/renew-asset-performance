// useEarAnalysis.jsx
import { useState, useCallback, useMemo } from 'react';
import { calculateAssetRevenue } from './RevCalculations.jsx';

// Helper function to calculate revenue with variations for storage vs non-storage assets
const calculateVariedRevenue = (asset, baseRevenue, volumeChange, greenPriceChange, blackPriceChange) => {
  if (asset.type === 'storage') {
    // For storage assets, only apply volume change to contracted revenue
    // and both volume and black price change to merchant revenue
    const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
    const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + (blackPriceChange || 0)/100);
    
    return contractedBlack + merchantBlack;
  } else {
    // For non-storage assets, handle both green and black components
    const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
    const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
    
    // Apply price changes only to merchant components
    const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + (greenPriceChange || 0)/100);
    const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + (blackPriceChange || 0)/100);
    
    return contractedGreen + contractedBlack + merchantGreen + merchantBlack;
  }
};

// Calculate portfolio revenue for a specific scenario
const calculatePortfolioRevenue = (assets, year, constants, getMerchantPrice, volumeChange = 0, greenPriceChange = 0, blackPriceChange = 0) => {
  return Object.values(assets).reduce((total, asset) => {
    const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
    return total + calculateVariedRevenue(asset, baseRevenue, volumeChange, greenPriceChange, blackPriceChange);
  }, 0);
};

export const useEarAnalysis = (assets, constants, getMerchantPrice, timePeriods = null) => {
  const [scenarios, setScenarios] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Function to get variations for a specific year
  const getVariationsForYear = useCallback((year) => {
    if (!timePeriods) {
      // Simple mode - use constant variations
      return {
        volumeVariation: constants.volumeVariation,
        greenPriceVariation: constants.greenPriceVariation,
        blackPriceVariation: constants.blackPriceVariation
      };
    }

    // Complex mode - find matching time period
    const period = timePeriods.find(p => year >= p.startYear && year <= p.endYear);
    if (!period) {
      throw new Error(`No variation defined for year ${year}`);
    }

    return {
      volumeVariation: period.volumeVariation,
      greenPriceVariation: period.greenPriceVariation,
      blackPriceVariation: period.blackPriceVariation
    };
  }, [timePeriods, constants]);

  // Modified scenario generation for time periods with storage handling
  const generateTimeBasedScenarios = useCallback(() => {
    if (!assets || Object.keys(assets).length === 0) return [];
    
    const numScenarios = 1000;
    const scenarios = [];

    for (let i = 0; i < numScenarios; i++) {
      Object.values(assets).forEach(asset => {
        for (let year = constants.analysisStartYear; year <= constants.analysisEndYear; year++) {
          try {
            const variations = getVariationsForYear(year);
            
            // Generate variations - handle case where variations might be 0
            const volumeChange = variations.volumeVariation ? 
              (Math.random() * 2 - 1) * variations.volumeVariation : 0;
            
            // For storage assets, only generate black price change
            const greenPriceChange = asset.type === 'storage' ? 0 :
              (variations.greenPriceVariation ? (Math.random() * 2 - 1) * variations.greenPriceVariation : 0);
            
            const blackPriceChange = variations.blackPriceVariation ? 
              (Math.random() * 2 - 1) * variations.blackPriceVariation : 0;

            // Get base revenue components
            const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
            const revenue = calculateVariedRevenue(asset, baseRevenue, volumeChange, greenPriceChange, blackPriceChange);

            scenarios.push({
              asset: asset.name,
              year,
              volumeChange,
              greenPriceChange,
              blackPriceChange,
              revenue,
              baseRevenue: baseRevenue.total,
              isStorage: asset.type === 'storage'
            });
          } catch (err) {
            console.error(`Error generating scenario for year ${year}:`, err);
            throw err;
          }
        }
      });
    }

    return scenarios;
  }, [assets, constants, getMerchantPrice, getVariationsForYear]);

  // Create histogram data from scenarios
  const createHistogramData = useCallback((data, year) => {
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
  }, []);

  // Calculate metrics for a specific year with storage handling
  const calculateYearlyMetrics = useCallback((data, year) => {
    if (!data.length) return null;

    // Get variations for the specific year
    const variations = getVariationsForYear(year);

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
        baseRevenue: scenario.baseRevenue,
        changes: {
          volume: scenario.volumeChange,
          greenPrice: scenario.greenPriceChange,
          blackPrice: scenario.blackPriceChange
        },
        isStorage: scenario.isStorage
      });
    });

    // Calculate combined scenarios
    const combinedScenarios = Array(Object.values(assetGroups)[0].length).fill(0)
      .map((_, i) => {
        const totalRevenue = Object.values(assetGroups)
          .reduce((sum, assetScenarios) => sum + assetScenarios[i].revenue, 0);

        const baseRevenue = Object.values(assetGroups)
          .reduce((sum, assetScenarios) => sum + assetScenarios[i].baseRevenue, 0);

        const avgChanges = Object.values(assetGroups).reduce((changes, assetScenarios) => {
          if (assetScenarios[i].isStorage) {
            // For storage assets, only accumulate volume and black price changes
            changes.volume += assetScenarios[i].changes.volume;
            changes.blackPrice += assetScenarios[i].changes.blackPrice;
          } else {
            // For non-storage assets, accumulate all changes
            changes.volume += assetScenarios[i].changes.volume;
            changes.greenPrice += assetScenarios[i].changes.greenPrice;
            changes.blackPrice += assetScenarios[i].changes.blackPrice;
          }
          return changes;
        }, { volume: 0, greenPrice: 0, blackPrice: 0 });

        const numAssets = Object.keys(assetGroups).length;
        return {
          revenue: totalRevenue,
          baseRevenue,
          changes: {
            volume: avgChanges.volume / numAssets,
            greenPrice: avgChanges.greenPrice / numAssets,
            blackPrice: avgChanges.blackPrice / numAssets
          }
        };
      });

    // Sort scenarios for percentile calculations
    combinedScenarios.sort((a, b) => a.revenue - b.revenue);

    const baseCase = calculatePortfolioRevenue(assets, year, constants, getMerchantPrice);
    const p90Index = Math.floor(combinedScenarios.length * 0.1);
    const p50Index = Math.floor(combinedScenarios.length * 0.5);
    const p10Index = Math.floor(combinedScenarios.length * 0.9);

    // Check asset types in portfolio
    const hasNonStorageAssets = Object.values(assets).some(asset => asset.type !== 'storage');
    const hasStorageAssets = Object.values(assets).some(asset => asset.type === 'storage');

    // Calculate stress test scenarios
    const stressTests = {
      worstCase: calculatePortfolioRevenue(
        assets, year, constants, getMerchantPrice,
        -variations.volumeVariation,
        -variations.greenPriceVariation,
        -variations.blackPriceVariation
      ),
      volumeStress: calculatePortfolioRevenue(
        assets, year, constants, getMerchantPrice,
        -variations.volumeVariation, 0, 0
      ),
      priceStress: calculatePortfolioRevenue(
        assets, year, constants, getMerchantPrice,
        0, -variations.greenPriceVariation, -variations.blackPriceVariation
      ),
    };

    const stressTestDescriptions = [
      {
        name: "Worst Case",
        description: "Maximum adverse changes in all variables",
        changes: `Volume: -${variations.volumeVariation}% ${hasNonStorageAssets ? `Green: -${variations.greenPriceVariation}% ` : ''}Black: -${variations.blackPriceVariation}%`,
        revenue: stressTests.worstCase
      },
      {
        name: "Volume Stress",
        description: "Only volume decreases",
        changes: `Volume: -${variations.volumeVariation}%`,
        revenue: stressTests.volumeStress
      }
    ];

    if (hasNonStorageAssets) {
      stressTestDescriptions.push({
        name: "Green Price Stress",
        description: "Only green price decreases",
        changes: `Green: -${variations.greenPriceVariation}%`,
        revenue: calculatePortfolioRevenue(
          assets, year, constants, getMerchantPrice,
          0, -variations.greenPriceVariation, 0
        )
      });
    }

    stressTestDescriptions.push({
      name: "Black Price Stress",
      description: "Only black price decreases",
      changes: `Black: -${variations.blackPriceVariation}%`,
      revenue: calculatePortfolioRevenue(
        assets, year, constants, getMerchantPrice,
        0, 0, -variations.blackPriceVariation
      )
    });

    // Calculate percentages relative to base case
    const p10Percent = ((combinedScenarios[p10Index].revenue - baseCase) / baseCase * 100).toFixed(1);
    const p90Percent = ((combinedScenarios[p90Index].revenue - baseCase) / baseCase * 100).toFixed(1);
    const range = combinedScenarios[p10Index].revenue - combinedScenarios[p90Index].revenue;
    const rangePercent = ((range / baseCase) * 100).toFixed(1);

    return {
      baseCase,
      p90: combinedScenarios[p90Index].revenue,
      p50: combinedScenarios[p50Index].revenue,
      p10: combinedScenarios[p10Index].revenue,
      range,
      p10Percent,
      p90Percent,
      rangePercent,
      stressTests,
      stressTestDescriptions
    };
  }, [assets, constants, getMerchantPrice, getVariationsForYear]);

  // Calculate scenarios when inputs change
  useMemo(() => {
    const calculate = async () => {
      setIsCalculating(true);
      setError(null);
      try {
        const newScenarios = generateTimeBasedScenarios();
        setScenarios(newScenarios);
      } catch (err) {
        setError(err.message);
        setScenarios([]);
      } finally {
        setIsCalculating(false);
      }
    };

    calculate();
  }, [generateTimeBasedScenarios]);

  // Function to get analysis for a specific year
  const getYearlyAnalysis = useCallback((year) => {
    if (!scenarios.length) return null;

    try {
      return {
        histogram: createHistogramData(scenarios, year),
        metrics: calculateYearlyMetrics(scenarios, year)
      };
    } catch (err) {
      console.error(`Error calculating yearly analysis for ${year}:`, err);
      return null;
    }
  }, [scenarios, createHistogramData, calculateYearlyMetrics]);

  return {
    getYearlyAnalysis,
    isCalculating,
    error,
    hasScenarios: scenarios.length > 0,
  };
};

// Helper function to validate time periods
export const validateTimePeriods = (periods, startYear, endYear) => {
  if (!periods || periods.length === 0) {
    return { valid: false, error: 'No time periods defined' };
  }



  // Sort periods by start year
  const sortedPeriods = [...periods].sort((a, b) => a.startYear - b.startYear);

  // Check first and last years
  if (sortedPeriods[0].startYear > startYear) {
    return { valid: false, error: 'Gap at start of analysis period' };
  }
  if (sortedPeriods[sortedPeriods.length - 1].endYear < endYear) {
    return { valid: false, error: 'Gap at end of analysis period' };
  }

  // Check for gaps and overlaps
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const currentPeriod = sortedPeriods[i];
    const nextPeriod = sortedPeriods[i + 1];

    if (currentPeriod.endYear + 1 !== nextPeriod.startYear) {
      return { 
        valid: false, 
        error: `Gap or overlap between years ${currentPeriod.endYear} and ${nextPeriod.startYear}`
      };
    }
  }

  return { valid: true, error: null };
};