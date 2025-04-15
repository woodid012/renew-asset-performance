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
  targetDSCRMerchant: 2.0,
  targetDSCRContract: 1.35,
  interestRate: 0.06,
  tenorYears: 15,
  opexEscalation: 2.5,
  structuring: 0.01,
  commitment: 0.005,
};

export const initializeProjectValues = (assets) => {
  const initialValues = Object.values(assets).reduce((acc, asset) => {
    const defaultCapex = DEFAULT_CAPEX[asset.type] || DEFAULT_CAPEX.default;
    const defaultOpex = DEFAULT_OPEX[asset.type] || DEFAULT_OPEX.default;
    const capex = defaultCapex * asset.capacity;

    return {
      ...acc,
      [asset.name]: {
        capex: Number(capex.toFixed(1)),
        maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing,
        targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant,
        targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract,
        interestRate: DEFAULT_PROJECT_FINANCE.interestRate,
        tenorYears: DEFAULT_PROJECT_FINANCE.tenorYears,
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
      tenorYears: DEFAULT_PROJECT_FINANCE.tenorYears
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
  asset,
  projectValue,
  constants,
  getMerchantPrice,
  selectedRevenueCase
) => {
  const tolerance = 0.0001;
  let low = 0;
  let high = projectValue.maxGearing;
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

    const assetStartYear = new Date(asset.assetStartDate).getFullYear();
    // Only evaluate DSCRs during debt tenor period
    const dscrsByYear = Array.from({ length: projectValue.tenorYears }, (_, yearIndex) => {
      const year = assetStartYear + yearIndex;
      // Skip if before start date
      if (year < assetStartYear) return null;

      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
      
      // Separate contracted and merchant revenues
      const contractedRevenue = stressedRevenue.contractedGreen + stressedRevenue.contractedEnergy;
      const merchantRevenue = stressedRevenue.merchantGreen + stressedRevenue.merchantEnergy;
      const totalRevenue = contractedRevenue + merchantRevenue;
      
      // Calculate OPEX
      const opexInflation = Math.pow(1 + projectValue.opexEscalation/100, yearIndex);
      const yearOpex = projectValue.opex * opexInflation;
      
      // Calculate blended DSCR target based on revenue mix
      const contractedShare = totalRevenue > 0 ? contractedRevenue / totalRevenue : 0;
      const merchantShare = totalRevenue > 0 ? merchantRevenue / totalRevenue : 0;
      
      // Calculate CFADS for each revenue stream
      const contractedCFADS = contractedRevenue - (yearOpex * contractedShare);
      const merchantCFADS = merchantRevenue - (yearOpex * merchantShare);
      const totalCFADS = contractedCFADS + merchantCFADS;
      
      // Calculate actual DSCR
      const actualDSCR = calculateDSCR(totalCFADS, annualDebtService);
      
      // Calculate required DSCR based on revenue mix
      const requiredDSCR = (
        contractedShare * projectValue.targetDSCRContract + 
        merchantShare * projectValue.targetDSCRMerchant
      );

      return {
        year,
        actualDSCR,
        requiredDSCR,
        contractedShare,
        merchantShare,
        totalCFADS,
        annualDebtService
      };
    });

    // Compare DSCR at each year interval during debt period
    let failedYears = 0;
    let totalDSCRShortfall = 0;
    
    // Filter out any null entries and only evaluate years during debt period
    const validYears = dscrsByYear.filter(year => year !== null);
    
    validYears.forEach(year => {
      if (year.actualDSCR < year.requiredDSCR) {
        failedYears++;
        totalDSCRShortfall += (year.requiredDSCR - year.actualDSCR) / year.requiredDSCR;
      }
    });

    // If we have any failed years, we need less debt
    if (failedYears > 0) {
      high = mid;
    } else {
      // All years pass - see if we can take on more debt
      // Calculate how close we are to the required DSCRs
      const averageExcess = validYears.reduce((acc, year) => 
        acc + (year.actualDSCR - year.requiredDSCR) / year.requiredDSCR, 0
      ) / validYears.length;
      
      if (averageExcess < 0.001) { // Within 0.1% of target
        break;
      } else {
        low = mid;
      }
    }
    
    iterations++;
  }

  const finalGearing = Math.min((low + high) / 2, projectValue.maxGearing);
  return finalGearing;
};
export const calculateProjectMetrics = (
  assets,
  projectValues,
  constants,
  getMerchantPrice,
  selectedRevenueCase = 'base',
  solveGearingFlag = false,
  solvePortfolio = false
) => {
  const metrics = {};
  const individualMetrics = {};

  if (!projectValues) return {};
  
  // First calculate individual project metrics
  Object.values(assets).forEach(asset => {
    const projectValue = projectValues[asset.name] || {};
    const capex = projectValue.capex || 0;
    
    let gearing = projectValue.calculatedGearing;
    if (solveGearingFlag) {
      gearing = solveGearing(
        asset,
        projectValue,
        constants,
        getMerchantPrice,
        selectedRevenueCase
      );
    }

    const debtAmount = capex * gearing;
    const annualDebtService = calculateDebtService(
      debtAmount, 
      projectValue.interestRate, 
      projectValue.tenorYears
    );

    const cashFlows = [];
    const assetStartYear = new Date(asset.assetStartDate).getFullYear();
    const assetEndYear = assetStartYear + (asset.assetLife || 30);

    for (let year = assetStartYear; year < assetEndYear; year++) {
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
      const yearRevenue = stressedRevenue.contractedGreen + stressedRevenue.contractedEnergy + 
                         stressedRevenue.merchantGreen + stressedRevenue.merchantEnergy;
      
      const yearIndex = year - assetStartYear;
      const opexInflation = Math.pow(1 + projectValue.opexEscalation/100, yearIndex);
      const yearOpex = projectValue.opex * opexInflation;
      
      const operatingCashFlow = yearRevenue - yearOpex;
      const yearDebtService = year < (assetStartYear + projectValue.tenorYears) ? annualDebtService : 0;
      const equityCashFlow = operatingCashFlow - yearDebtService;

      cashFlows.push({
        year,
        revenue: yearRevenue,
        opex: -yearOpex,
        operatingCashFlow,
        debtService: -yearDebtService,
        equityCashFlow
      });
    }

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
    const totalCapex = Object.values(individualMetrics).reduce((sum, m) => sum + m.capex, 0);
    const portfolioValue = projectValues.portfolio || {};
    const portfolioGearing = solveGearingFlag && portfolioValue.maxGearing ? 
      Math.min(portfolioValue.maxGearing, portfolioValue.maxGearing) : 
      (portfolioValue.maxGearing || DEFAULT_PROJECT_FINANCE.maxGearing);

    const portfolioDebtAmount = totalCapex * portfolioGearing;
    const portfolioDebtService = calculateDebtService(
      portfolioDebtAmount,
      portfolioValue.interestRate || DEFAULT_PROJECT_FINANCE.interestRate,
      portfolioValue.tenorYears || DEFAULT_PROJECT_FINANCE.tenorYears
    );

    // Get the range of years across all projects
    const startYear = Math.min(...Object.values(individualMetrics).flatMap(m => m.cashFlows.map(cf => cf.year)));
    const endYear = Math.max(...Object.values(individualMetrics).flatMap(m => m.cashFlows.map(cf => cf.year)));
    
    // Initialize portfolio cash flows
    const portfolioCashFlows = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearlySum = {
        year,
        revenue: 0,
        opex: 0,
        operatingCashFlow: 0,
        debtService: 0,
        equityCashFlow: 0
      };

      // Sum up cash flows from all projects for this year
      Object.values(individualMetrics).forEach(projectMetrics => {
        const yearCashFlow = projectMetrics.cashFlows.find(cf => cf.year === year);
        if (yearCashFlow) {
          yearlySum.revenue += yearCashFlow.revenue;
          yearlySum.opex += yearCashFlow.opex;
          yearlySum.operatingCashFlow += yearCashFlow.operatingCashFlow;
        }
      });

      // Apply portfolio debt service if within tenor
      if (year < (startYear + (portfolioValue.tenorYears || DEFAULT_PROJECT_FINANCE.tenorYears))) {
        yearlySum.debtService = -portfolioDebtService;
      }
      
      yearlySum.equityCashFlow = yearlySum.operatingCashFlow + yearlySum.debtService;
      portfolioCashFlows.push(yearlySum);
    }

    // Calculate portfolio equity cash flows (including initial investment)
    const portfolioEquityCashFlows = [-totalCapex * (1 - portfolioGearing), ...portfolioCashFlows.map(cf => cf.equityCashFlow)];
    
    // Calculate portfolio DSCR
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