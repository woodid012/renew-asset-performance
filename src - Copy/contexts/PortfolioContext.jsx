import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { MerchantPriceProvider, useMerchantPrices } from './MerchantPriceProvider';

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
  const { merchantPrices, getMerchantPrice, priceSource, setPriceSource } = useMerchantPrices();
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
    analysisStartYear: 2026,
    analysisEndYear: 2045,
    ForecastStartYear: 2024,
    volumeVariation: 20,
    greenPriceVariation: 20,
    blackPriceVariation: 20,
    discountRates: {
      contract: 0.08,
      merchant: 0.10
    },
    assetCosts: {}
  });

  // Update constants when merchant prices change
  useEffect(() => {
    setConstants(prev => ({
      ...prev,
      merchantPrices
    }));
  }, [merchantPrices]);

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

        console.log('Portfolio loaded successfully:', portfolioSource);
      } catch (error) {
        console.error('Error loading portfolio:', error);
        setAssets({});  // Reset assets on error
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
    portfolioSource,
    setPortfolioSource,
    priceCurveSource: priceSource,
    setPriceCurveSource: setPriceSource,
    analysisMode,
    updateAnalysisMode,
    loadMerchantPrices
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