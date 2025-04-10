import { calculateAssetRevenue } from './RevCalculations';
import { calculateStressRevenue } from './ValuationAnalysis_Calcs';

export const DEFAULT_CAPEX = {
  solar: 1.2,  // $M per MW
  wind: 2.5,   // $M per MW
  storage: 1.6, // $M per MW
  default: 2.0  // $M per MW
};

export const DEFAULT_OPEX = {
  solar: 0.014,    // $M per MW (midpoint of 8-20k)
  wind: 0.040,     // $M per MW (midpoint of 30-50k)
  storage: 0.015,  // $M per MW (midpoint of 10-20k)
  default: 0.030   // $M per MW
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
  storage: 18,
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
        calculatedGearing: DEFAULT_PROJECT_FINANCE.maxGearing,
        debtStructure: 'amortization' // Default debt structure
      }
    };
  }, {});

  if (Object.keys(assets).length >= 2) {
    initialValues.portfolio = {
      maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing + 0.05,
      targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant - 0.2,
      targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract - 0.05,
      interestRate: DEFAULT_PROJECT_FINANCE.interestRate - 0.005,
      tenorYears: DEFAULT_TENORS.default,
      capex: 0,  // This will be calculated from sum of assets
      calculatedGearing: (DEFAULT_PROJECT_FINANCE.maxGearing + 0.05),  // Initialize to max
      debtStructure: 'amortization' // Default debt structure
    };
  }

  return initialValues;
};

/**
 * Calculate debt service based on selected debt structure
 * @param {number} principal - Loan principal amount
 * @param {number} rate - Annual interest rate (decimal)
 * @param {number} years - Loan term in years
 * @param {string} structure - 'amortization' or 'sculpting'
 * @param {Array} cashFlows - Array of operating cash flows (only needed for sculpting)
 * @param {number} targetDSCR - Target debt service coverage ratio (only needed for sculpting)
 * @returns {number|Array} - Either annual debt service amount (amortization) or array of annual payments (sculpting)
 */
