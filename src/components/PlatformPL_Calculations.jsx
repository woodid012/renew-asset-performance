import { calculateAssetRevenue } from './RevCalculations';
import { calculateStressRevenue } from './ValuationAnalysis_Calcs';

/**
 * Calculates P&L data for the platform and individual assets
 * @param {Object} assets - Asset objects from portfolio context
 * @param {Object} constants - Constants from portfolio context
 * @param {Array} years - Array of years to calculate for
 * @param {Function} getMerchantPrice - Function to get merchant prices
 * @param {String} selectedRevenueCase - Selected revenue case (base, worst, volume, price)
 * @param {Boolean} usePortfolioDebt - Whether to use portfolio debt parameters
 * @param {Number} platformOpex - Annual platform opex
 * @param {Number} platformOpexEscalation - Annual escalation rate for platform opex
 * @returns {Object} Object containing platform P&L, asset P&Ls and quarterly data
 */
export const calculatePlatformPL = (
  assets,
  constants,
  years,
  getMerchantPrice,
  selectedRevenueCase,
  usePortfolioDebt,
  platformOpex,
  platformOpexEscalation
) => {
  if (!assets || Object.keys(assets).length === 0 || years.length === 0) {
    return { assetPL: {}, platformPL: [], quarters: [] };
  }

  const assetPL = {};
  const platformPL = years.map(year => ({
    year,
    period: year.toString(),
    revenue: 0,
    assetOpex: 0,
    platformOpex: 0,
    ebitda: 0,
    depreciation: 0,
    interest: 0,
    ebt: 0,
    tax: 0,
    npat: 0,
    principalRepayment: 0 // Adding principal repayment field
  }));
  
  // Quarterly data structure
  const quarters = [];
  for (let year of years) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      quarters.push({
        period: `${year}-Q${quarter}`,
        year,
        quarter,
        revenue: 0,
        assetOpex: 0,
        platformOpex: 0,
        ebitda: 0,
        depreciation: 0,
        interest: 0,
        principalRepayment: 0, // Adding principal repayment field
        ebt: 0,
        tax: 0,
        npat: 0
      });
    }
  }

  // Calculate P&L for each asset
  Object.values(assets).forEach(asset => {
    const assetStartYear = new Date(asset.assetStartDate).getFullYear();
    const assetLife = parseInt(asset.assetLife) || 30; // Default to 30 years if not specified
    const assetEndYear = assetStartYear + assetLife;
    
    // Get asset costs
    const assetCosts = constants.assetCosts[asset.name] || {};
    const capex = assetCosts.capex || 0;
    const opexBase = assetCosts.operatingCosts || 0;
    const opexEscalation = assetCosts.operatingCostEscalation || 2.5;
    
    // Access shared depreciation settings
    const depreciationPeriod = constants.deprecationPeriods?.[asset.type] || 30;
    const annualDepreciation = capex / depreciationPeriod;

    // Debt parameters - either from individual asset or portfolio based on toggle
    const useDebtParams = usePortfolioDebt && constants.assetCosts.portfolio ? 
      constants.assetCosts.portfolio : assetCosts;
    
    const interestRate = useDebtParams.interestRate || 0.06;
    const calculatedGearing = useDebtParams.calculatedGearing || 0.7;
    const debtAmount = capex * calculatedGearing;
    const tenorYears = useDebtParams.tenorYears || 15;
    
    // Calculate annual debt service from Project Finance tab
    const debtStructure = useDebtParams.debtStructure || 'sculpting';
    
    // Initialize asset P&L array
    assetPL[asset.name] = years.map(year => {
      // Skip years before asset starts or after asset end of life
      if (year < assetStartYear || year >= assetEndYear) {
        return {
          year,
          period: year.toString(),
          revenue: 0,
          opex: 0,
          ebitda: 0,
          depreciation: 0,
          interest: 0,
          principalRepayment: 0,
          ebt: 0,
          tax: 0,
          npat: 0
        };
      }

      // Calculate yearly revenue
      const yearIndex = year - assetStartYear;
      
      // Calculate asset revenue for this year and scenario
      let revenue = 0;
      try {
        // Use the same calculation methods as in other components
        const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        
        // Apply stress scenario adjustments if needed
        let stressedRevenue = baseRevenue;
        if (selectedRevenueCase !== 'base') {
          stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
        }
        
        // Sum all revenue components
        revenue = stressedRevenue.contractedGreen + 
                 stressedRevenue.contractedEnergy + 
                 stressedRevenue.merchantGreen + 
                 stressedRevenue.merchantEnergy;
                 
        // Also calculate quarterly revenue
        for (let quarter = 1; quarter <= 4; quarter++) {
          const quarterStr = `${year}-Q${quarter}`;
          const quarterBaseRevenue = calculateAssetRevenue(asset, quarterStr, constants, getMerchantPrice);
          const quarterStressedRevenue = selectedRevenueCase !== 'base' ? 
            calculateStressRevenue(quarterBaseRevenue, selectedRevenueCase, constants) : 
            quarterBaseRevenue;
          
          const quarterRevenue = quarterStressedRevenue.contractedGreen + 
                               quarterStressedRevenue.contractedEnergy + 
                               quarterStressedRevenue.merchantGreen + 
                               quarterStressedRevenue.merchantEnergy;
          
          const quarterIndex = quarters.findIndex(q => q.period === quarterStr);
          if (quarterIndex !== -1) {
            quarters[quarterIndex].revenue += quarterRevenue;
          }
        }
      } catch (err) {
        console.error(`Error calculating revenue for ${asset.name} in ${year}:`, err);
        revenue = 0;
      }

      // Calculate opex with escalation
      const opexFactor = Math.pow(1 + opexEscalation / 100, yearIndex);
      const opex = -(opexBase * opexFactor);
      
      // Calculate EBITDA
      const ebitda = revenue + opex;
      
      // Calculate depreciation (only if within depreciation period)
      const depreciation = year < (assetStartYear + depreciationPeriod) ? -annualDepreciation : 0;
      
      // Calculate debt service (only if within loan tenor)
      let interest = 0;
      let principalRepayment = 0;
      
      if (year < (assetStartYear + tenorYears)) {
        // Use Project Finance tab calculations for debt service
        if (debtStructure === 'amortization') {
          // For amortization, use standard formulas
          const yearsRemaining = assetStartYear + tenorYears - year;
          const totalPayment = calculateAmortizationPayment(debtAmount * (yearsRemaining / tenorYears), interestRate, yearsRemaining);
          interest = -(debtAmount * (yearsRemaining / tenorYears) * interestRate);
          principalRepayment = -(totalPayment - Math.abs(interest));
        } else {
          // For sculpting, use a simpler approximation based on years passed
          const yearsSinceStart = year - assetStartYear;
          const remainingPrincipal = debtAmount * (1 - yearsSinceStart / tenorYears);
          interest = -(remainingPrincipal * interestRate);
          principalRepayment = -(debtAmount / tenorYears);
        }
      }
      
      // Calculate EBT
      const ebt = ebitda + depreciation + interest;
      
      // Calculate tax using the shared corporate tax rate
      const tax = ebt < 0 ? 0 : -(ebt * constants.corporateTaxRate / 100);
      
      // Calculate NPAT
      const npat = ebt + tax;

      // Add to platform totals
      const platformYearIndex = year - years[0];
      platformPL[platformYearIndex].revenue += revenue;
      platformPL[platformYearIndex].assetOpex += opex;
      platformPL[platformYearIndex].ebitda += ebitda;
      platformPL[platformYearIndex].depreciation += depreciation;
      platformPL[platformYearIndex].interest += interest;
      platformPL[platformYearIndex].principalRepayment += principalRepayment;
      platformPL[platformYearIndex].ebt += ebt;
      
      // Add to quarterly data
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterStr = `${year}-Q${quarter}`;
        const quarterIndex = quarters.findIndex(q => q.period === quarterStr);
        if (quarterIndex !== -1) {
          // Divide annual values by 4 for quarterly approximation (except revenue which we calculated separately)
          quarters[quarterIndex].assetOpex += opex / 4;
          quarters[quarterIndex].depreciation += depreciation / 4;
          quarters[quarterIndex].interest += interest / 4;
          quarters[quarterIndex].principalRepayment += principalRepayment / 4;
        }
      }

      return {
        year,
        period: year.toString(),
        revenue,
        opex,
        ebitda,
        depreciation,
        interest,
        principalRepayment,
        ebt,
        tax,
        npat
      };
    });
  });

  // Add platform opex and recalculate platform P&L
  platformPL.forEach((yearData, i) => {
    // Calculate platform opex with escalation
    const platformOpexFactor = Math.pow(1 + platformOpexEscalation / 100, i);
    const yearPlatformOpex = -(platformOpex * platformOpexFactor);
    
    // Update platform opex
    yearData.platformOpex = yearPlatformOpex;
    
    // Recalculate EBITDA explicitly (to avoid accumulation errors)
    yearData.ebitda = yearData.revenue + yearData.assetOpex + yearPlatformOpex;
    
    // Recalculate EBT
    yearData.ebt = yearData.ebitda + yearData.depreciation + yearData.interest;
    
    // Use a default tax rate if undefined
    const corporateTaxRate = constants.corporateTaxRate !== undefined ? constants.corporateTaxRate : 0;
    yearData.tax = yearData.ebt < 0 ? 0 : -(yearData.ebt * corporateTaxRate / 100);
    
    // Calculate NPAT
    yearData.npat = yearData.ebt + yearData.tax;
  });
  
  // Update quarterly data
  quarters.forEach((quarterData, i) => {
    // Calculate platform opex with escalation (year index)
    const yearIndex = quarterData.year - years[0];
    const quarterPlatformOpexFactor = Math.pow(1 + platformOpexEscalation / 100, yearIndex);
    const quarterPlatformOpex = -(platformOpex * quarterPlatformOpexFactor) / 4; // Divide by 4 for quarterly
    
    // Update platform opex
    quarterData.platformOpex = quarterPlatformOpex;
    
    // Recalculate EBITDA with platform opex
    quarterData.ebitda = quarterData.revenue + quarterData.assetOpex + quarterPlatformOpex;
    
    // Recalculate EBT
    quarterData.ebt = quarterData.ebitda + quarterData.depreciation + quarterData.interest;
    
    // Calculate tax using the shared corporate tax rate
    quarterData.tax = quarterData.ebt < 0 ? 0 : -(quarterData.ebt * constants.corporateTaxRate / 100);
    
    // Calculate NPAT
    quarterData.npat = quarterData.ebt + quarterData.tax;
  });

  return { assetPL, platformPL, quarters };
};

