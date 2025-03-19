import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { MerchantPriceProvider, useMerchantPrices } from './MerchantPriceProvider';

// Valuation defaults
const DEFAULT_COSTS = {
  solar: {
    fixedCostBase: 5.0,    // Base fixed cost for a 100MW solar farm
    fixedCostScale: 0.75,  // Scale factor for economies of scale
    terminalValue: 15,     // Default terminal value for 100MW
  },
  wind: {
    fixedCostBase: 10.0,
    fixedCostScale: 0.75,
    terminalValue: 20,
  },
  battery: {
    fixedCostBase: 5,
    fixedCostScale: 0.75,
    terminalValue: 10,
  },
  default: {
    fixedCostBase: 5,
    fixedCostScale: 0.75,
    terminalValue: 15,
  }
};

const DEFAULT_VALUATION = {
  discountRates: {
    contract: 0.08,
    merchant: 0.10,
  },
  costEscalation: 2.5,
  baseCapacity: 100  // Reference capacity for base costs (MW)
};

// Project finance defaults
const DEFAULT_CAPEX = {
  solar: 1.2,   // $M per MW
  wind: 2.5,    // $M per MW
  battery: 1.6,  // $M per MW
  default: 2.0   // $M per MW
};

const DEFAULT_OPEX = {
  solar: 0.014,    // $M per MW
  wind: 0.040,     // $M per MW
  battery: 0.015,  // $M per MW
  default: 0.040   // Using wind as default
};

const DEFAULT_PROJECT_FINANCE = {
  maxGearing: 0.70,
  targetDSCRMerchant: 2.00,
  targetDSCRContract: 1.35,
  interestRate: 0.060,
  opexEscalation: 2.5,
  structuring: 0.01,
  commitment: 0.005,
};

const DEFAULT_TENORS = {
  solar: 22,
  wind: 22,
  battery: 18,
  default: 20
};

// Helper function for cost scaling
const calculateFixedCost = (baseFixedCost, capacity, baseCapacity, scaleFactor) => {
  return baseFixedCost * Math.pow(capacity / baseCapacity, scaleFactor);
};

// Date helper functions
const transformDateFormat = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return dateStr;
    const paddedDay = day.toString().padStart(2, '0');
    const paddedMonth = month.toString().padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  } catch (error) {
    console.warn('Error transforming date:', dateStr, error);
    return dateStr;
  }
};

const getYearFromDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const [, , year] = dateStr.split('/');
    return parseInt(year, 10);
  } catch (error) {
    console.warn('Error extracting year from date:', dateStr, error);
    return null;
  }
};

// Context creation
const PortfolioContext = createContext();

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

