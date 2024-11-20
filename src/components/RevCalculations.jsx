export const calculateAssetRevenue = (asset, timeInterval, constants, getMerchantPrice) => {
  // Convert number to string if it's a year
  if (typeof timeInterval === 'number') {
    timeInterval = timeInterval.toString();
  }
  
  // Extract year and quarter from timeInterval for contract calculations
  let year, quarter;
  if (!timeInterval.includes('/') && !timeInterval.includes('-')) {
    year = parseInt(timeInterval); // Simple year string
  } else if (timeInterval.includes('-Q')) {
    const [yearStr, quarterStr] = timeInterval.split('-Q');
    year = parseInt(yearStr);
    quarter = parseInt(quarterStr);
  } else if (timeInterval.includes('/')) {
    year = parseInt(timeInterval.split('/')[2]); // Month format
  } else {
    throw new Error('Invalid time interval format');
  }

  // Check if current year is before asset start date
  const assetStartYear = new Date(asset.assetStartDate).getFullYear();
  if (year < assetStartYear) {
    return {
      total: 0,
      contractedGreen: 0,
      contractedBlack: 0,
      merchantGreen: 0,
      merchantBlack: 0,
      greenPercentage: 0,
      blackPercentage: 0,
      annualGeneration: 0
    };
  }

  const HOURS_IN_YEAR = constants.HOURS_IN_YEAR;
  let capacityFactor;
  
  // Use quarterly capacity factors if quarter is specified
  if (quarter && constants.capacityFactors_qtr) {
    capacityFactor = constants.capacityFactors_qtr[asset.type]?.[asset.state]?.[`Q${quarter}`] || 
                     constants.capacityFactors[asset.type]?.[asset.state] || 0;
  } else {
    capacityFactor = constants.capacityFactors[asset.type]?.[asset.state] || 0;
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

  const periodGeneration = capacity * volumeLossAdjustment / 100 * HOURS_IN_YEAR * capacityFactor * periodAdjustment;
  const annualGeneration = capacity * volumeLossAdjustment / 100 * HOURS_IN_YEAR * capacityFactor; // Keep full annual for contract calcs

  // Contract calculations remain yearly-based
  const activeContracts = asset.contracts.filter(contract => {
    const startYear = new Date(contract.startDate).getFullYear();
    const endYear = new Date(contract.endDate).getFullYear();
    return year >= startYear && year <= endYear;
  });

  let contractedGreen = 0;
  let contractedBlack = 0;
  let totalGreenPercentage = 0;
  let totalBlackPercentage = 0;
  
  activeContracts.forEach(contract => {
    const buyersPercentage = parseFloat(contract.buyersPercentage) || 0;
    const years = year - new Date(contract.startDate).getFullYear();
    const indexation = parseFloat(contract.indexation) || 0;
    const indexationFactor = Math.pow(1 + indexation/100, years);

    if (contract.type === 'bundled') {
      let greenPrice = parseFloat(contract.greenPrice) || 0;
      let blackPrice = parseFloat(contract.blackPrice) || 0;
      
      greenPrice *= indexationFactor;
      blackPrice *= indexationFactor;

      if (contract.hasFloor && (greenPrice + blackPrice) < parseFloat(contract.floorValue)) {
        const total = greenPrice + blackPrice;
        const floorValue = parseFloat(contract.floorValue);
        if (total > 0) {
          greenPrice = (greenPrice / total) * floorValue;
          blackPrice = (blackPrice / total) * floorValue;
        } else {
          greenPrice = floorValue / 2;
          blackPrice = floorValue / 2;
        }
      }

      // Apply period adjustment to contracted volumes
      const greenRevenue = (periodGeneration * buyersPercentage/100 * greenPrice) / 1000000;
      const blackRevenue = (periodGeneration * buyersPercentage/100 * blackPrice) / 1000000;
      
      contractedGreen += greenRevenue;
      contractedBlack += blackRevenue;
      totalGreenPercentage += buyersPercentage;
      totalBlackPercentage += buyersPercentage;

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
      } else if (contract.type === 'black') {
        contractedBlack += contractRevenue;
        totalBlackPercentage += buyersPercentage;
      }
    }
  });

  // Calculate merchant revenue with escalation for both green and black
  const greenMerchantPercentage = Math.max(0, 100 - totalGreenPercentage);
  const blackMerchantPercentage = Math.max(0, 100 - totalBlackPercentage);
  
  // Apply escalation to merchant prices
  const applyEscalation = (basePrice) => {
    if (!basePrice || !constants.referenceYear || !constants.escalation) return basePrice;
    const yearDiff = year - constants.referenceYear;
    return basePrice * Math.pow(1 + constants.escalation / 100, yearDiff);
  };

  // Get merchant prices for the specific time interval
  const merchantGreenPrice = applyEscalation(getMerchantPrice(asset.type, 'green', asset.state, timeInterval) || 0);
  const merchantBlackPrice = applyEscalation(getMerchantPrice(asset.type, 'black', asset.state, timeInterval) || 0);
  
  // Calculate merchant revenues with period-adjusted generation
  const merchantGreen = (periodGeneration * greenMerchantPercentage/100 * merchantGreenPrice) / 1000000;
  const merchantBlack = (periodGeneration * blackMerchantPercentage/100 * merchantBlackPrice) / 1000000;

  return {
    total: contractedGreen + contractedBlack + merchantGreen + merchantBlack,
    contractedGreen,
    contractedBlack,
    merchantGreen,
    merchantBlack,
    greenPercentage: totalGreenPercentage,
    blackPercentage: totalBlackPercentage,
    annualGeneration: periodGeneration // Return the period-adjusted generation
  };
};

