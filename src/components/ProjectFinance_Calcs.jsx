import { calculateAssetRevenue } from './RevCalculations';
import { calculateStressRevenue } from './ValuationAnalysis_Calcs';

export const DEFAULT_CAPEX = {
  solar: 1.2,  // $M per MW
  wind: 2.5,   // $M per MW
  battery: 1.6, // $M per MW (midpoint of 1.2-2.0M range)
  default: 2.0  // $M per MW
};

export const DEFAULT_OPEX = {
  solar: 0.014,    // $M per MW (midpoint of 8-20k)
  wind: 0.040,     // $M per MW (midpoint of 30-50k)
  battery: 0.015,  // $M per MW (midpoint of 10-20k)
  default: 0.040   // Using wind as default
};

export const DEFAULT_PROJECT_FINANCE = {
  maxGearing: 0.70,
  targetDSCRMerchant: 2.00,
  targetDSCRContract: 1.35,
  interestRate: 0.060,
  opexEscalation: 2.5,
  structuring: 0.01,
  commitment: 0.005,
};

export const DEFAULT_TENORS = {
  solar: 22,
  wind: 22,
  battery: 18,
  default: 20
};

export const initializeProjectValues = (assets) => {
  const initialValues = Object.values(assets).reduce((acc, asset) => {
    const defaultCapex = DEFAULT_CAPEX[asset.type] || DEFAULT_CAPEX.default;
    const defaultOpex = DEFAULT_OPEX[asset.type] || DEFAULT_OPEX.default;
    const defaultTenor = DEFAULT_TENORS[asset.type] || DEFAULT_TENORS.default;
    const capex = defaultCapex * asset.capacity;

    return {
      ...acc,
      [asset.name]: {
        capex: Number(capex.toFixed(1)),
        maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing,
        targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant,
        targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract,
        interestRate: DEFAULT_PROJECT_FINANCE.interestRate,
        tenorYears: defaultTenor,
        opex: Number((defaultOpex * asset.capacity).toFixed(1)),
        opexEscalation: DEFAULT_PROJECT_FINANCE.opexEscalation,
        calculatedGearing: DEFAULT_PROJECT_FINANCE.maxGearing
      }
    };
  }, {});

  if (Object.keys(assets).length >= 2) {
    initialValues.portfolio = {
      maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing + 0.05,
      targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant - 0.2,
      targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract - 0.05,
      interestRate: DEFAULT_PROJECT_FINANCE.interestRate - 0.005,
      tenorYears: DEFAULT_PROJECT_FINANCE.tenorYears,
      capex: 0,  // This will be calculated from sum of assets
      calculatedGearing: (DEFAULT_PROJECT_FINANCE.maxGearing + 0.05)  // Initialize to max
    };
  }

  return initialValues;
};

