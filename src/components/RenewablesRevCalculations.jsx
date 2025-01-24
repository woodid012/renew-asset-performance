import { applyEscalation } from './RevCalculations';

export const calculateRenewablesRevenue = (asset, timeInterval, year, quarter, assetStartYear, constants, getMerchantPrice) => {
  const HOURS_IN_YEAR = constants.HOURS_IN_YEAR;
  let capacityFactor;
  
  // Use asset's quarterly capacity factors if quarter is specified
  if (quarter) {
    // Try to get the asset's stored quarterly capacity factor
    const quarterKey = `qualrtyCapacityFactor_q${quarter}`;
    const storedQuarterlyFactor = asset[quarterKey];
    
    if (storedQuarterlyFactor !== undefined && storedQuarterlyFactor !== '') {
      // Convert from percentage to decimal
      capacityFactor = parseFloat(storedQuarterlyFactor) / 100;
    } else {
      // Fallback to constants if asset doesn't have the quarterly factor
      capacityFactor = constants.capacityFactors_qtr[asset.type]?.[asset.state]?.[`Q${quarter}`] || 
                       constants.capacityFactors[asset.type]?.[asset.state] || 0;
    }
  } else {
    // For annual calculations, average the quarterly factors if available
    const quarters = ['q1', 'q2', 'q3', 'q4'];
    const availableFactors = quarters
      .map(q => asset[`qualrtyCapacityFactor_${q}`])
      .filter(factor => factor !== undefined && factor !== '')
      .map(factor => parseFloat(factor) / 100);

    if (availableFactors.length === 4) {
      // If we have all quarterly factors, use their average
      capacityFactor = availableFactors.reduce((sum, factor) => sum + factor, 0) / 4;
    } else {
      // Fallback to constants if we don't have all quarterly factors
      capacityFactor = constants.capacityFactors[asset.type]?.[asset.state] || 0;
    }
  }

  const capacity = parseFloat(asset.capacity) || 0;
  const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment) || 95;

  // Calculate period-adjusted generation
  let periodAdjustment = 1; // Default for yearly
  if (timeInterval.includes('-Q')) {
    periodAdjustment = 0.25; // Quarter is 1/4 of a year
  } else if (timeInterval.includes('/')) {
    periodAdjustment = 1/12; // Month is 1/12 of a year
  }

  // Calculate degradation factor based on years since start
  const yearsSinceStart = year - assetStartYear;
  const degradation = parseFloat(asset.annualDegradation) || constants.annualDegradation[asset.type] || 0;
  const degradationFactor = Math.pow(1 - degradation/100, yearsSinceStart);

  // Calculate generation with degradation factor
  const periodGeneration = capacity * volumeLossAdjustment / 100 * HOURS_IN_YEAR * capacityFactor * periodAdjustment * degradationFactor;

  // Process active contracts
  const activeContracts = asset.contracts.filter(contract => {
    const startYear = new Date(contract.startDate).getFullYear();
    const endYear = new Date(contract.endDate).getFullYear();
    return year >= startYear && year <= endYear;
  });

  let contractedGreen = 0;
  let contractedEnergy = 0;
  let totalGreenPercentage = 0;
  let totalEnergyPercentage = 0;
  
  activeContracts.forEach(contract => {
    const buyersPercentage = parseFloat(contract.buyersPercentage) || 0;
    const years = year - new Date(contract.startDate).getFullYear();
    const indexation = parseFloat(contract.indexation) || 0;
    const indexationFactor = Math.pow(1 + indexation/100, years);

    if (contract.type === 'fixed') {
      // Fixed Revenue contract - directly use the annual revenue in $M
      // For fixed revenue, ignore buyers percentage as it's a fixed amount
      const annualRevenue = parseFloat(contract.strikePrice) || 0;
      const contractRevenue = annualRevenue * indexationFactor * periodAdjustment * degradationFactor;
      
      // Allocate all fixed revenue to Energy component
      contractedGreen += 0;
      contractedEnergy += contractRevenue;
      totalGreenPercentage += 0;  // No green percentage for fixed revenue
      totalEnergyPercentage += buyersPercentage;
    } else if (contract.type === 'bundled') {
      let greenPrice = parseFloat(contract.greenPrice) || 0;
      let EnergyPrice = parseFloat(contract.EnergyPrice) || 0;
      
      greenPrice *= indexationFactor;
      EnergyPrice *= indexationFactor;

      if (contract.hasFloor && (greenPrice + EnergyPrice) < parseFloat(contract.floorValue)) {
        const total = greenPrice + EnergyPrice;
        const floorValue = parseFloat(contract.floorValue);
        if (total > 0) {
          greenPrice = (greenPrice / total) * floorValue;
          EnergyPrice = (EnergyPrice / total) * floorValue;
        } else {
          greenPrice = floorValue / 2;
          EnergyPrice = floorValue / 2;
        }
      }

      const greenRevenue = (periodGeneration * buyersPercentage/100 * greenPrice) / 1000000;
      const EnergyRevenue = (periodGeneration * buyersPercentage/100 * EnergyPrice) / 1000000;
      
      contractedGreen += greenRevenue;
      contractedEnergy += EnergyRevenue;
      totalGreenPercentage += buyersPercentage;
      totalEnergyPercentage += buyersPercentage;

    } else {
      let price = parseFloat(contract.strikePrice) || 0;
      price *= indexationFactor;
      
      if (contract.hasFloor && price < parseFloat(contract.floorValue)) {
        price = parseFloat(contract.floorValue);
      }

      const contractRevenue = (periodGeneration * buyersPercentage/100 * price) / 1000000;
      
      if (contract.type === 'green') {
        contractedGreen += contractRevenue;
        totalGreenPercentage += buyersPercentage;
      } else if (contract.type === 'Energy') {
        contractedEnergy += contractRevenue;
        totalEnergyPercentage += buyersPercentage;
      }
    }
  });

  // Calculate merchant revenue
  const greenMerchantPercentage = Math.max(0, 100 - totalGreenPercentage);
  const EnergyMerchantPercentage = Math.max(0, 100 - totalEnergyPercentage);
  
  // Get merchant prices for the specific time interval and apply escalation
  const merchantGreenPrice = applyEscalation(getMerchantPrice(asset.type, 'green', asset.state, timeInterval) || 0, year, constants);
  const merchantEnergyPrice = applyEscalation(getMerchantPrice(asset.type, 'Energy', asset.state, timeInterval) || 0, year, constants);
  
  // Calculate merchant revenues with period-adjusted generation
  const merchantGreen = (periodGeneration * greenMerchantPercentage/100 * merchantGreenPrice) / 1000000;
  const merchantEnergy = (periodGeneration * EnergyMerchantPercentage/100 * merchantEnergyPrice) / 1000000;

  return {
    total: contractedGreen + contractedEnergy + merchantGreen + merchantEnergy,
    contractedGreen,
    contractedEnergy,
    merchantGreen,
    merchantEnergy,
    greenPercentage: totalGreenPercentage,
    EnergyPercentage: totalEnergyPercentage,
    annualGeneration: periodGeneration
  };
};
