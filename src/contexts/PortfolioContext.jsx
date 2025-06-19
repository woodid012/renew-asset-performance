// src/contexts/PortfolioContext.jsx - Fixed with Safe Scenario Integration
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { MerchantPriceProvider, useMerchantPrices } from './MerchantPriceProvider';
import {
  DEFAULT_CAPEX_RATES,
  DEFAULT_OPEX_RATES,
  DEFAULT_PROJECT_FINANCE,
  DEFAULT_PLATFORM_COSTS,
  DEFAULT_TAX_DEPRECIATION,
  DEFAULT_DISCOUNT_RATES,
  DEFAULT_RISK_PARAMETERS,
  DEFAULT_PRICE_SETTINGS,
  DEFAULT_DATA_SOURCES,
  DEFAULT_ASSET_PERFORMANCE,
  DEFAULT_TERMINAL_RATES,
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_SYSTEM_CONSTANTS,
  DEFAULT_CAPACITY_FACTORS,
  getDefaultValue
} from '../lib/default_constants';

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

// Safe hook to use scenarios - returns null if not available
function useScenariosOrNull() {
  try {
    // Try to import useScenarios dynamically
    const { useScenarios } = require('./ScenarioContext');
    return useScenarios();
  } catch (error) {
    // ScenarioContext not available, return null
    return null;
  }
}