const calculateDebtService = (principal, rate, years) => {
  const r = rate;
  const n = years;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

const calculateDSCR = (cashFlow, debtService) => {
  return debtService > 0 ? cashFlow / debtService : 999;
};

const solveGearing = (
  cashFlows, 
  projectValue,
  maxGearing,
  targetDSCRContract,
  targetDSCRMerchant = null,
  isPortfolio = false
) => {
  console.log('Solving gearing for:', isPortfolio ? 'Portfolio' : 'Asset');
  console.log('Initial params:', {
    maxGearing,
    targetDSCRContract,
    targetDSCRMerchant,
    capex: projectValue.capex,
    interestRate: projectValue.interestRate,
    tenorYears: projectValue.tenorYears
  });

  // Log first few years of cash flows for debugging
  console.log('First 5 years of cash flows:', cashFlows.slice(0, 5).map(cf => ({
    year: cf.year,
    operatingCashFlow: cf.operatingCashFlow,
    contractedRevenue: cf.contractedRevenue,
    merchantRevenue: cf.merchantRevenue
  })));

  const tolerance = 0.0001;
  let low = 0;
  let high = maxGearing;
  let iterations = 0;
  const maxIterations = 50;

  while ((high - low) > tolerance && iterations < maxIterations) {
    const mid = (low + high) / 2;
    const debtAmount = projectValue.capex * mid;
    const annualDebtService = calculateDebtService(
      debtAmount, 
      projectValue.interestRate, 
      projectValue.tenorYears
    );

    let failedYears = 0;
    
    // Only evaluate during debt tenor
    let dscrValues = [];
    let requiredDSCRs = [];
    let yearlyDetails = [];
    
    cashFlows.slice(0, projectValue.tenorYears).forEach((cf, yearIndex) => {
      const dscr = calculateDSCR(cf.operatingCashFlow, annualDebtService);
      dscrValues.push(dscr);
      
      const requiredDSCR = calculateRequiredDSCR(
        cf.contractedRevenue,
        cf.merchantRevenue,
        targetDSCRContract,
        targetDSCRMerchant
      );
      requiredDSCRs.push(requiredDSCR);
      
      yearlyDetails.push({
        year: cf.year,
        dscr,
        requiredDSCR,
        operatingCashFlow: cf.operatingCashFlow,
        contractedShare: cf.contractedRevenue / (cf.contractedRevenue + cf.merchantRevenue),
        failed: dscr < requiredDSCR
      });
      
      if (dscr < requiredDSCR) {
        failedYears++;
      }
    });
    
    // Log every iteration for debugging
    console.log('Iteration:', iterations, {
      gearing: mid,
      debtAmount,
      annualDebtService,
      failedYears,
      yearlyDetails: yearlyDetails.slice(0, 5) // Just show first 5 years
    });

    if (failedYears > 0) {
      high = mid;
    } else {
      low = mid;
    }
    
    iterations++;
  }

  const finalGearing = Math.min((low + high) / 2, maxGearing);
  console.log('Final gearing solved:', finalGearing);
  return finalGearing;
};
const calculateRequiredDSCR = (contractedRevenue, merchantRevenue, targetDSCRContract, targetDSCRMerchant) => {
  const totalRevenue = contractedRevenue + merchantRevenue;
  if (totalRevenue === 0) return targetDSCRMerchant; // Default to merchant if no revenue
  
  const contractedShare = contractedRevenue / totalRevenue;
  const merchantShare = merchantRevenue / totalRevenue;
  
  return (contractedShare * targetDSCRContract + merchantShare * targetDSCRMerchant);
};

// In calculateProjectMetrics
export const calculateProjectMetrics = (
  assets,
  projectValues,
  constants,
  getMerchantPrice,
  selectedRevenueCase = 'base',
  solveGearingFlag = false
) => {
  const metrics = {};
  const individualMetrics = {};

  if (!projectValues) return {};
  
  // First calculate individual project metrics
  Object.values(assets).forEach(asset => {
    const assetCosts = constants.assetCosts[asset.name] || {};
    const projectValue = projectValues[asset.name] || {};
    
    // Use capex from assetCosts instead of projectValues
    const capex = assetCosts.capex || 0;
    
    const cashFlows = [];
    const assetStartYear = new Date(asset.assetStartDate).getFullYear();
    const assetEndYear = assetStartYear + (asset.assetLife || 30);

    // Calculate cash flows first as we need them for gearing calculation
    for (let year = assetStartYear; year < assetEndYear; year++) {
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
      const contractedRevenue = stressedRevenue.contractedGreen + stressedRevenue.contractedEnergy;
      const merchantRevenue = stressedRevenue.merchantGreen + stressedRevenue.merchantEnergy;
      const yearRevenue = contractedRevenue + merchantRevenue;
      
      const yearIndex = year - assetStartYear;
      
      // Use unified operating cost fields from assetCosts
      const operatingCostInflation = Math.pow(1 + (assetCosts.operatingCostEscalation || 2.5)/100, yearIndex);
      const yearOperatingCosts = (assetCosts.operatingCosts || 0) * operatingCostInflation;
      
      const operatingCashFlow = yearRevenue - yearOperatingCosts;

      cashFlows.push({
        year,
        revenue: yearRevenue,
        contractedRevenue,
        merchantRevenue,
        opex: -yearOperatingCosts,
        operatingCashFlow
      });
    }
    
    // Calculate or use existing gearing
    let gearing = projectValue.calculatedGearing;
    if (solveGearingFlag) {
      gearing = solveGearing(
        cashFlows,
        {
          ...projectValue,
          capex: capex,  // Use capex from assetCosts
          maxGearing: assetCosts.maxGearing,
          targetDSCRContract: assetCosts.targetDSCRContract,
          targetDSCRMerchant: assetCosts.targetDSCRMerchant,
          interestRate: assetCosts.interestRate,
          tenorYears: assetCosts.tenorYears
        },
        assetCosts.maxGearing,
        assetCosts.targetDSCRContract,
        assetCosts.targetDSCRMerchant
      );
    }

    const debtAmount = capex * gearing;
    const annualDebtService = calculateDebtService(
      debtAmount, 
      assetCosts.interestRate, 
      assetCosts.tenorYears
    );

    // Add debt service to cash flows
    cashFlows.forEach(cf => {
      const yearDebtService = cf.year < (assetStartYear + assetCosts.tenorYears) ? annualDebtService : 0;
      cf.debtService = -yearDebtService;
      cf.equityCashFlow = cf.operatingCashFlow - yearDebtService;
    });

    const equityCashFlows = [-capex * (1 - gearing), ...cashFlows.map(cf => cf.equityCashFlow)];
    const dscrValues = cashFlows.map(cf => calculateDSCR(cf.operatingCashFlow, -cf.debtService));
    const minDSCR = Math.min(...dscrValues.filter(dscr => dscr !== 999));

    individualMetrics[asset.name] = {
      capex,
      calculatedGearing: gearing,
      debtAmount,
      annualDebtService,
      minDSCR,
      cashFlows,
      equityCashFlows
    };
  });

  // Copy individual metrics to the output
  Object.assign(metrics, individualMetrics);

  // Calculate portfolio metrics if there are multiple assets
  if (Object.keys(assets).length >= 2) {
    const portfolioValue = projectValues.portfolio || {};
    const totalCapex = Object.values(individualMetrics).reduce((sum, m) => sum + m.capex, 0);
    
    // Add this new block
    const portfolioStartYear = Math.max(...Object.values(assets).map(asset => 
      new Date(asset.assetStartDate).getFullYear()
    ));

    // Get the range of years across all projects
    const startYear = Math.min(...Object.values(individualMetrics).flatMap(m => m.cashFlows.map(cf => cf.year)));
    const endYear = Math.max(...Object.values(individualMetrics).flatMap(m => m.cashFlows.map(cf => cf.year)));
    
    // Combine all project cash flows
    const portfolioCashFlows = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearlySum = {
        year,
        revenue: 0,
        contractedRevenue: 0,
        merchantRevenue: 0,
        opex: 0,
        operatingCashFlow: 0
      };

      // Sum up cash flows from all projects for this year
      Object.values(individualMetrics).forEach(projectMetrics => {
        const yearCashFlow = projectMetrics.cashFlows.find(cf => cf.year === year);
        if (yearCashFlow) {
          yearlySum.revenue += yearCashFlow.revenue;
          yearlySum.contractedRevenue += yearCashFlow.contractedRevenue;
          yearlySum.merchantRevenue += yearCashFlow.merchantRevenue;
          yearlySum.opex += yearCashFlow.opex;
          yearlySum.operatingCashFlow += yearCashFlow.operatingCashFlow;
        }
      });

      portfolioCashFlows.push(yearlySum);
    }

    console.log("Portfolio debugging:", {
      portfolioCashFlows,
      portfolioValue,
      totalCapex,
      maxGearing: portfolioValue.maxGearing,
      targetDSCRs: {
        contract: portfolioValue.targetDSCRContract,
        merchant: portfolioValue.targetDSCRMerchant
      }
    });

    // Calculate portfolio gearing using the same solver but with combined cash flows
  const portfolioGearing = solveGearingFlag ? 
  solveGearing(
    portfolioCashFlows,
    { ...portfolioValue, capex: totalCapex },
    portfolioValue.maxGearing,
    portfolioValue.targetDSCRContract,
    portfolioValue.targetDSCRMerchant,  // Include merchant DSCR target
    true   // Is portfolio
  ) : 
  (projectValues.portfolio?.calculatedGearing || portfolioValue.maxGearing || DEFAULT_PROJECT_FINANCE.maxGearing);

// Calculate total remaining debt at refinancing date by looking at each asset
const totalRemainingDebt = Object.entries(individualMetrics).reduce((sum, [assetName, metrics]) => {
  // For each asset, find how much debt is remaining at portfolio start year (2029)
  const refinanceYearFlow = metrics.cashFlows.find(cf => cf.year === portfolioStartYear);
  if (!refinanceYearFlow) return sum;

  // Calculate remaining principal for this asset
  const assetStartYear = metrics.cashFlows[0].year;
  const yearsToRefinance = portfolioStartYear - assetStartYear;
  
  // If the asset has started by refinance date
  if (yearsToRefinance >= 0) {
    const originalDebt = metrics.debtAmount;
    const rate = projectValues[assetName]?.interestRate || DEFAULT_PROJECT_FINANCE.interestRate;
    const tenor = projectValues[assetName]?.tenorYears || DEFAULT_PROJECT_FINANCE.tenorYears;
    
    // Calculate remaining loan balance at refinance date using standard amortization
    const payment = calculateDebtService(originalDebt, rate, tenor);
    const remainingPrincipal = originalDebt * 
      Math.pow(1 + rate, yearsToRefinance) - 
      payment * (Math.pow(1 + rate, yearsToRefinance) - 1) / rate;
    
    console.log(`Remaining debt for ${assetName} at refinance:`, {
      originalDebt,
      yearsToRefinance,
      remainingPrincipal
    });
    
    return sum + Math.max(0, remainingPrincipal);
  }
  return sum;
}, 0);

// Use the total remaining debt as the portfolio debt amount
const portfolioDebtAmount = totalRemainingDebt;
const effectivePortfolioGearing = portfolioDebtAmount / totalCapex; // For reference only
console.log('Portfolio refinancing details:', {
  portfolioStartYear,
  totalRemainingDebt,
  effectivePortfolioGearing
});

const portfolioDebtService = calculateDebtService(
  portfolioDebtAmount,
  portfolioValue.interestRate,
  portfolioValue.tenorYears
);

    // Add debt service to portfolio cash flows
    portfolioCashFlows.forEach(cf => {
        if (cf.year < portfolioStartYear) {
          // Before portfolio refinancing, use sum of individual debt services
          const individualDebtService = Object.values(individualMetrics)
            .reduce((sum, projectMetrics) => {
              const yearCashFlow = projectMetrics.cashFlows.find(pcf => pcf.year === cf.year);
              return sum + (yearCashFlow?.debtService || 0);
            }, 0);
          cf.debtService = individualDebtService;
          cf.refinancePhase = 'individual';
        } else {
          // After portfolio refinancing starts
          const yearDebtService = cf.year < (portfolioStartYear + portfolioValue.tenorYears) ? portfolioDebtService : 0;
          cf.debtService = -yearDebtService;
          cf.refinancePhase = 'portfolio';
        }
        cf.equityCashFlow = cf.operatingCashFlow + cf.debtService; // Note: debtService is already negative
      });

    const portfolioEquityCashFlows = [-totalCapex * (1 - portfolioGearing), ...portfolioCashFlows.map(cf => cf.equityCashFlow)];
    const portfolioDSCRs = portfolioCashFlows
      .filter(cf => cf.debtService !== 0)
      .map(cf => calculateDSCR(cf.operatingCashFlow, -cf.debtService));
    const portfolioMinDSCR = Math.min(...portfolioDSCRs.filter(dscr => dscr !== 999));

    metrics.portfolio = {
      capex: totalCapex,
      calculatedGearing: portfolioGearing,
      debtAmount: portfolioDebtAmount,
      annualDebtService: portfolioDebtService,
      minDSCR: portfolioMinDSCR,
      cashFlows: portfolioCashFlows,
      equityCashFlows: portfolioEquityCashFlows
    };
  }

  return metrics;
};

export const calculateIRR = (cashflows, guess = 0.1) => {
  const maxIterations = 1000;
  const tolerance = 0.000001;
  
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNPV = 0;
    
    for (let j = 0; j < cashflows.length; j++) {
      const factor = Math.pow(1 + rate, j);
      npv += cashflows[j] / factor;
      if (j > 0) {
        derivativeNPV -= (j * cashflows[j]) / (factor * (1 + rate));
      }
    }
    
    if (Math.abs(npv) < tolerance) {
      return rate;
    }
    
    rate = rate - npv / derivativeNPV;
    
    if (rate < -1) return null;
  }
  
  return null;
};