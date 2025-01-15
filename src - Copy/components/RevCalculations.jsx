import { calculateStorageRevenue } from './StorageRevCalculations';
import { calculateRenewablesRevenue } from './RenewablesRevCalculations';

export const applyEscalation = (basePrice, year, constants) => {
  if (!basePrice || !constants.referenceYear || !constants.escalation) return basePrice;
  const yearDiff = year - constants.referenceYear;
  return basePrice * Math.pow(1 + constants.escalation / 100, yearDiff);
};

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

  // Different calculation path for storage assets
  if (asset.type === 'storage') {
    return calculateStorageRevenue(asset, timeInterval, year, assetStartYear);
  }

  // Calculate revenue for wind/solar assets
  return calculateRenewablesRevenue(asset, timeInterval, year, quarter, assetStartYear, constants, getMerchantPrice);
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