/**
 * Helper function to calculate standard amortization payment
 */
const calculateAmortizationPayment = (principal, rate, years) => {
  if (rate === 0) return principal / years; // Handle edge case
  return principal * rate * Math.pow(1 + rate, years) / (Math.pow(1 + rate, years) - 1);
};

/**
 * Calculates cash flow data based on the P&L results
 * @param {Array} platformPL - Platform P&L data
 * @param {Array} quarters - Quarterly P&L data
 * @param {Number} dividendPolicy - Dividend payout ratio (%)
 * @param {Number} minimumCashBalance - Minimum cash balance to maintain ($M)
 * @returns {Object} Annual and quarterly cash flow data
 */
export const calculateCashFlow = (
  platformPL,
  quarters,
  dividendPolicy,
  minimumCashBalance
) => {
  if (!platformPL || platformPL.length === 0) {
    return { annual: [], quarterly: [] };
  }
  
  // Transform P&L data to cash flow format
  let cashBalance = minimumCashBalance; // Start with the minimum cash balance
  let retainedEarnings = 0;
  
  const annualCashFlow = platformPL.map((yearData, index) => {
    // Operating cash flow is EBITDA
    const operatingCashFlow = yearData.ebitda;
    
    // Tax payments
    const taxPayment = yearData.tax;
    
    // Debt service components from P&L
    const interest = yearData.interest;
    const principalRepayment = yearData.principalRepayment;
    const debtService = interest + principalRepayment;
    
    // Calculate Free Cash Flow to Equity (FCFE)
    const fcfe = operatingCashFlow + taxPayment + debtService;
    
    // Update cash balance before dividend
    const potentialCashBalance = cashBalance + fcfe;
    
    // Calculate potential dividend
    let dividend = 0;
    if (yearData.npat > 0 && potentialCashBalance > minimumCashBalance) {
      // Potential dividend is limited by dividend policy and maintaining minimum cash balance
      const maxDividend = Math.min(
        yearData.npat * (dividendPolicy / 100),
        potentialCashBalance - minimumCashBalance
      );
      dividend = Math.max(0, maxDividend);
      
      // For debugging
      console.log(`Year ${yearData.year}: NPAT=${yearData.npat.toFixed(2)}M, Cash=${potentialCashBalance.toFixed(2)}M, Dividend=${dividend.toFixed(2)}M`);
    } else {
      // For debugging - explain why no dividend
      if (yearData.npat <= 0) {
        console.log(`Year ${yearData.year}: No dividend - NPAT is ${yearData.npat.toFixed(2)}M (must be positive)`);
      } else if (potentialCashBalance <= minimumCashBalance) {
        console.log(`Year ${yearData.year}: No dividend - Cash ${potentialCashBalance.toFixed(2)}M less than minimum ${minimumCashBalance.toFixed(2)}M`);
      }
    }
    
    // Update cash balance
    const netCashFlow = fcfe - dividend;
    cashBalance = potentialCashBalance - dividend;
    
    // Update retained earnings (separate from cash balance)
    retainedEarnings = retainedEarnings + yearData.npat - dividend;
    
    return {
      year: yearData.year,
      period: yearData.period,
      operatingCashFlow: operatingCashFlow,
      tax: taxPayment,
      interest: yearData.interest,
      principalRepayment: yearData.principalRepayment,
      debtService,
      fcfe,
      dividend: -dividend, // Negative as it's cash outflow
      netCashFlow,
      cashBalance,
      retainedEarnings
    };
  });
  
  // Create quarterly cash flow data
  cashBalance = minimumCashBalance;
  retainedEarnings = 0;
  
  const quarterlyCashFlow = quarters.map((quarterData, index) => {
    // Operating cash flow is EBITDA
    const operatingCashFlow = quarterData.ebitda;
    
    // Tax payments
    const taxPayment = quarterData.tax;
    
    // Debt service from P&L
    const interest = quarterData.interest;
    const principalRepayment = quarterData.principalRepayment;
    const debtService = interest + principalRepayment;
    
    // Calculate Free Cash Flow to Equity (FCFE)
    const fcfe = operatingCashFlow + taxPayment + debtService;
    
    // Update cash balance before dividend
    const potentialCashBalance = cashBalance + fcfe;
    
    // Calculate potential dividend (now for every quarter, not just Q4)
    let dividend = 0;
    if (quarterData.npat > 0 && potentialCashBalance > minimumCashBalance) {
      // Potential dividend is limited by dividend policy and maintaining minimum cash balance
      // Calculate quarterly dividend as annual policy divided by 4
      const quarterlyDividendPolicy = dividendPolicy / 4;
      const maxDividend = Math.min(
        quarterData.npat * (quarterlyDividendPolicy / 100),
        potentialCashBalance - minimumCashBalance
      );
      dividend = Math.max(0, maxDividend);
      
      // For debugging
      console.log(`Quarter ${quarterData.period}: NPAT=${quarterData.npat.toFixed(2)}M, Cash=${potentialCashBalance.toFixed(2)}M, Dividend=${dividend.toFixed(2)}M`);
    } else {
      // For debugging - explain why no dividend
      if (quarterData.npat <= 0) {
        console.log(`Quarter ${quarterData.period}: No dividend - NPAT is ${quarterData.npat.toFixed(2)}M (must be positive)`);
      } else if (potentialCashBalance <= minimumCashBalance) {
        console.log(`Quarter ${quarterData.period}: No dividend - Cash ${potentialCashBalance.toFixed(2)}M less than minimum ${minimumCashBalance.toFixed(2)}M`);
      }
    }
    
    // Update cash balance
    const netCashFlow = fcfe - dividend;
    cashBalance = potentialCashBalance - dividend;
    
    // Update retained earnings (separate from cash balance)
    retainedEarnings = retainedEarnings + quarterData.npat - dividend;
    
    return {
      year: quarterData.year,
      quarter: quarterData.quarter,
      period: quarterData.period,
      operatingCashFlow: operatingCashFlow,
      tax: taxPayment,
      interest: quarterData.interest,
      principalRepayment: quarterData.principalRepayment,
      debtService,
      fcfe,
      dividend: -dividend, // Negative as it's cash outflow
      netCashFlow,
      cashBalance,
      retainedEarnings
    };
  });
  
  return { annual: annualCashFlow, quarterly: quarterlyCashFlow };
};

/**
 * Utility function to generate years array from start to end year
 * @param {Number} startYear - Start year 
 * @param {Number} endYear - End year
 * @returns {Array} Array of years
 */
export const generateYears = (startYear, endYear) => {
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
};

/**
 * Format currency for display
 * @param {Number} value - Value to format 
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (value, decimals = 1) => {
  // Handle undefined, null or NaN values
  if (value === undefined || value === null || isNaN(value)) {
    return '$0.0M';
  }
  return `${value.toFixed(decimals)}M`;
};