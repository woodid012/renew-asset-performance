import { calculateAssetRevenue } from './RevCalculations';
import { calculateStressRevenue } from './ValuationAnalysis_Calcs';

export const DEFAULT_CAPEX = {
  solar: { baseCapex: 100, capexScale: 0.85 },
  wind: { baseCapex: 150, capexScale: 0.85 },
  battery: { baseCapex: 80, capexScale: 0.85 },
  default: { baseCapex: 100, capexScale: 0.85 }
};

export const DEFAULT_PROJECT_FINANCE = {
  maxGearing: 0.70,
  targetDSCRMerchant: 2.0,
  targetDSCRContract: 1.35,
  interestRate: 0.06,
  tenorYears: 15,
  opex: 5.0,
  opexEscalation: 2.5,
  structuring: 0.01,
  commitment: 0.005,
};

const calculateScaledCapex = (baseCapex, capacity, baseCapacity, scaleFactor) => {
  return baseCapex * Math.pow(capacity / baseCapacity, scaleFactor);
};

export const initializeProjectValues = (assets, baseCapacity = 100) => {
  const initialValues = Object.values(assets).reduce((acc, asset) => {
    const defaultValues = DEFAULT_CAPEX[asset.type] || DEFAULT_CAPEX.default;
    const capex = calculateScaledCapex(
      defaultValues.baseCapex,
      asset.capacity,
      baseCapacity,
      defaultValues.capexScale
    );

    return {
      ...acc,
      [asset.name]: {
        capex: Number(capex.toFixed(2)),
        maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing,
        targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant,
        targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract,
        interestRate: DEFAULT_PROJECT_FINANCE.interestRate,
        tenorYears: DEFAULT_PROJECT_FINANCE.tenorYears,
        opex: DEFAULT_PROJECT_FINANCE.opex,
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
    const dscrsByYear = Array.from({ length: projectValue.tenorYears }, (_, yearIndex) => {
      const year = assetStartYear + yearIndex;
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
      
      const contractedCashFlow = stressedRevenue.contractedGreen + stressedRevenue.contractedEnergy;
      const merchantCashFlow = stressedRevenue.merchantGreen + stressedRevenue.merchantEnergy;
      
      const opexInflation = Math.pow(1 + projectValue.opexEscalation/100, yearIndex);
      const opex = projectValue.opex * opexInflation;
      
      const totalCashFlow = contractedCashFlow + merchantCashFlow - opex;
      const dscr = calculateDSCR(totalCashFlow, annualDebtService);
      
      return {
        contractedDSCR: calculateDSCR(contractedCashFlow - (opex * contractedCashFlow/totalCashFlow), annualDebtService),
        merchantDSCR: calculateDSCR(merchantCashFlow - (opex * merchantCashFlow/totalCashFlow), annualDebtService),
      };
    });

    const minContractDSCR = Math.min(...dscrsByYear.map(y => y.contractedDSCR));
    const minMerchantDSCR = Math.min(...dscrsByYear.map(y => y.merchantDSCR));

    if (minContractDSCR >= projectValue.targetDSCRContract && 
        minMerchantDSCR >= projectValue.targetDSCRMerchant) {
      low = mid;
    } else {
      high = mid;
    }
    
    iterations++;
  }

  return Math.min(low, projectValue.maxGearing);
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

  if (!projectValues) return {};
  
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

    metrics[asset.name] = {
      capex,
      calculatedGearing: gearing,
      debtAmount,
      annualDebtService,
      minDSCR,
      cashFlows,
      equityCashFlows
    };
  });

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