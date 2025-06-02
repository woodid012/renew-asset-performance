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

// Main forecast calculation function
export const calculateForecastData = (portfolioData, scenario = 'base') => {
  const data = portfolioData;
  const years = Array.from(
    { length: data.constants.analysisEndYear - data.constants.analysisStartYear + 1 },
    (_, i) => data.constants.analysisStartYear + i
  );

  // Scenario adjustments
  const scenarioMultipliers = {
    base: { revenue: 1.0, costs: 1.0, growth: 0.02 },
    conservative: { revenue: 0.9, costs: 1.1, growth: 0.015 },
    optimistic: { revenue: 1.1, costs: 0.9, growth: 0.025 }
  };
  
  const multiplier = scenarioMultipliers[scenario] || scenarioMultipliers.base;

  let cumulativeRetainedEarnings = 0;
  let cumulativeCashFlow = data.constants.minimumCashBalance;
  let cumulativeDepreciation = 0;
  let previousYearDebt = 0;

  const forecast = years.map((year, index) => {
    // === PROFIT & LOSS STATEMENT ===
    
    // Revenue calculation (simplified - would use your actual revenue calculations)
    const totalCapacity = Object.values(data.assets).reduce((sum, asset) => sum + asset.capacity, 0);
    const revenueGrowth = 1 + (index * multiplier.growth); // Growth rate based on scenario
    const baseRevenue = totalCapacity * 0.5; // $0.5M per MW base
    const grossRevenue = baseRevenue * revenueGrowth * multiplier.revenue;
    
    // Operating expenses
    const totalAssetOpex = Object.values(data.assets).reduce((sum, asset) => {
      const assetCosts = data.constants.assetCosts[asset.name];
      const escalationFactor = Math.pow(1 + assetCosts.operatingCostEscalation / 100, index);
      return sum + (assetCosts.operatingCosts * escalationFactor * multiplier.costs);
    }, 0);
    
    const platformOpexFactor = Math.pow(1 + data.constants.platformOpexEscalation / 100, index);
    const corporateExpenses = data.constants.platformOpex * platformOpexFactor * multiplier.costs;
    
    const totalOperatingExpenses = totalAssetOpex + corporateExpenses;
    const ebitda = grossRevenue - totalOperatingExpenses;
    
    // Depreciation (straight-line method per AASB 116)
    const totalCapex = Object.values(data.assets).reduce((sum, asset) => {
      const assetCosts = data.constants.assetCosts[asset.name];
      return sum + assetCosts.capex;
    }, 0);
    
    const weightedDepreciationRate = Object.values(data.assets).reduce((weightedRate, asset) => {
      const assetCosts = data.constants.assetCosts[asset.name];
      const weight = assetCosts.capex / totalCapex;
      const depreciationPeriod = data.constants.deprecationPeriods[asset.type];
      return weightedRate + (weight / depreciationPeriod);
    }, 0);
    
    const annualDepreciation = totalCapex * weightedDepreciationRate;
    cumulativeDepreciation += annualDepreciation;
    
    const ebit = ebitda - annualDepreciation;
    
    // Interest expense
    const totalDebt = totalCapex * 0.7; // 70% gearing
    const weightedInterestRate = 0.06; // 6% weighted average
    const interestExpense = previousYearDebt * weightedInterestRate;
    
    const profitBeforeTax = ebit - interestExpense;
    const taxExpense = Math.max(0, profitBeforeTax * (data.constants.corporateTaxRate / 100));
    const netProfitAfterTax = profitBeforeTax - taxExpense;
    
    // === BALANCE SHEET ===
    
    // Assets
    const cashAndBankBalances = cumulativeCashFlow;
    const accountsReceivable = grossRevenue * 0.083; // 1 month of revenue
    const inventories = 0; // No inventory for renewable assets
    const totalCurrentAssets = cashAndBankBalances + accountsReceivable + inventories;
    
    const propertyPlantEquipment = totalCapex - cumulativeDepreciation;
    const intangibleAssets = 0;
    const investmentsAndOtherAssets = 0;
    const totalNonCurrentAssets = propertyPlantEquipment + intangibleAssets + investmentsAndOtherAssets;
    
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    
    // Liabilities
    const accountsPayable = totalOperatingExpenses * 0.083; // 1 month of expenses
    const shortTermDebt = 0;
    const accruals = taxExpense * 0.25; // Quarterly tax payments
    const totalCurrentLiabilities = accountsPayable + shortTermDebt + accruals;
    
    // Principal repayment calculation
    const principalRepayment = index > 0 ? totalDebt * 0.05 : 0; // 5% of total debt annually
    const currentYearDebt = Math.max(0, (index === 0 ? totalDebt : previousYearDebt) - principalRepayment);
    
    const longTermDebt = currentYearDebt;
    const deferredTaxLiabilities = 0; // Simplified
    const totalNonCurrentLiabilities = longTermDebt + deferredTaxLiabilities;
    
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    
    // Equity
    const shareCapital = totalCapex * 0.3; // 30% equity
    cumulativeRetainedEarnings += netProfitAfterTax;
    const dividendsPaid = netProfitAfterTax * (data.constants.dividendPolicy / 100);
    cumulativeRetainedEarnings -= dividendsPaid;
    
    const totalEquity = shareCapital + cumulativeRetainedEarnings;
    
    // === CASH FLOW STATEMENT ===
    
    // Operating activities
    const netProfitForCashFlow = netProfitAfterTax;
    const depreciationAddBack = annualDepreciation;
    const changeInReceivables = index === 0 ? -accountsReceivable : -(accountsReceivable - (years[index-1] ? grossRevenue * 0.083 * (1 - multiplier.growth) : 0));
    const changeInPayables = index === 0 ? accountsPayable : (accountsPayable - (totalOperatingExpenses * 0.083 * (1 - 0.025)));
    
    const operatingCashFlow = netProfitForCashFlow + depreciationAddBack - changeInReceivables + changeInPayables;
    
    // Investing activities
    const capitalExpenditures = index === 0 ? -totalCapex : 0;
    const investingCashFlow = capitalExpenditures;
    
    // Financing activities
    const proceedsFromDebt = index === 0 ? totalDebt : 0;
    const debtRepayments = -principalRepayment;
    const interestPaid = -interestExpense;
    const equityRaised = index === 0 ? shareCapital : 0;
    const dividendsPaidCash = -dividendsPaid;
    
    const financingCashFlow = proceedsFromDebt + debtRepayments + interestPaid + equityRaised + dividendsPaidCash;
    
    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
    cumulativeCashFlow += netCashFlow;
    
    // Update for next iteration
    previousYearDebt = currentYearDebt;
    
    return {
      year,
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
      inventories,
      totalCurrentAssets,
      propertyPlantEquipment,
      intangibleAssets,
      investmentsAndOtherAssets,
      totalNonCurrentAssets,
      totalAssets,
      
      // Balance Sheet - Liabilities
      accountsPayable,
      shortTermDebt,
      accruals,
      totalCurrentLiabilities,
      longTermDebt,
      deferredTaxLiabilities,
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
      
      // Additional calculations for cash flow components
      dividendsPaid,
      principalRepayment,
      
      // Key ratios for validation
      debtToEquity: totalLiabilities / totalEquity,
      currentRatio: totalCurrentAssets / totalCurrentLiabilities,
      ebitdaMargin: (ebitda / grossRevenue) * 100,
      returnOnAssets: (netProfitAfterTax / totalAssets) * 100
    };
  });

  return forecast;
};