// Internal wrapper component that has access to merchant prices and scenarios
function PortfolioProviderInner({ children }) {
  const { merchantPrices, getMerchantPrice, getMerchantSpread, priceSource, setPriceSource } = useMerchantPrices();
  
  // NEW: Safe access to scenario context - might be null
  const scenarioContext = useScenariosOrNull();
  
  const [portfolioSource, setPortfolioSource] = useState('zebre_2025-01-13.json');
  const [activePortfolio, setActivePortfolio] = useState('zebre');
  const [analysisMode, setAnalysisMode] = useState('simple');
  const [portfolioName, setPortfolioName] = useState("Portfolio Name");
  
  // Base data (unchanged by scenarios)
  const [baseAssets, setBaseAssets] = useState({});
  const [baseConstants, setBaseConstants] = useState({
    // System constants
    HOURS_IN_YEAR: DEFAULT_SYSTEM_CONSTANTS.HOURS_IN_YEAR,
    priceAggregation: DEFAULT_SYSTEM_CONSTANTS.priceAggregation,
    
    // Capacity factors from centralized defaults
    capacityFactors: DEFAULT_CAPACITY_FACTORS.annual,
    capacityFactors_qtr: DEFAULT_CAPACITY_FACTORS.quarterly,
    
    // Asset performance from centralized defaults
    annualDegradation: DEFAULT_ASSET_PERFORMANCE.annualDegradation,
    
    // Merchant prices (will be updated from provider)
    merchantPrices: merchantPrices,
    
    // Risk parameters from centralized defaults
    volumeVariation: DEFAULT_RISK_PARAMETERS.volumeVariation,
    greenPriceVariation: DEFAULT_RISK_PARAMETERS.greenPriceVariation,
    EnergyPriceVariation: DEFAULT_RISK_PARAMETERS.EnergyPriceVariation,
    
    // Discount rates from centralized defaults (convert to decimals)
    discountRates: {
      contract: DEFAULT_DISCOUNT_RATES.contract / 100,
      merchant: DEFAULT_DISCOUNT_RATES.merchant / 100
    },
    
    // Asset costs (will be initialized)
    assetCosts: {},
    
    // Price settings from centralized defaults
    escalation: DEFAULT_PRICE_SETTINGS.escalation,
    referenceYear: DEFAULT_PRICE_SETTINGS.referenceYear,
    
    // Analysis settings from centralized defaults
    analysisStartYear: DEFAULT_ANALYSIS_SETTINGS.analysisStartYear,
    analysisEndYear: DEFAULT_ANALYSIS_SETTINGS.analysisEndYear,
    
    // Platform costs from centralized defaults
    platformOpex: DEFAULT_PLATFORM_COSTS.platformOpex,
    otherOpex: DEFAULT_PLATFORM_COSTS.otherOpex,
    platformOpexEscalation: DEFAULT_PLATFORM_COSTS.platformOpexEscalation,
    dividendPolicy: DEFAULT_PLATFORM_COSTS.dividendPolicy,
    minimumCashBalance: DEFAULT_PLATFORM_COSTS.minimumCashBalance,
    
    // Tax settings from centralized defaults
    corporateTaxRate: DEFAULT_TAX_DEPRECIATION.corporateTaxRate,
    deprecationPeriods: DEFAULT_TAX_DEPRECIATION.deprecationPeriods
  });

  // NEW: Computed scenario-aware values - use base data if scenarios not available
  const assets = scenarioContext?.getScenarioAssets ? 
    scenarioContext.getScenarioAssets(baseAssets) : 
    baseAssets;
    
  const constants = scenarioContext?.getScenarioConstants ? 
    scenarioContext.getScenarioConstants(baseConstants) : 
    baseConstants;

  // Initialize asset costs with default values from centralized constants
  const initializeAssetCosts = useCallback((assets) => {
    const newAssetCosts = {};
    Object.values(assets).forEach(asset => {
      const assetType = asset.type === 'battery' ? 'storage' : asset.type; // Map battery to storage
      
      // Get default values using the utility function
      const defaultCapex = getDefaultValue('capex', null, assetType) || DEFAULT_CAPEX_RATES.default;
      const defaultOpex = getDefaultValue('opex', null, assetType) || DEFAULT_OPEX_RATES.default;
      const defaultTerminal = getDefaultValue('terminal', null, assetType) || DEFAULT_TERMINAL_RATES.default;
      const defaultTenor = getDefaultValue('finance', 'tenorYears', assetType) || DEFAULT_PROJECT_FINANCE.tenorYears.default;
      
      // Calculate project costs
      const projCapex = defaultCapex * asset.capacity;
      const projOpex = defaultOpex * asset.capacity;
      
      // Calculate scaled operating cost using terminal rates as base for scaling
      const baseCapacity = 100; // Reference capacity for scaling
      const scaleFactor = 0.75; // Default scale factor
      const scaledOperatingCost = Math.min(
        calculateFixedCost(
          defaultTerminal * baseCapacity * 0.1, // Use 10% of terminal value as base operating cost
          asset.capacity,
          baseCapacity,
          scaleFactor
        ),
        projOpex
      );

      newAssetCosts[asset.name] = {
        operatingCosts: Number(scaledOperatingCost.toFixed(2)),
        operatingCostEscalation: DEFAULT_PROJECT_FINANCE.opexEscalation,
        terminalValue: Number((defaultTerminal * asset.capacity).toFixed(2)),
        capex: Number(projCapex.toFixed(1)),
        maxGearing: DEFAULT_PROJECT_FINANCE.maxGearing / 100, // Convert to decimal
        targetDSCRContract: DEFAULT_PROJECT_FINANCE.targetDSCRContract,
        targetDSCRMerchant: DEFAULT_PROJECT_FINANCE.targetDSCRMerchant,
        interestRate: DEFAULT_PROJECT_FINANCE.interestRate / 100, // Convert to decimal
        tenorYears: defaultTenor,
        calculatedGearing: DEFAULT_PROJECT_FINANCE.maxGearing / 100 // Convert to decimal
      };
    });
    return newAssetCosts;
  }, []);

  // Update base constants when merchant prices change
  useEffect(() => {
    setBaseConstants(prev => ({
      ...prev,
      merchantPrices
    }));
  }, [merchantPrices]);

  // Initialize asset costs when base assets change, but only if asset costs don't already exist
  useEffect(() => {
    if (Object.keys(baseAssets).length > 0 && 
        (!baseConstants.assetCosts || Object.keys(baseConstants.assetCosts).length === 0)) {
      setBaseConstants(prev => ({
        ...prev,
        assetCosts: initializeAssetCosts(baseAssets)
      }));
    }
  }, [baseAssets, baseConstants.assetCosts, initializeAssetCosts]);

  // Import portfolio data including valuation and project finance inputs
  const importPortfolioData = useCallback((importedData) => {
    try {
      // Basic validation
      if (!importedData.assets || !importedData.version) {
        throw new Error('Invalid import data structure');
      }

      // Set base portfolio data (not affected by scenarios)
      setBaseAssets(importedData.assets);
      if (importedData.portfolioName) {
        setPortfolioName(importedData.portfolioName);
      }

      // Check if we have asset costs in the imported data
      if (importedData.constants && importedData.constants.assetCosts) {
        // Use the imported asset costs directly without merging with defaults
        if (importedData.constants) {
          // Merge with default constants structure to ensure all fields are present
          const mergedConstants = {
            ...baseConstants, // Start with current defaults
            ...importedData.constants, // Override with imported values
          };
          setBaseConstants(mergedConstants);
        }
      } else {
        // Only initialize asset costs if none were provided in the import
        const tmpAssets = {};
        Object.entries(importedData.assets).forEach(([id, asset]) => {
          tmpAssets[asset.name] = asset;
        });
        
        const initializedAssetCosts = initializeAssetCosts(tmpAssets);
        
        // Update base constants with initialized asset costs
        setBaseConstants(prev => ({
          ...prev,
          ...(importedData.constants || {}),
          assetCosts: initializedAssetCosts
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
  }, [setPriceSource, initializeAssetCosts, baseConstants]);

  // Using a ref to handle the import function reference to avoid circular dependency
  const importPortfolioDataRef = useRef(importPortfolioData);
  
  // Update ref when the function changes
  useEffect(() => {
    importPortfolioDataRef.current = importPortfolioData;
  }, [importPortfolioData]);

  // Load portfolio data whenever source changes
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch(`/${portfolioSource}`);
        if (!response.ok) throw new Error(`Failed to load portfolio: ${response.statusText}`);

        const data = await response.json();
        if (!data.assets) throw new Error('Invalid portfolio data structure');

        // Use the ref to access the import function
        importPortfolioDataRef.current(data);
        console.log('Portfolio loaded successfully:', portfolioSource);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setBaseAssets({});
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
          
          setBaseConstants(prev => ({
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
      assets: baseAssets, // Export base assets, not scenario-modified ones
      constants: {
        discountRates: baseConstants.discountRates,
        assetCosts: baseConstants.assetCosts,
        volumeVariation: baseConstants.volumeVariation,
        greenPriceVariation: baseConstants.greenPriceVariation,
        EnergyPriceVariation: baseConstants.EnergyPriceVariation,
        escalation: baseConstants.escalation,
        referenceYear: baseConstants.referenceYear,
        priceAggregation: baseConstants.priceAggregation,
        analysisStartYear: baseConstants.analysisStartYear,
        analysisEndYear: baseConstants.analysisEndYear,
        platformOpex: baseConstants.platformOpex,
        otherOpex: baseConstants.otherOpex,
        platformOpexEscalation: baseConstants.platformOpexEscalation,
        dividendPolicy: baseConstants.dividendPolicy,
        minimumCashBalance: baseConstants.minimumCashBalance,
        corporateTaxRate: baseConstants.corporateTaxRate,
        deprecationPeriods: baseConstants.deprecationPeriods
      },
      analysisMode,
      activePortfolio,
      portfolioSource,
      priceSource
    };

    return exportData;
  }, [baseAssets, portfolioName, baseConstants, analysisMode, activePortfolio, portfolioSource, priceSource]);

  const updateAnalysisMode = useCallback((mode) => {
    setAnalysisMode(mode);
  }, []);

  // NEW: Constants update function - now updates base constants
  const updateConstants = useCallback((field, value) => {
    setBaseConstants(prev => {
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

  // NEW: Assets update function - now updates base assets
  const setAssets = useCallback((newAssets) => {
    setBaseAssets(newAssets);
  }, []);

  const value = {
    // Base data (for editing and export)
    baseAssets,
    baseConstants,
    setAssets, // Updates base assets
    
    // Scenario-aware data (for calculations and display)
    assets, // Scenario-modified assets
    constants, // Scenario-modified constants
    
    portfolioName,
    setPortfolioName,
    activePortfolio,
    setActivePortfolio,
    updateConstants, // Updates base constants
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
    importPortfolioData,
    
    // NEW: Scenario awareness
    currentScenario: scenarioContext?.activeScenario || 'base',
    scenarioAvailable: !!scenarioContext
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