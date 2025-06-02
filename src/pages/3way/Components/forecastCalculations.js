// Updated forecast calculations using real portfolio data
import { calculateAssetRevenue } from '@/components/RevCalculations';
import { calculateStressRevenue } from '@/components/ValuationAnalysis_Calcs';

// Utility functions for formatting
export const formatCurrency = (value, showMillions = true) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.0';
  const formatted = Math.abs(value).toFixed(1);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${formatted}${showMillions ? 'M' : ''}`;
};

export const formatPercent = (value) => {
  if (value === undefined || value === null || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
};

/**
 * Calculate individual asset P&L using real portfolio data
 */
export const calculateAssetPL = (
  asset,
  constants,
  years,
  getMerchantPrice,
  selectedRevenueCase = 'base'
) => {
  const assetStartYear = new Date(asset.assetStartDate).getFullYear();
  const assetLife = parseInt(asset.assetLife) || 30;
  const assetEndYear = assetStartYear + assetLife;
  
  // Get asset costs
  const assetCosts = constants.assetCosts[asset.name] || {};
  const capex = assetCosts.capex || 0;
  const opexBase = assetCosts.operatingCosts || 0;
  const opexEscalation = assetCosts.operatingCostEscalation || 2.5;
  
  // Depreciation settings
  const depreciationPeriod = constants.deprecationPeriods?.[asset.type] || 30;
  const annualDepreciation = capex / depreciationPeriod;
  
  // Debt parameters
  const interestRate = assetCosts.interestRate || 0.06;
  const calculatedGearing = assetCosts.calculatedGearing || 0.7;
  const debtAmount = capex * calculatedGearing;
  const tenorYears = assetCosts.tenorYears || 15;
  
  let cumulativeDepreciation = 0;
  let remainingDebt = debtAmount;
  
  return years.map((year, yearIndex) => {
    // Skip years before asset starts or after asset end of life
    if (year < assetStartYear || year >= assetEndYear) {
      return {
        year,
        assetName: asset.name,
        revenue: 0,
        operatingExpenses: 0,
        ebitda: 0,
        depreciation: 0,
        ebit: 0,
        interestExpense: 0,
        profitBeforeTax: 0,
        taxExpense: 0,
        netProfitAfterTax: 0,
        principalRepayment: 0,
        cumulativeDepreciation: cumulativeDepreciation,
        remainingDebt: remainingDebt
      };
    }

    // Calculate yearly revenue using existing functions
    const assetYearIndex = year - assetStartYear;
    let revenue = 0;
    
    try {
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      let stressedRevenue = baseRevenue;
      
      if (selectedRevenueCase !== 'base') {
        stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
      }
      
      revenue = stressedRevenue.contractedGreen + 
                stressedRevenue.contractedEnergy + 
                stressedRevenue.merchantGreen + 
                stressedRevenue.merchantEnergy;
    } catch (err) {
      console.error(`Error calculating revenue for ${asset.name} in ${year}:`, err);
      revenue = 0;
    }

    // Calculate operating expenses with escalation
    const opexFactor = Math.pow(1 + opexEscalation / 100, assetYearIndex);
    const operatingExpenses = opexBase * opexFactor;
    
    // Calculate EBITDA
    const ebitda = revenue - operatingExpenses;
    
    // Calculate depreciation (only if within depreciation period)
    const depreciation = year < (assetStartYear + depreciationPeriod) ? annualDepreciation : 0;
    cumulativeDepreciation += depreciation;
    
    // Calculate EBIT
    const ebit = ebitda - depreciation;
    
    // Calculate debt service (only if within loan tenor)
    let interestExpense = 0;
    let principalRepayment = 0;
    
    if (year < (assetStartYear + tenorYears) && remainingDebt > 0) {
      interestExpense = remainingDebt * interestRate;
      principalRepayment = Math.min(debtAmount / tenorYears, remainingDebt);
      remainingDebt = Math.max(0, remainingDebt - principalRepayment);
    }
    
    // Calculate EBT and tax
    const profitBeforeTax = ebit - interestExpense;
    const taxExpense = Math.max(0, profitBeforeTax * (constants.corporateTaxRate / 100));
    const netProfitAfterTax = profitBeforeTax - taxExpense;

    return {
      year,
      assetName: asset.name,
      revenue,
      operatingExpenses,
      ebitda,
      depreciation,
      ebit,
      interestExpense,
      profitBeforeTax,
      taxExpense,
      netProfitAfterTax,
      principalRepayment,
      cumulativeDepreciation,
      remainingDebt
    };
  });
};

/**
 * Calculate portfolio-level P&L aggregating all assets
 */
export const calculatePortfolioPL = (
  assets,
  constants,
  years,
  getMerchantPrice,
  selectedRevenueCase = 'base'
) => {
  // Calculate P&L for each asset
  const assetPLs = {};
  Object.values(assets).forEach(asset => {
    assetPLs[asset.name] = calculateAssetPL(
      asset, 
      constants, 
      years, 
      getMerchantPrice, 
      selectedRevenueCase
    );
  });

  // Aggregate to portfolio level
  const portfolioPL = years.map((year, yearIndex) => {
    let totalRevenue = 0;
    let totalOperatingExpenses = 0;
    let totalDepreciation = 0;
    let totalInterestExpense = 0;
    let totalPrincipalRepayment = 0;
    let totalCumulativeDepreciation = 0;
    let totalRemainingDebt = 0;

    // Sum across all assets
    Object.values(assetPLs).forEach(assetPL => {
      const yearData = assetPL[yearIndex];
      if (yearData) {
        totalRevenue += yearData.revenue;
        totalOperatingExpenses += yearData.operatingExpenses;
        totalDepreciation += yearData.depreciation;
        totalInterestExpense += yearData.interestExpense;
        totalPrincipalRepayment += yearData.principalRepayment;
        totalCumulativeDepreciation += yearData.cumulativeDepreciation;
        totalRemainingDebt += yearData.remainingDebt;
      }
    });

    // Add platform operating expenses
    const platformOpexFactor = Math.pow(1 + (constants.platformOpexEscalation || 2.5) / 100, yearIndex);
    const platformOpex = (constants.platformOpex || 4.2) * platformOpexFactor;
    const totalOpex = totalOperatingExpenses + platformOpex;

    // Calculate portfolio totals
    const ebitda = totalRevenue - totalOpex;
    const ebit = ebitda - totalDepreciation;
    const profitBeforeTax = ebit - totalInterestExpense;
    const taxExpense = Math.max(0, profitBeforeTax * (constants.corporateTaxRate / 100));
    const netProfitAfterTax = profitBeforeTax - taxExpense;

    return {
      year,
      revenue: totalRevenue,
      assetOperatingExpenses: totalOperatingExpenses,
      platformOperatingExpenses: platformOpex,
      totalOperatingExpenses: totalOpex,
      ebitda,
      depreciation: totalDepreciation,
      ebit,
      interestExpense: totalInterestExpense,
      profitBeforeTax,
      taxExpense,
      netProfitAfterTax,
      principalRepayment: totalPrincipalRepayment,
      cumulativeDepreciation: totalCumulativeDepreciation,
      remainingDebt: totalRemainingDebt
    };
  });

  return { assetPLs, portfolioPL };
};

/**
 * Calculate comprehensive 3-way forecast using real portfolio data
 */
export const calculateForecastData = (
  assets,
  constants,
  getMerchantPrice,
  scenario = 'base',
  viewBy = 'portfolio' // 'portfolio' or specific asset name
) => {
  const years = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => constants.analysisStartYear + i
  );

  // Calculate P&L data
  const { assetPLs, portfolioPL } = calculatePortfolioPL(
    assets,
    constants,
    years,
    getMerchantPrice,
    scenario
  );

  // Determine which P&L data to use based on viewBy
  let plData;
  if (viewBy === 'portfolio') {
    plData = portfolioPL;
  } else {
    // Show specific asset
    plData = assetPLs[viewBy] || [];
  }

  // Calculate total CAPEX for balance sheet calculations
  const totalCapex = Object.values(assets).reduce((sum, asset) => {
    const assetCosts = constants.assetCosts[asset.name] || {};
    return sum + (assetCosts.capex || 0);
  }, 0);

  // For asset view, use just that asset's CAPEX
  const relevantCapex = viewBy === 'portfolio' ? totalCapex : 
    (constants.assetCosts[viewBy]?.capex || 0);

  let cumulativeRetainedEarnings = 0;
  let cumulativeCashFlow = constants.minimumCashBalance || 5.0;

  const forecast = plData.map((plItem, index) => {
    const year = plItem.year;
    
    // === PROFIT & LOSS (already calculated) ===
    const grossRevenue = plItem.revenue || 0;
    const totalOperatingExpenses = viewBy === 'portfolio' ? 
      plItem.totalOperatingExpenses : plItem.operatingExpenses;
    const ebitda = plItem.ebitda || (grossRevenue - totalOperatingExpenses);
    const annualDepreciation = plItem.depreciation || 0;
    const ebit = plItem.ebit || (ebitda - annualDepreciation);
    const interestExpense = plItem.interestExpense || 0;
    const profitBeforeTax = plItem.profitBeforeTax || (ebit - interestExpense);
    const taxExpense = plItem.taxExpense || 0;
    const netProfitAfterTax = plItem.netProfitAfterTax || (profitBeforeTax - taxExpense);
    const principalRepayment = plItem.principalRepayment || 0;

    // === BALANCE SHEET ===
    
    // Assets
    const cashAndBankBalances = cumulativeCashFlow;
    const accountsReceivable = grossRevenue * 0.083; // 1 month of revenue
    const totalCurrentAssets = cashAndBankBalances + accountsReceivable;
    
    const cumulativeDepreciation = plItem.cumulativeDepreciation || (annualDepreciation * (index + 1));
    const propertyPlantEquipment = Math.max(0, relevantCapex - cumulativeDepreciation);
    const totalNonCurrentAssets = propertyPlantEquipment;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    
    // Liabilities
    const accountsPayable = totalOperatingExpenses * 0.083; // 1 month of expenses
    const accruals = taxExpense * 0.25; // Quarterly tax payments
    const totalCurrentLiabilities = accountsPayable + accruals;
    
    const longTermDebt = plItem.remainingDebt || 0;
    const totalNonCurrentLiabilities = longTermDebt;
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    
    // Equity
    const initialEquity = relevantCapex * 0.3; // 30% equity
    cumulativeRetainedEarnings += netProfitAfterTax;
    const dividendsPaid = Math.max(0, netProfitAfterTax * (constants.dividendPolicy || 85) / 100);
    cumulativeRetainedEarnings -= dividendsPaid;
    
    const shareCapital = initialEquity;
    const totalEquity = shareCapital + cumulativeRetainedEarnings;
    
    // === CASH FLOW STATEMENT ===
    
    // Operating activities (simplified)
    const operatingCashFlow = ebitda - taxExpense;
    
    // Investing activities
    const investingCashFlow = index === 0 ? -relevantCapex : 0;
    
    // Financing activities
    const debtProceeds = index === 0 ? (relevantCapex * 0.7) : 0; // 70% debt
    const equityRaised = index === 0 ? initialEquity : 0;
    const financingCashFlow = debtProceeds + equityRaised - principalRepayment - interestExpense - dividendsPaid;
    
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    cumulativeCashFlow += netCashFlow;

    return {
      year,
      viewBy,
      
      // P&L
      grossRevenue,
      totalOperatingExpenses,
      ebitda,
      annualDepreciation,
      ebit,
      interestExpense,
      profitBeforeTax,
      taxExpense,
      netProfitAfterTax,
      
      // Balance Sheet - Assets
      cashAndBankBalances,
      accountsReceivable,
      totalCurrentAssets,
      propertyPlantEquipment,
      totalNonCurrentAssets,
      totalAssets,
      
      // Balance Sheet - Liabilities
      accountsPayable,
      accruals,
      totalCurrentLiabilities,
      longTermDebt,
      totalNonCurrentLiabilities,
      totalLiabilities,
      
      // Balance Sheet - Equity
      shareCapital,
      retainedEarnings: cumulativeRetainedEarnings,
      totalEquity,
      
      // Cash Flow Statement
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      cumulativeCashFlow,
      
      // Additional data
      dividendsPaid,
      principalRepayment,
      
      // Key ratios
      debtToEquity: totalLiabilities > 0 ? totalLiabilities / Math.max(totalEquity, 1) : 0,
      currentRatio: totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 0,
      ebitdaMargin: grossRevenue > 0 ? (ebitda / grossRevenue) * 100 : 0,
      returnOnAssets: totalAssets > 0 ? (netProfitAfterTax / totalAssets) * 100 : 0
    };
  });

  return { forecast, assetPLs, portfolioPL };
};