export const processPortfolioData = (portfolioData, assets, visibleAssets) => {
  return portfolioData.map(periodData => {
    const processedPeriodData = {
      timeInterval: periodData.timeInterval,
      total: 0,
      contractedGreen: 0,
      contractedBlack: 0,
      merchantGreen: 0,
      merchantBlack: 0,
      totalGeneration: 0,
      weightedGreenPercentage: 0,
      weightedBlackPercentage: 0
    };

    let totalPeriodGeneration = 0;

    Object.entries(periodData.assets).forEach(([assetName, assetData]) => {
      if (visibleAssets[assetName]) {
        processedPeriodData.total += Number((assetData.contractedGreen + assetData.contractedBlack + 
          assetData.merchantGreen + assetData.merchantBlack).toFixed(2));
        processedPeriodData.contractedGreen += Number(assetData.contractedGreen.toFixed(2));
        processedPeriodData.contractedBlack += Number(assetData.contractedBlack.toFixed(2));
        processedPeriodData.merchantGreen += Number(assetData.merchantGreen.toFixed(2));
        processedPeriodData.merchantBlack += Number(assetData.merchantBlack.toFixed(2));

        const asset = Object.values(assets).find(a => a.name === assetName);
        processedPeriodData.totalGeneration += parseFloat(asset.capacity) || 0;
        totalPeriodGeneration += assetData.annualGeneration;

        // Store individual asset data
        processedPeriodData[`${assetName} Contracted Green`] = Number(assetData.contractedGreen.toFixed(2));
        processedPeriodData[`${assetName} Contracted Black`] = Number(assetData.contractedBlack.toFixed(2));
        processedPeriodData[`${assetName} Merchant Green`] = Number(assetData.merchantGreen.toFixed(2));
        processedPeriodData[`${assetName} Merchant Black`] = Number(assetData.merchantBlack.toFixed(2));
      }
    });
    
    if (totalPeriodGeneration > 0) {
      processedPeriodData.weightedGreenPercentage = Object.entries(periodData.assets)
        .filter(([assetName]) => visibleAssets[assetName])
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.greenPercentage * assetData.annualGeneration / totalPeriodGeneration), 0);
      
      processedPeriodData.weightedBlackPercentage = Object.entries(periodData.assets)
        .filter(([assetName]) => visibleAssets[assetName])
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.blackPercentage * assetData.annualGeneration / totalPeriodGeneration), 0);
    }

    return processedPeriodData;
  });
};

export const generatePortfolioData = (assets, timeIntervals, constants, getMerchantPrice) => {
  return timeIntervals.map(timeInterval => {
    const periodData = {
      timeInterval,
      assets: {}
    };

    Object.values(assets).forEach(asset => {
      const assetRevenue = calculateAssetRevenue(asset, timeInterval, constants, getMerchantPrice);
      periodData.assets[asset.name] = assetRevenue;
    });

    return periodData;
  });
};