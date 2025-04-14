import { applyEscalation } from './RevCalculations';

export const calculateStorageRevenue = (asset, timeInterval, year, assetStartYear, getMerchantPrice, constants) => {
  const dailyVolume = parseFloat(asset.volume) || 0;
  const annualVolume = dailyVolume * 365;
  const capacity = parseFloat(asset.capacity) || 0;
  const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment) || 95;
  const DAYS_IN_YEAR = 365;
  const HOURS_IN_YEAR = 8760;
 
  let periodAdjustment = 1;
  if (timeInterval.includes('-Q')) {
    periodAdjustment = 0.25; 
  } else if (timeInterval.includes('/')) {
    periodAdjustment = 1/12; 
  }
 
  const yearsSinceStart = year - assetStartYear;
  const degradation = parseFloat(asset.annualDegradation) || 0;
  const degradationFactor = Math.pow(1 - degradation/100, yearsSinceStart);
 
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
      const annualRevenue = parseFloat(contract.strikePrice) || 0;
      contractedRevenue += (annualRevenue * indexationFactor * periodAdjustment * degradationFactor);
      totalContractedPercentage += buyersPercentage;
    } else if (contract.type === 'cfd') {
      const priceSpread = parseFloat(contract.strikePrice) || 0;
      const adjustedSpread = priceSpread * indexationFactor;
      
      const revenue = dailyVolume * 1 * DAYS_IN_YEAR * adjustedSpread * degradationFactor * (volumeLossAdjustment/100) * (buyersPercentage/100);
      contractedRevenue += revenue / 1000000;
      totalContractedPercentage += buyersPercentage;
    } else if (contract.type === 'tolling') {
      const hourlyRate = parseFloat(contract.strikePrice) || 0;
      const adjustedRate = hourlyRate * indexationFactor;
      
      const revenue = capacity * HOURS_IN_YEAR * adjustedRate;
      contractedRevenue += (revenue / 1000000) * periodAdjustment;
      totalContractedPercentage += buyersPercentage;
    }
  });
 
  const merchantPercentage = Math.max(0, 100 - totalContractedPercentage);
  let merchantRevenue = 0;
  
  if (merchantPercentage > 0) {
    
    const calculatedDuration = dailyVolume / capacity;
    const standardDurations = [0.5, 1, 2, 4];
    
    // Find the two closest durations for interpolation
    let lowerDuration = standardDurations[0];
    let upperDuration = standardDurations[standardDurations.length - 1];
    let interpolationRatio = 0.5;
    
    for (let i = 0; i < standardDurations.length - 1; i++) {
      if (calculatedDuration >= standardDurations[i] && calculatedDuration <= standardDurations[i + 1]) {
        lowerDuration = standardDurations[i];
        upperDuration = standardDurations[i + 1];
        interpolationRatio = (calculatedDuration - lowerDuration) / (upperDuration - lowerDuration);
        break;
      }
    }

    // Get standard duration prices and apply escalation
    const lowerPrice = getMerchantPrice('storage', lowerDuration, asset.state, year);
    const upperPrice = getMerchantPrice('storage', upperDuration, asset.state, year);
    
    // Apply escalation to both prices before interpolation
    const escalatedLowerPrice = applyEscalation(lowerPrice, year, constants);
    const escalatedUpperPrice = applyEscalation(upperPrice, year, constants);
    
    // Interpolate between the escalated prices
    const priceSpread = (escalatedLowerPrice * (1 - interpolationRatio)) + (escalatedUpperPrice * interpolationRatio);
    
    const revenue = dailyVolume * 1 * DAYS_IN_YEAR * priceSpread * degradationFactor * (volumeLossAdjustment/100) * (merchantPercentage/100);
    merchantRevenue = revenue / 1000000;
  }
 
  return {
    total: contractedRevenue + merchantRevenue,
    contractedGreen: 0,
    contractedEnergy: contractedRevenue,
    merchantGreen: 0,
    merchantEnergy: merchantRevenue,
    greenPercentage: 0,
    EnergyPercentage: totalContractedPercentage,
    annualGeneration: annualVolume * degradationFactor * (volumeLossAdjustment/100)
  };
};