export const calculateDebtService = (principal, rate, years, structure = 'amortization', cashFlows = null, targetDSCR = null) => {
  // Standard amortization formula (existing implementation)
  if (structure === 'amortization' || !cashFlows || !targetDSCR) {
    const r = rate;
    const n = years;
    if (r === 0) return principal / n; // Edge case
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }
  
  // Debt sculpting implementation
  if (structure === 'sculpting') {
    return calculateSculptedDebtService(principal, rate, years, cashFlows, targetDSCR);
  }
  
  // Default to amortization if no valid structure provided
  const r = rate;
  const n = years;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

/**
 * Calculate debt service using sculpting approach
 * @param {number} principal - Loan principal amount
 * @param {number} rate - Annual interest rate (decimal)
 * @param {number} years - Loan tenor in years
 * @param {Array} cashFlows - Array of projected operating cash flows for each period
 * @param {number} targetDSCR - Target debt service coverage ratio
 * @returns {Array} - Array of debt service payments for each period
 */
const calculateSculptedDebtService = (principal, rate, years, cashFlows, targetDSCR) => {
  // Only use cash flows for the loan tenor period
  const relevantCashFlows = cashFlows.slice(0, years);
  
  // Calculate maximum debt service for each period based on target DSCR
  const maxDebtServiceByPeriod = relevantCashFlows.map(cf => {
    const operatingCashFlow = typeof cf === 'object' ? cf.operatingCashFlow : cf;
    return operatingCashFlow / targetDSCR;
  });
  
  // Initialize variables for sculpting calculation
  let remainingPrincipal = principal;
  const debtService = [];
  const interestPayments = [];
  const principalPayments = [];
  
  // Forward pass: calculate minimum debt service that maintains DSCR
  for (let i = 0; i < years; i++) {
    // Calculate interest for this period
    const interest = remainingPrincipal * rate;
    interestPayments.push(interest);
    
    // Calculate maximum principal payment based on max debt service
    const maxPrincipal = Math.max(0, maxDebtServiceByPeriod[i] - interest);
    
    // Ensure we don't pay more than remaining principal
    const principalPayment = Math.min(maxPrincipal, remainingPrincipal);
    principalPayments.push(principalPayment);
    
    // Calculate debt service for this period
    const periodDebtService = interest + principalPayment;
    debtService.push(periodDebtService);
    
    // Update remaining principal
    remainingPrincipal -= principalPayment;
  }
  
  // If there's still remaining principal after all periods, adjust
  if (remainingPrincipal > 0.01) {
    // Need to recalculate to ensure all principal is repaid
    // Use a scaling factor to proportionally increase principal payments
    const scalingFactor = (principal - remainingPrincipal + principal * 0.0001) / (principal - remainingPrincipal);
    
    remainingPrincipal = principal;
    const adjustedDebtService = [];
    
    for (let i = 0; i < years; i++) {
      // Scale up the principal payment
      const adjustedPrincipal = principalPayments[i] * scalingFactor;
      
      // Recalculate interest (which will be higher with more remaining principal)
      const adjustedInterest = remainingPrincipal * rate;
      
      // Calculate adjusted debt service
      const adjustedPeriodDebtService = adjustedInterest + adjustedPrincipal;
      adjustedDebtService.push(adjustedPeriodDebtService);
      
      // Update remaining principal
      remainingPrincipal -= adjustedPrincipal;
    }
    
    return adjustedDebtService;
  }
  
  return debtService;
};

/**
 * Calculate average annual debt service from sculpted payments
 * @param {Array} sculptedDebtService - Array of debt service payments
 * @returns {number} - Average annual debt service
 */
export const calculateAverageDebtService = (sculptedDebtService) => {
  if (!sculptedDebtService || !sculptedDebtService.length) return 0;
  return sculptedDebtService.reduce((sum, payment) => sum + payment, 0) / sculptedDebtService.length;
};

/**
 * Calculate DSCR for each period with sculpted debt service
 * @param {Array} cashFlows - Array of operating cash flows
 * @param {Array} sculptedDebtService - Array of debt service payments
 * @returns {Array} - Array of DSCR values for each period
 */
export const calculatePeriodDSCRs = (cashFlows, sculptedDebtService) => {
  if (!cashFlows || !sculptedDebtService) return [];
  
  return cashFlows.map((cf, i) => {
    const operatingCashFlow = typeof cf === 'object' ? cf.operatingCashFlow : cf;
    const debtService = sculptedDebtService[i] || 0;
    return debtService > 0 ? operatingCashFlow / debtService : 999;
  });
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
    tenorYears: projectValue.tenorYears,
    debtStructure: projectValue.debtStructure || 'amortization'
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
  
  // Get the debt structure
  const debtStructure = projectValue.debtStructure || 'amortization';

  while ((high - low) > tolerance && iterations < maxIterations) {
    const mid = (low + high) / 2;
    const debtAmount = projectValue.capex * mid;

    // Extract operating cash flows for sculpting
    const operatingCashFlows = cashFlows.slice(0, projectValue.tenorYears).map(cf => cf.operatingCashFlow);
    
    // Calculate blended target DSCR based on revenue mix
    const blendedTargetDSCR = cashFlows.slice(0, projectValue.tenorYears).map(cf => {
      const totalRevenue = cf.contractedRevenue + cf.merchantRevenue;
      if (totalRevenue === 0) return targetDSCRMerchant; // Default to merchant if no revenue
      
      const contractedShare = cf.contractedRevenue / totalRevenue;
      const merchantShare = cf.merchantRevenue / totalRevenue;
      
      return (contractedShare * targetDSCRContract + merchantShare * targetDSCRMerchant);
    });

    let annualDebtService;
    let dscrValues = [];
    let failedYears = 0;
    
    if (debtStructure === 'amortization') {
      // For amortization, calculate a constant annual debt service
      annualDebtService = calculateDebtService(
        debtAmount, 
        projectValue.interestRate, 
        projectValue.tenorYears
      );
      
      // Calculate DSCR for each year
      dscrValues = cashFlows.slice(0, projectValue.tenorYears).map((cf, idx) => {
        const dscr = calculateDSCR(cf.operatingCashFlow, annualDebtService);
        const requiredDSCR = blendedTargetDSCR[idx];
        
        if (dscr < requiredDSCR) {
          failedYears++;
        }
        
        return { dscr, requiredDSCR };
      });
    } else if (debtStructure === 'sculpting') {
      // For sculpting, calculate customized debt service for each year
      const sculptedDebtService = calculateSculptedDebtService(
        debtAmount,
        projectValue.interestRate,
        projectValue.tenorYears,
        operatingCashFlows,
        Math.min(...blendedTargetDSCR) // Use the minimum DSCR as the target
      );
      
      // Check if any year's DSCR falls below the required target DSCR
      cashFlows.slice(0, projectValue.tenorYears).forEach((cf, idx) => {
        const dscr = calculateDSCR(cf.operatingCashFlow, sculptedDebtService[idx]);
        const requiredDSCR = blendedTargetDSCR[idx];
        
        if (dscr < requiredDSCR) {
          failedYears++;
        }
        
        dscrValues.push({ dscr, requiredDSCR });
      });
    }
    
    // Log every iteration for debugging
    console.log('Iteration:', iterations, {
      gearing: mid,
      debtAmount,
      failedYears,
      dscrValues: dscrValues.slice(0, 5) // Just show first 5 years
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
    
    // Use the debt structure from asset costs
    const debtStructure = assetCosts.debtStructure || 'amortization';
    
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
          tenorYears: assetCosts.tenorYears,
          debtStructure: debtStructure
        },
        assetCosts.maxGearing,
        assetCosts.targetDSCRContract,
        assetCosts.targetDSCRMerchant
      );
    }

    const debtAmount = capex * gearing;
    
    // Handle debt service calculation based on structure
    let annualDebtService;
    let debtServiceByYear = [];
    
    if (debtStructure === 'amortization') {
      // Standard amortization with equal payments
      annualDebtService = calculateDebtService(
        debtAmount, 
        assetCosts.interestRate, 
        assetCosts.tenorYears
      );
      
      // Fill array with same value for consistent handling
      debtServiceByYear = Array(assetCosts.tenorYears).fill(annualDebtService);
    } else if (debtStructure === 'sculpting') {
      // Extract operating cash flows
      const operatingCashFlows = cashFlows.slice(0, assetCosts.tenorYears).map(cf => cf.operatingCashFlow);
      
      // Calculate blended target DSCR
      const blendedTargetDSCR = cashFlows.slice(0, assetCosts.tenorYears).map(cf => {
        const totalRevenue = cf.contractedRevenue + cf.merchantRevenue;
        if (totalRevenue === 0) return assetCosts.targetDSCRMerchant;
        
        const contractedShare = cf.contractedRevenue / totalRevenue;
        const merchantShare = cf.merchantRevenue / totalRevenue;
        
        return (contractedShare * assetCosts.targetDSCRContract + merchantShare * assetCosts.targetDSCRMerchant);
      });
      
      // Use minimum DSCR as target for sculpting
      const minTargetDSCR = Math.min(...blendedTargetDSCR);
      
      // Calculate sculpted debt service
      debtServiceByYear = calculateSculptedDebtService(
        debtAmount,
        assetCosts.interestRate,
        assetCosts.tenorYears,
        operatingCashFlows,
        minTargetDSCR
      );
      
      // Calculate average for metrics display
      annualDebtService = calculateAverageDebtService(debtServiceByYear);
    } else {
      // Default to amortization
      annualDebtService = calculateDebtService(
        debtAmount, 
        assetCosts.interestRate, 
        assetCosts.tenorYears
      );
      debtServiceByYear = Array(assetCosts.tenorYears).fill(annualDebtService);
    }

    // Add debt service to cash flows
    cashFlows.forEach((cf, index) => {
      const yearDebtService = index < assetCosts.tenorYears ? 
        (debtStructure === 'sculpting' ? debtServiceByYear[index] : annualDebtService) : 0;
      
      cf.debtService = -yearDebtService;
      cf.equityCashFlow = cf.operatingCashFlow - yearDebtService;
    });

    const equityCashFlows = [-capex * (1 - gearing), ...cashFlows.map(cf => cf.equityCashFlow)];
    
    // Calculate DSCRs
    const dscrValues = cashFlows
      .slice(0, assetCosts.tenorYears)
      .map((cf, index) => {
        const debtService = debtStructure === 'sculpting' ? 
          debtServiceByYear[index] : annualDebtService;
        return calculateDSCR(cf.operatingCashFlow, debtService);
      });
    
    const minDSCR = Math.min(...dscrValues.filter(dscr => dscr !== 999));

    individualMetrics[asset.name] = {
      capex,
      calculatedGearing: gearing,
      debtAmount,
      annualDebtService,
      debtServiceByYear,
      debtStructure,
      minDSCR,
      cashFlows,
      equityCashFlows,
      dscrValues
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

    // Get the debt structure from portfolio settings
    const portfolioDebtStructure = constants.assetCosts.portfolio?.debtStructure || 'amortization';

    // Calculate portfolio gearing using the same solver but with combined cash flows
    const portfolioGearing = solveGearingFlag ? 
      solveGearing(
        portfolioCashFlows,
        { 
          ...portfolioValue, 
          capex: totalCapex,
          debtStructure: portfolioDebtStructure 
        },
        portfolioValue.maxGearing,
        portfolioValue.targetDSCRContract,
        portfolioValue.targetDSCRMerchant,  // Include merchant DSCR target
        true   // Is portfolio
      ) : 
      (projectValues.portfolio?.calculatedGearing || portfolioValue.maxGearing || DEFAULT_PROJECT_FINANCE.maxGearing);

    // Calculate total remaining debt at refinancing date by looking at each asset
    const totalRemainingDebt = Object.entries(individualMetrics).reduce((sum, [assetName, metrics]) => {
      // For each asset, find how much debt is remaining at portfolio start year
      const refinanceYearFlow = metrics.cashFlows.find(cf => cf.year === portfolioStartYear);
      if (!refinanceYearFlow) return sum;

      // Calculate remaining principal for this asset
      const assetStartYear = metrics.cashFlows[0].year;
      const yearsToRefinance = portfolioStartYear - assetStartYear;
      
      // If the asset has started by refinance date
      if (yearsToRefinance >= 0) {
        const originalDebt = metrics.debtAmount;
        const rate = constants.assetCosts[assetName]?.interestRate || DEFAULT_PROJECT_FINANCE.interestRate;
        const tenor = constants.assetCosts[assetName]?.tenorYears || DEFAULT_PROJECT_FINANCE.tenorYears;
        
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
      effectivePortfolioGearing,
      portfolioDebtStructure
    });

    // Calculate portfolio debt service based on structure
    let portfolioDebtService;
    let portfolioDebtServiceByYear = [];

    if (portfolioDebtStructure === 'amortization') {
      // Standard amortization
      portfolioDebtService = calculateDebtService(
        portfolioDebtAmount,
        portfolioValue.interestRate,
        portfolioValue.tenorYears
      );
      portfolioDebtServiceByYear = Array(portfolioValue.tenorYears).fill(portfolioDebtService);
    } else if (portfolioDebtStructure === 'sculpting') {
      // Extract operating cash flows for sculpting calculation
      const refinanceStartIndex = portfolioCashFlows.findIndex(cf => cf.year === portfolioStartYear);
      if (refinanceStartIndex >= 0) {
        const refinanceCashFlows = portfolioCashFlows
          .slice(refinanceStartIndex, refinanceStartIndex + portfolioValue.tenorYears)
          .map(cf => cf.operatingCashFlow);
        
        // Calculate blended DSCR targets
        const blendedTargetDSCR = portfolioCashFlows
          .slice(refinanceStartIndex, refinanceStartIndex + portfolioValue.tenorYears)
          .map(cf => {
            const totalRevenue = cf.contractedRevenue + cf.merchantRevenue;
            if (totalRevenue === 0) return portfolioValue.targetDSCRMerchant;
            
            const contractedShare = cf.contractedRevenue / totalRevenue;
            const merchantShare = cf.merchantRevenue / totalRevenue;
            
            return (contractedShare * portfolioValue.targetDSCRContract + 
                   merchantShare * portfolioValue.targetDSCRMerchant);
          });
        
        // Use minimum DSCR for sculpting
        const minTargetDSCR = Math.min(...blendedTargetDSCR);
        
        // Calculate sculpted debt service
        portfolioDebtServiceByYear = calculateSculptedDebtService(
          portfolioDebtAmount,
          portfolioValue.interestRate,
          portfolioValue.tenorYears,
          refinanceCashFlows,
          minTargetDSCR
        );
        
        // Calculate average for metrics
        portfolioDebtService = calculateAverageDebtService(portfolioDebtServiceByYear);
      } else {
        // Fallback to amortization if we can't find the refinance year
        portfolioDebtService = calculateDebtService(
          portfolioDebtAmount,
          portfolioValue.interestRate,
          portfolioValue.tenorYears
        );
        portfolioDebtServiceByYear = Array(portfolioValue.tenorYears).fill(portfolioDebtService);
      }
    } else {
      // Default to amortization
      portfolioDebtService = calculateDebtService(
        portfolioDebtAmount,
        portfolioValue.interestRate,
        portfolioValue.tenorYears
      );
      portfolioDebtServiceByYear = Array(portfolioValue.tenorYears).fill(portfolioDebtService);
    }

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
        const refinanceYear = cf.year - portfolioStartYear;
        const yearDebtService = refinanceYear >= 0 && refinanceYear < portfolioValue.tenorYears ?
          (portfolioDebtStructure === 'sculpting' ? 
           -portfolioDebtServiceByYear[refinanceYear] : 
           -portfolioDebtService) : 0;
        
        cf.debtService = yearDebtService;
        cf.refinancePhase = 'portfolio';
      }
      cf.equityCashFlow = cf.operatingCashFlow + cf.debtService; // Note: debtService is already negative
    });

    // Calculate portfolio DSCRs
    const portfolioDSCRs = [];
    portfolioCashFlows.forEach(cf => {
      if (cf.year >= portfolioStartYear && 
          cf.year < portfolioStartYear + portfolioValue.tenorYears) {
        const refinanceYear = cf.year - portfolioStartYear;
        const debtService = portfolioDebtStructure === 'sculpting' ? 
          portfolioDebtServiceByYear[refinanceYear] : portfolioDebtService;
        
        if (debtService > 0) {
          portfolioDSCRs.push(cf.operatingCashFlow / debtService);
        }
      }
    });
    
    const portfolioMinDSCR = portfolioDSCRs.length > 0 ? 
      Math.min(...portfolioDSCRs) : portfolioValue.targetDSCRContract;

    const portfolioEquityCashFlows = [-totalCapex * (1 - portfolioGearing), ...portfolioCashFlows.map(cf => cf.equityCashFlow)];

    metrics.portfolio = {
      capex: totalCapex,
      calculatedGearing: portfolioGearing,
      debtAmount: portfolioDebtAmount,
      annualDebtService: portfolioDebtService,
      debtServiceByYear: portfolioDebtServiceByYear,
      debtStructure: portfolioDebtStructure,
      minDSCR: portfolioMinDSCR,
      cashFlows: portfolioCashFlows,
      equityCashFlows: portfolioEquityCashFlows,
      dscrValues: portfolioDSCRs
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