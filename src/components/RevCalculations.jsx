import { calculateStorageRevenue } from './StorageRevCalculations';
import { calculateRenewablesRevenue } from './RenewablesRevCalculations';

export const applyEscalation = (basePrice, year, constants) => {
  if (!basePrice || !constants.referenceYear || !constants.escalation) return basePrice;
  const yearDiff = year - constants.referenceYear;
  return basePrice * Math.pow(1 + constants.escalation / 100, yearDiff);
};

export const calculateAssetRevenue = (asset, timeInterval, constants, getMerchantPrice) => {
  if (typeof timeInterval === 'number') {
    timeInterval = timeInterval.toString();
  }
  
  let year, quarter;
  if (!timeInterval.includes('/') && !timeInterval.includes('-')) {
    year = parseInt(timeInterval);
  } else if (timeInterval.includes('-Q')) {
    const [yearStr, quarterStr] = timeInterval.split('-Q');
    year = parseInt(yearStr);
    quarter = parseInt(quarterStr);
  } else if (timeInterval.includes('/')) {
    year = parseInt(timeInterval.split('/')[2]);
  } else {
    throw new Error('Invalid time interval format');
  }

  const assetStartYear = new Date(asset.assetStartDate).getFullYear();
  if (year < assetStartYear) {
    return {
      total: 0,
      contractedGreen: 0,
      contractedEnergy: 0,
      merchantGreen: 0,
      merchantEnergy: 0,
      greenPercentage: 0,
      EnergyPercentage: 0,
      annualGeneration: 0
    };
  }

  if (asset.type === 'storage') {
    return calculateStorageRevenue(asset, timeInterval, year, assetStartYear, getMerchantPrice);
  }

  return calculateRenewablesRevenue(asset, timeInterval, year, quarter, assetStartYear, constants, getMerchantPrice);
};

export const processPortfolioData = (portfolioData, assets, visibleAssets) => {
  return portfolioData.map(periodData => {
    const processedPeriodData = {
      timeInterval: periodData.timeInterval,
      total: 0,
      contractedGreen: 0,
      contractedEnergy: 0,
      merchantGreen: 0,
      merchantEnergy: 0,
      totalGeneration: 0,
      weightedGreenPercentage: 0,
      weightedEnergyPercentage: 0
    };

    let totalRenewableGeneration = 0;

    Object.entries(periodData.assets).forEach(([assetName, assetData]) => {
      if (visibleAssets[assetName]) {
        const asset = Object.values(assets).find(a => a.name === assetName);
        const isStorage = asset.type === 'storage';

        processedPeriodData.total += Number((assetData.contractedGreen + assetData.contractedEnergy + 
          assetData.merchantGreen + assetData.merchantEnergy).toFixed(2));

        processedPeriodData.contractedGreen += Number(assetData.contractedGreen.toFixed(2));
        processedPeriodData.contractedEnergy += Number(assetData.contractedEnergy.toFixed(2));
        processedPeriodData.merchantGreen += Number(assetData.merchantGreen.toFixed(2));
        processedPeriodData.merchantEnergy += Number(assetData.merchantEnergy.toFixed(2));

        processedPeriodData.totalGeneration += parseFloat(asset.capacity) || 0;
        
        if (!isStorage) {
          totalRenewableGeneration += assetData.annualGeneration;
        }

        processedPeriodData[`${assetName} Contracted Green`] = Number(assetData.contractedGreen.toFixed(2));
        processedPeriodData[`${assetName} Contracted Energy`] = Number(assetData.contractedEnergy.toFixed(2));
        processedPeriodData[`${assetName} Merchant Green`] = Number(assetData.merchantGreen.toFixed(2));
        processedPeriodData[`${assetName} Merchant Energy`] = Number(assetData.merchantEnergy.toFixed(2));
      }
    });
    
    if (totalRenewableGeneration > 0) {
      processedPeriodData.weightedGreenPercentage = Object.entries(periodData.assets)
        .filter(([assetName]) => {
          if (!visibleAssets[assetName]) return false;
          const asset = Object.values(assets).find(a => a.name === assetName);
          return asset.type !== 'storage';
        })
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.greenPercentage * assetData.annualGeneration / totalRenewableGeneration), 0);
      
      processedPeriodData.weightedEnergyPercentage = Object.entries(periodData.assets)
        .filter(([assetName]) => {
          if (!visibleAssets[assetName]) return false;
          const asset = Object.values(assets).find(a => a.name === assetName);
          return asset.type !== 'storage';
        })
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.EnergyPercentage * assetData.annualGeneration / totalRenewableGeneration), 0);
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
