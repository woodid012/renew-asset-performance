import { calculateAssetRevenue } from './RevCalculations';

export const DEFAULT_COSTS = {
  solar: {
    fixedCostBase: 10.0,    // Base fixed cost for a 100MW solar farm
    fixedCostScale: 0.75,   // Scale factor (less than 1 for economies of scale)
    variableCost: 0.015,    // $0.015M per MW
    terminalValue: 15,      // $15M default terminal value for 100MW
  },
  wind: {
    fixedCostBase: 10.0,    // Base fixed cost for a 100MW wind farm
    fixedCostScale: 0.75,   // Scale factor
    variableCost: 0.02,     // $0.02M per MW
    terminalValue: 20,      // $20M default terminal value for 100MW
  },
  battery: {
    fixedCostBase: 10.0,    // Base fixed cost for a 100MW battery
    fixedCostScale: 0.75,   // Scale factor
    variableCost: 0.01,     // $0.01M per MW
    terminalValue: 10,      // $10M default terminal value for 100MW
  },
  default: {
    fixedCostBase: 10.0,    // Base fixed cost for a 100MW asset
    fixedCostScale: 0.75,   // Scale factor
    variableCost: 0.015,    // $0.015M per MW
    terminalValue: 15,      // $15M default terminal value for 100MW
  }
};

export const DEFAULT_VALUES = {
  discountRates: {
    contract: 0.08,
    merchant: 0.10,
  },
  costEscalation: 2.5,
  baseCapacity: 100  // Reference capacity for base costs (MW)
};

export const calculateStressRevenue = (baseRevenue, scenario, constants) => {
  const volumeVar = constants.volumeVariation || 0;
  const greenVar = constants.greenPriceVariation || 0;
  const blackVar = constants.blackPriceVariation || 0;

  switch (scenario) {
    case 'worst':
      return {
        ...baseRevenue,
        merchantGreen: baseRevenue.merchantGreen * (1 - volumeVar/100) * (1 - greenVar/100),
        merchantBlack: baseRevenue.merchantBlack * (1 - volumeVar/100) * (1 - blackVar/100),
        contractedGreen: baseRevenue.contractedGreen * (1 - volumeVar/100),
        contractedBlack: baseRevenue.contractedBlack * (1 - volumeVar/100),
      };
    case 'volume':
      return {
        ...baseRevenue,
        merchantGreen: baseRevenue.merchantGreen * (1 - volumeVar/100),
        merchantBlack: baseRevenue.merchantBlack * (1 - volumeVar/100),
        contractedGreen: baseRevenue.contractedGreen * (1 - volumeVar/100),
        contractedBlack: baseRevenue.contractedBlack * (1 - volumeVar/100),
      };
    case 'price':
      return {
        ...baseRevenue,
        merchantGreen: baseRevenue.merchantGreen * (1 - greenVar/100),
        merchantBlack: baseRevenue.merchantBlack * (1 - blackVar/100),
        contractedGreen: baseRevenue.contractedGreen,
        contractedBlack: baseRevenue.contractedBlack,
      };
    default:
      return baseRevenue;
  }
};

export const calculateFixedCost = (baseFixedCost, capacity, baseCapacity, scaleFactor) => {
  // Scale fixed costs using power law with scale factor
  return baseFixedCost * Math.pow(capacity / baseCapacity, scaleFactor);
};

export const initializeAssetCosts = (assets) => {
  return Object.values(assets).reduce((acc, asset) => {
    const defaultCosts = DEFAULT_COSTS[asset.type] || DEFAULT_COSTS.default;
    const scaledFixedCost = calculateFixedCost(
      defaultCosts.fixedCostBase,
      asset.capacity,
      DEFAULT_VALUES.baseCapacity,
      defaultCosts.fixedCostScale
    );

    return {
      ...acc,
      [asset.name]: {
        fixedCost: Number(scaledFixedCost.toFixed(2)),
        fixedCostIndex: Number(DEFAULT_VALUES.costEscalation.toFixed(2)),
        variableCost: Number(defaultCosts.variableCost.toFixed(3)),
        variableCostIndex: Number(DEFAULT_VALUES.costEscalation.toFixed(2)),
        terminalValue: Number((defaultCosts.terminalValue * 
                      (asset.capacity / DEFAULT_VALUES.baseCapacity)).toFixed(2))
      }
    };
  }, {});
};

export const calculateNPVData = (
  assets,
  assetCosts,
  discountRates,
  constants,
  getMerchantPrice,
  selectedRevenueCase,
  selectedAsset = 'Total'
) => {
  const npvData = Array.from({ length: 30 }, (_, yearIndex) => {
    let totalContractRevenue = 0;
    let totalMerchantRevenue = 0;
    let totalFixedCosts = 0;
    let totalVariableCosts = 0;
    let totalTerminalValue = 0;
    
    // Filter assets based on selection
    const filteredAssets = selectedAsset === 'Total' 
      ? Object.values(assets)
      : Object.values(assets).filter(asset => asset.name === selectedAsset);
    
    const year = yearIndex + constants.analysisStartYear;

    filteredAssets.forEach(asset => {
      // Check if asset has started operations
      const assetStartYear = new Date(asset.assetStartDate).getFullYear();
      if (year >= assetStartYear) {
        const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        const stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
        
        totalContractRevenue += stressedRevenue.contractedGreen + stressedRevenue.contractedBlack;
        totalMerchantRevenue += stressedRevenue.merchantGreen + stressedRevenue.merchantBlack;

        const fixedCostInflation = Math.pow(1 + (assetCosts[asset.name]?.fixedCostIndex || 2.5)/100, yearIndex);
        const variableCostInflation = Math.pow(1 + (assetCosts[asset.name]?.variableCostIndex || 2.5)/100, yearIndex);
        
        totalFixedCosts += (assetCosts[asset.name]?.fixedCost || 0) * fixedCostInflation;
        totalVariableCosts += (assetCosts[asset.name]?.variableCost || 0) * asset.capacity * variableCostInflation;
        
        // Add terminal value in final year
        if (yearIndex === 29) {
          totalTerminalValue += (assetCosts[asset.name]?.terminalValue || 0);
        }
      }
    });

    const totalCosts = totalFixedCosts + totalVariableCosts;
    const totalRevenue = totalContractRevenue + totalMerchantRevenue;
    const netCashFlow = totalRevenue - totalCosts;
    
    // Calculate weighted discount rate
    const contractWeight = totalRevenue ? totalContractRevenue / totalRevenue : 0.5;
    const merchantWeight = totalRevenue ? totalMerchantRevenue / totalRevenue : 0.5;
    const weightedDiscountRate = (discountRates.contract * contractWeight) + 
                               (discountRates.merchant * merchantWeight);
    
    const presentValue = (netCashFlow + totalTerminalValue) / Math.pow(1 + weightedDiscountRate, yearIndex + 1);

    return {
      year: yearIndex + 1,
      contractRevenue: totalContractRevenue,
      merchantRevenue: totalMerchantRevenue,
      totalRevenue,
      fixedCosts: totalFixedCosts,
      variableCosts: totalVariableCosts,
      totalCosts,
      terminalValue: totalTerminalValue,
      netCashFlow,
      presentValue
    };
  });

  const totalNPV = npvData.reduce((sum, year) => sum + year.presentValue, 0);

  return { npvData, totalNPV };
};