// Internal wrapper component that has access to merchant prices
function PortfolioProviderInner({ children }) {
  const { merchantPrices, getMerchantPrice, getMerchantSpread, priceSource, setPriceSource } = useMerchantPrices();
  const [portfolioSource, setPortfolioSource] = useState('aula_2025-01-13.json');
  const [analysisMode, setAnalysisMode] = useState('simple');
  const [portfolioName, setPortfolioName] = useState("Portfolio Name");
  const [activePortfolio, setActivePortfolio] = useState('aula');
  const [assets, setAssets] = useState({});
  const [constants, setConstants] = useState({
    HOURS_IN_YEAR: 8760,
    capacityFactors: { 
      solar: { NSW: 0.28, VIC: 0.25, QLD: 0.29, SA: 0.27 }, 
      wind: { NSW: 0.35, VIC: 0.38, QLD: 0.32, SA: 0.40 } 
    },
    capacityFactors_qtr: { 
      solar: { 
        NSW: { Q1: 0.32, Q2: 0.26, Q3: 0.24, Q4: 0.30 }, 
        VIC: { Q1: 0.29, Q2: 0.23, Q3: 0.21, Q4: 0.27 }, 
        QLD: { Q1: 0.33, Q2: 0.28, Q3: 0.25, Q4: 0.30 }, 
        SA:  { Q1: 0.31, Q2: 0.25, Q3: 0.23, Q4: 0.29 } 
      },
      wind: { 
        NSW: { Q1: 0.32, Q2: 0.35, Q3: 0.38, Q4: 0.35 }, 
        VIC: { Q1: 0.35, Q2: 0.38, Q3: 0.42, Q4: 0.37 }, 
        QLD: { Q1: 0.29, Q2: 0.32, Q3: 0.35, Q4: 0.32 }, 
        SA:  { Q1: 0.37, Q2: 0.40, Q3: 0.44, Q4: 0.39 } 
      } 
    },
    annualDegradation: {
      solar: 0.4,
      wind: 0.6
    },
    merchantPrices: merchantPrices,
    volumeVariation: 20,
    greenPriceVariation: 20,
    EnergyPriceVariation: 20,
    discountRates: DEFAULT_VALUATION.discountRates,
    assetCosts: {},
    escalation: 2.5,
    referenceYear: new Date().getFullYear(),
    priceAggregation: 'yearly',
    analysisStartYear: new Date().getFullYear(),
    analysisEndYear: new Date().getFullYear() + 30
  });

  // Initialize asset costs with default values
  const initializeAssetCosts = useCallback((assets) => {
    const newAssetCosts = {};
    Object.values(assets).forEach(asset => {
      const defaultCosts = DEFAULT_COSTS[asset.type] || DEFAULT_COSTS.default;
      const defaultProjCosts = {
        capex: (DEFAULT_CAPEX[asset.type] || DEFAULT_CAPEX.default) * asset.capacity,
        opex: (DEFAULT_OPEX[asset.type] || DEFAULT_OPEX.default) * asset.capacity
      };
      
      // Calculate scaled operating costs (use the smaller of valuation/project defaults)
      const scaledOperatingCost = Math.min(
        calculateFixedCost(
          defaultCosts.fixedCostBase,
          asset.capacity,
          DEFAULT_VALUATION.baseCapacity,
          defaultCosts.fixedCostScale
        ),
        defaultProjCosts.opex
      );

      newAssetCosts[asset.name] = {
        operatingCosts: Number(scaledOperatingCost.toFixed(2)),
        operatingCostEscalation: DEFAULT_PROJECT_FINANCE.opexEscalation,
        terminalValue: Number((defaultCosts.terminalValue * 
                    (asset.capacity / DEFAULT_VALUATION.baseCapacity)).toFixed(2)),
        capex: Number(defaultProjCosts.capex.toFixed(1)),
        maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing,
        targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract,
        targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant,
        interestRate: DEFAULT_PROJECT_FINANCE.interestRate,
        tenorYears: DEFAULT_TENORS[asset.type] || DEFAULT_TENORS.default,
        calculatedGearing: DEFAULT_PROJECT_FINANCE.maxGearing
      };
    });
    return newAssetCosts;
  }, []);

  // Update constants when merchant prices change
  useEffect(() => {
    setConstants(prev => ({
      ...prev,
      merchantPrices
    }));
  }, [merchantPrices]);

  // Initialize asset costs when assets change
  useEffect(() => {
    if (Object.keys(assets).length > 0) {
      setConstants(prev => ({
        ...prev,
        assetCosts: initializeAssetCosts(assets)
      }));
    }
  }, [assets, initializeAssetCosts]);

  // Load portfolio data whenever source changes
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch(`/${portfolioSource}`);
        if (!response.ok) throw new Error(`Failed to load portfolio: ${response.statusText}`);

        const data = await response.json();
        if (!data.assets) throw new Error('Invalid portfolio data structure');

        setAssets(data.assets);
        if (data.portfolioName) {
          setPortfolioName(data.portfolioName);
        }
        
        // Import constants if they exist in the loaded data
        if (data.constants) {
          setConstants(prev => ({
            ...prev,
            ...data.constants
          }));
        }

        console.log('Portfolio loaded successfully:', portfolioSource);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setAssets({});
      }
    };

    if (portfolioSource) {
      loadPortfolio();
    }
  }, [portfolioSource]);

  // Load and parse merchant price CSV data
  const loadMerchantPrices = useCallback(async (priceSource) => {
    try {
      console.log('Loading merchant prices from CSV...', `/${priceSource}`);
      const response = await fetch(`/${priceSource}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            console.error('No data found in merchant prices CSV');
            return;
          }
          
          setConstants(prev => ({
            ...prev,
            merchantPrices: results.data
          }));
          console.log('Merchant prices loaded successfully');
        },
        error: (error) => {
          console.error('Error parsing merchant prices CSV:', error);
        }
      });
    } catch (error) {
      console.error('Error loading merchant prices:', error);
    }
  }, []);

  // Export all portfolio data including valuation and project finance inputs
  const exportPortfolioData = useCallback(() => {
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      portfolioName,
      assets,
      constants: {
        discountRates: constants.discountRates,
        assetCosts: constants.assetCosts,
        volumeVariation: constants.volumeVariation,
        greenPriceVariation: constants.greenPriceVariation,
        EnergyPriceVariation: constants.EnergyPriceVariation,
        escalation: constants.escalation,
        referenceYear: constants.referenceYear,
        priceAggregation: constants.priceAggregation,
        analysisStartYear: constants.analysisStartYear,
        analysisEndYear: constants.analysisEndYear
      },
      analysisMode,
      activePortfolio,
      portfolioSource,
      priceSource
    };

    return exportData;
  }, [assets, portfolioName, constants, analysisMode, activePortfolio, portfolioSource, priceSource]);

  // Import portfolio data including valuation and project finance inputs
  const importPortfolioData = useCallback((importedData) => {
    try {
      // Basic validation
      if (!importedData.assets || !importedData.version) {
        throw new Error('Invalid import data structure');
      }

      // Set portfolio data
      setAssets(importedData.assets);
      if (importedData.portfolioName) {
        setPortfolioName(importedData.portfolioName);
      }

      // Update constants with imported data
      if (importedData.constants) {
        setConstants(prev => ({
          ...prev,
          ...importedData.constants,
        }));
      }

      // Set other state if present
      if (importedData.analysisMode) setAnalysisMode(importedData.analysisMode);
      if (importedData.activePortfolio) setActivePortfolio(importedData.activePortfolio);
      if (importedData.portfolioSource) setPortfolioSource(importedData.portfolioSource);
      if (importedData.priceSource) setPriceSource(importedData.priceSource);

      console.log('Portfolio data imported successfully');
    } catch (error) {
      console.error('Error importing portfolio data:', error);
      throw error;
    }
  }, [setPriceSource]);

  const updateAnalysisMode = useCallback((mode) => {
    setAnalysisMode(mode);
  }, []);

  // Constants update function
  const updateConstants = useCallback((field, value) => {
    setConstants(prev => {
      if (field.includes('.')) {
        const fields = field.split('.');
        const newConstants = { ...prev };
        let current = newConstants;
        
        for (let i = 0; i < fields.length - 1; i++) {
          if (!current[fields[i]]) {
            current[fields[i]] = {};
          }
          current[fields[i]] = { ...current[fields[i]] };
          current = current[fields[i]];
        }
        
        current[fields[fields.length - 1]] = value;
        return newConstants;
      }

      return {
        ...prev,
        [field]: value
      };
    });
  }, []);

  const value = {
    assets,
    setAssets,
    portfolioName,
    setPortfolioName,
    activePortfolio,
    setActivePortfolio,
    constants,
    updateConstants,
    getMerchantPrice,
    getMerchantSpread,
    portfolioSource,
    setPortfolioSource,
    priceCurveSource: priceSource,
    setPriceCurveSource: setPriceSource,
    analysisMode,
    updateAnalysisMode,
    loadMerchantPrices,
    exportPortfolioData,
    importPortfolioData
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

// Main provider that wraps everything
export function PortfolioProvider({ children }) {
  return (
    <MerchantPriceProvider>
      <PortfolioProviderInner>
        {children}
      </PortfolioProviderInner>
    </MerchantPriceProvider>
  );
}

export default PortfolioProvider;