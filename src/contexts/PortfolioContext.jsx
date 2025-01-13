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
  const [portfolioSource, setPortfolioSource] = useState('assets_aula.csv');
  const [analysisMode, setAnalysisMode] = useState('simple');
  const [portfolioName, setPortfolioName] = useState("Portfolio Name");
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

  // Assets loading with updated portfolio source
  useEffect(() => {
    const loadAssets = async () => {
      try {
        console.log('Loading assets from CSV...', `/${portfolioSource}`);
        const response = await fetch(`/${portfolioSource}`);
        
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
              console.error('No data found in assets CSV');
              return;
            }

            // Group the data by assetId
            const groupedByAsset = _.groupBy(results.data, 'assetId');
            
            // Transform the data into the required structure
            const transformedAssets = _.mapValues(groupedByAsset, (assetRows) => {
              const firstRow = assetRows[0];
              
              const contracts = assetRows
              .filter(row => {
                // Only include rows that have essential contract data
                return row.contractId && 
                      row.contractType && 
                      row.contractCounterparty;
              })
              .map(row => ({
                id: row.contractId?.toString(),
                counterparty: row.contractCounterparty,
                type: row.contractType,
                buyersPercentage: row.contractBuyersPercentage,
                strikePrice: row.contractStrikePrice?.toString(),
                greenPrice: row.contractGreenPrice?.toString(),
                blackPrice: row.contractBlackPrice?.toString(),
                indexation: row.contractIndexation,
                hasFloor: row.contractHasFloor,
                floorValue: row.contractFloorValue?.toString() || '',
                startDate: transformDateFormat(row.contractStartDate),
                endDate: transformDateFormat(row.contractEndDate),
                term: row.contractTerm?.toString(),
                indexationReferenceYear: getYearFromDate(row.contractStartDate)
              }));
              return {
                id: firstRow.assetId?.toString(),
                name: firstRow.name,
                state: firstRow.state,
                assetStartDate: transformDateFormat(firstRow.assetStartDate),
                capacity: firstRow.capacity,
                type: firstRow.type,
                volumeLossAdjustment: firstRow.volumeLossAdjustment,
                annualDegradation: firstRow.annualDegradation,
                contracts
              };
            });
            
            setAssets(transformedAssets);
            console.log('Assets loaded successfully from', portfolioSource);
          },
          error: (error) => {
            console.error('Error parsing assets CSV:', error);
          }
        });
      } catch (error) {
        console.error('Error loading assets:', error);
      }
    };

    loadAssets();
  }, [portfolioSource]);

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
    constants,
    updateConstants,
    getMerchantPrice,
    portfolioSource,
    setPortfolioSource,
    priceCurveSource: priceSource,
    setPriceCurveSource: setPriceSource,
    analysisMode,
    updateAnalysisMode
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