export const calculateMerchantPrice = (asset, year, getMerchantPrice) => {
  const blackPrice = getMerchantPrice(asset.type, 'black', asset.state, year) || 0;
  const greenPrice = getMerchantPrice(asset.type, 'green', asset.state, year) || 0;
  return blackPrice + greenPrice;
};

export const calculateAssetRevenue = (asset, year, constants, getMerchantPrice) => {
  const HOURS_IN_YEAR = constants.HOURS_IN_YEAR;
  const capacityFactor = constants.capacityFactors[asset.type]?.[asset.state] || 0;
  const capacity = parseFloat(asset.capacity) || 0;
  const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment) || 95;
  const annualGeneration = capacity * volumeLossAdjustment / 100 * HOURS_IN_YEAR * capacityFactor;

  const activeContracts = asset.contracts.filter(contract => {
    const startYear = new Date(contract.startDate).getFullYear();
    const endYear = new Date(contract.endDate).getFullYear();
    return year >= startYear && year <= endYear;
  });

  let contractedGreen = 0;
  let contractedBlack = 0;
  let totalGreenPercentage = 0;
  let totalBlackPercentage = 0;
  let merchant = 0;
  
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
          // If both prices are 0, split floor value equally
          greenPrice = floorValue / 2;
          blackPrice = floorValue / 2;
        }
      }

      const greenRevenue = (annualGeneration * buyersPercentage/100 * greenPrice) / 1000000;
      const blackRevenue = (annualGeneration * buyersPercentage/100 * blackPrice) / 1000000;
      
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

      const contractRevenue = (annualGeneration * buyersPercentage/100 * price) / 1000000;
      
      // For non-bundled contracts, only add to respective type
      if (contract.type === 'green') {
        contractedGreen += contractRevenue;
        totalGreenPercentage += buyersPercentage;
      } else if (contract.type === 'black') {
        contractedBlack += contractRevenue;
        totalBlackPercentage += buyersPercentage;
      }
    }
  });

  // Calculate merchant revenue based on remaining uncontracted percentage
  const merchantPrice = calculateMerchantPrice(asset, year, getMerchantPrice);
  const greenMerchantPercentage = Math.max(0, 100 - totalGreenPercentage);
  const blackMerchantPercentage = Math.max(0, 100 - totalBlackPercentage);
  
  const merchantGreen = (annualGeneration * greenMerchantPercentage/100 * (getMerchantPrice(asset.type, 'green', asset.state, year) || 0)) / 1000000;
  const merchantBlack = (annualGeneration * blackMerchantPercentage/100 * (getMerchantPrice(asset.type, 'black', asset.state, year) || 0)) / 1000000;
  merchant = merchantGreen + merchantBlack;

  return {
    total: contractedGreen + contractedBlack + merchant,
    contractedGreen,
    contractedBlack,
    merchant,
    greenPercentage: totalGreenPercentage,
    blackPercentage: totalBlackPercentage,
    annualGeneration
  };
};

export const generatePortfolioData = (assets, constants, getMerchantPrice) => {
  const years = Array.from(
    {length: constants.analysisEndYear - constants.analysisStartYear + 1}, 
    (_, i) => constants.analysisStartYear + i
  );
  
  return years.map(year => {
    const yearData = {
      year,
      assets: {}
    };

    Object.values(assets).forEach(asset => {
      const assetRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      yearData.assets[asset.name] = assetRevenue;
    });

    return yearData;
  });
};

export const processPortfolioData = (portfolioData, assets, visibleAssets) => {
  return portfolioData.map(yearData => {
    const processedYearData = {
      year: yearData.year,
      total: 0,
      contractedGreen: 0,
      contractedBlack: 0,
      merchant: 0,
      totalGeneration: 0,
      weightedGreenPercentage: 0,
      weightedBlackPercentage: 0
    };

    let totalAnnualGeneration = 0;

    Object.entries(yearData.assets).forEach(([assetName, assetData]) => {
      if (visibleAssets[assetName]) {
        processedYearData.total += Number(assetData.total.toFixed(2));
        processedYearData.contractedGreen += Number(assetData.contractedGreen.toFixed(2));
        processedYearData.contractedBlack += Number(assetData.contractedBlack.toFixed(2));
        processedYearData.merchant += Number(assetData.merchant.toFixed(2));

        const asset = Object.values(assets).find(a => a.name === assetName);
        processedYearData.totalGeneration += parseFloat(asset.capacity) || 0;
        totalAnnualGeneration += assetData.annualGeneration;

        // Store individual asset data
        processedYearData[`${assetName} Green`] = Number(assetData.contractedGreen.toFixed(2));
        processedYearData[`${assetName} Black`] = Number(assetData.contractedBlack.toFixed(2));
        processedYearData[`${assetName} Merchant`] = Number(assetData.merchant.toFixed(2));
      }
    });
    
    // Calculate weighted percentages based on annual generation
    if (totalAnnualGeneration > 0) {
      processedYearData.weightedGreenPercentage = Object.entries(yearData.assets)
        .filter(([assetName]) => visibleAssets[assetName])
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.greenPercentage * assetData.annualGeneration / totalAnnualGeneration), 0);
      
      processedYearData.weightedBlackPercentage = Object.entries(yearData.assets)
        .filter(([assetName]) => visibleAssets[assetName])
        .reduce((acc, [_, assetData]) => 
          acc + (assetData.blackPercentage * assetData.annualGeneration / totalAnnualGeneration), 0);
    }

    return processedYearData;
  });
};

export const assetColors = {
  base: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'],
  light: ['#9996db', '#a3d9b6', '#ffd47f', '#ff9347', '#00D4AE']
};

export const getAssetColor = (index) => ({
  base: assetColors.base[index % assetColors.base.length],
  light: assetColors.light[index % assetColors.light.length]
});