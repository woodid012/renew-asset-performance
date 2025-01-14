export const calculateStorageRevenue = (asset, timeInterval, year, assetStartYear) => {
  const volume = parseFloat(asset.volume) || 0;  // This is MWh of storage
  const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment) || 95;
  const DAYS_IN_YEAR = 365;

  // Calculate period-adjusted values
  let periodAdjustment = 1; // Default for yearly
  if (timeInterval.includes('-Q')) {
    periodAdjustment = 0.25; // Quarter is 1/4 of a year
  } else if (timeInterval.includes('/')) {
    periodAdjustment = 1/12; // Month is 1/12 of a year
  }

  // Calculate degradation
  const yearsSinceStart = year - assetStartYear;
  const degradation = parseFloat(asset.annualDegradation) || 0;
  const degradationFactor = Math.pow(1 - degradation/100, yearsSinceStart);

  // Process active contracts
  const activeContracts = asset.contracts.filter(contract => {
    const startYear = new Date(contract.startDate).getFullYear();
    const endYear = new Date(contract.endDate).getFullYear();
    return year >= startYear && year <= endYear;
  });

  let contractedRevenue = 0;
  let totalContractedPercentage = 0;

  activeContracts.forEach(contract => {
    const buyersPercentage = parseFloat(contract.buyersPercentage) || 0;
    const years = year - new Date(contract.startDate).getFullYear();
    const indexation = parseFloat(contract.indexation) || 0;
    const indexationFactor = Math.pow(1 + indexation/100, years);

    if (contract.type === 'fixed') {
      // Fixed Revenue contract - directly use the annual revenue in $M
      // For fixed revenue, ignore buyers percentage as it's a fixed amount
      const annualRevenue = parseFloat(contract.strikePrice) || 0;
      contractedRevenue += (annualRevenue * indexationFactor * periodAdjustment * degradationFactor);
      totalContractedPercentage += buyersPercentage;
    } else if (contract.type === 'cfd') {
      // CfD contract - use price spread and volume
      const priceSpread = parseFloat(contract.strikePrice) || 0;
      const adjustedSpread = priceSpread * indexationFactor;
      
      // Simple calculation: volume * 1 cycle per day * 365 days * spread
      const revenue = volume * 1 * DAYS_IN_YEAR * adjustedSpread * degradationFactor * (volumeLossAdjustment/100) * (buyersPercentage/100);
      contractedRevenue += revenue / 1000000; // Convert to $M
      totalContractedPercentage += buyersPercentage;
    }
  });

  // Calculate merchant revenue if any uncontracted percentage
  const merchantPercentage = Math.max(0, 100 - totalContractedPercentage);
  let merchantRevenue = 0;
  
  if (merchantPercentage > 0) {
    // Using hardcoded $150 spread for merchant
    const priceSpread = 150;
    
    // Same calculation as CfD but with days not hours
    const revenue = volume * 1 * DAYS_IN_YEAR * priceSpread * degradationFactor * (volumeLossAdjustment/100) * (merchantPercentage/100);
    merchantRevenue = revenue / 1000000; // Convert to $M
  }

  return {
    total: contractedRevenue + merchantRevenue,
    contractedGreen: 0,
    contractedBlack: contractedRevenue,
    merchantGreen: 0,
    merchantBlack: merchantRevenue,
    greenPercentage: 0,
    blackPercentage: totalContractedPercentage,
    annualGeneration: volume * DAYS_IN_YEAR * degradationFactor * (volumeLossAdjustment/100)
  };
};