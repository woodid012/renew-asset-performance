import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// Use public directory for both development and production
const ASSETS_PATH = '/assets_v2.csv';
const MERCHANT_PRICES_PATH = '/merchant_prices_baseload.csv';

const PortfolioContext = createContext();

// Helper function to transform date from DD/MM/YYYY to YYYY-MM-DD
const transformDateFormat = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return dateStr; // Return original if not in expected format
    
    // Ensure padding with leading zeros
    const paddedDay = day.toString().padStart(2, '0');
    const paddedMonth = month.toString().padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  } catch (error) {
    console.warn('Error transforming date:', dateStr, error);
    return dateStr; // Return original string if transformation fails
  }
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [assets, setAssets] = useState({});
  const [constants, setConstants] = useState({
    HOURS_IN_YEAR: 8760,
    capacityFactors: {
      solar: {
        NSW: 0.28,
        VIC: 0.25,
        QLD: 0.29,
        SA: 0.27
      },
      wind: {
        NSW: 0.35,
        VIC: 0.38,
        QLD: 0.32,
        SA: 0.40
      }
    },
    merchantPrices: {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    },
    analysisStartYear: 2024,
    analysisEndYear: 2030,
    volumeVariation: 20,
    priceVariation: 30
  });

  // Load assets from CSV
  useEffect(() => {
    const loadAssets = async () => {
      try {
        console.log('Loading assets from CSV...', ASSETS_PATH);
        const response = await fetch(ASSETS_PATH);
        
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

            console.log('Parse complete, rows:', results.data.length);
            
            // Group the data by assetId
            const groupedByAsset = _.groupBy(results.data, 'assetId');
            
            // Transform the data into the required structure
            const transformedAssets = _.mapValues(groupedByAsset, (assetRows) => {
              // All rows for an asset have the same base information
              const firstRow = assetRows[0];
              
              // Transform contract data with date format conversion
              const contracts = assetRows.map(row => ({
                id: row.contractId?.toString(),
                counterparty: row.contractCounterparty,
                type: row.contractType,
                buyersPercentage: row.contractBuyersPercentage,
                shape: row.contractShape,
                strikePrice: row.contractStrikePrice?.toString(),
                greenPrice: row.contractGreenPrice?.toString(),
                blackPrice: row.contractBlackPrice?.toString(),
                indexation: row.contractIndexation,
                hasFloor: row.contractHasFloor,
                floorValue: row.contractFloorValue?.toString() || '',
                startDate: transformDateFormat(row.contractStartDate),
                endDate: transformDateFormat(row.contractEndDate),
                term: row.contractTerm?.toString()
              }));
              
              // Return the transformed asset structure
              return {
                id: firstRow.assetId?.toString(),
                name: firstRow.name,
                state: firstRow.state,
                capacity: firstRow.capacity,
                type: firstRow.type,
                volumeLossAdjustment: firstRow.volumeLossAdjustment,
                contracts
              };
            });
            
            console.log('Transformed assets:', transformedAssets);
            setAssets(transformedAssets);
          },
          error: (error) => {
            console.error('Error parsing assets CSV:', error);
          }
        });
      } catch (error) {
        console.error('Error loading assets:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
    };

    loadAssets();
  }, []);

  // Load merchant prices from CSV
  useEffect(() => {
    const loadMerchantPrices = async () => {
      try {
        console.log('Attempting to load merchant prices...', MERCHANT_PRICES_PATH);
        const response = await fetch(MERCHANT_PRICES_PATH);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              console.error('No data found in merchant prices CSV');
              return;
            }

            console.log('Parse complete, rows:', results.data.length);
            const newMerchantPrices = {
              solar: { black: {}, green: {} },
              wind: { black: {}, green: {} },
              baseload: { black: {}, green: {} }
            };

            results.data.forEach(row => {
              if (!row.profile || !row.type || !row.state || !row.year || row.price === undefined) {
                console.log('Skipping invalid row:', row);
                return;
              }

              if (!newMerchantPrices[row.profile]) {
                newMerchantPrices[row.profile] = { black: {}, green: {} };
              }
              if (!newMerchantPrices[row.profile][row.type]) {
                newMerchantPrices[row.profile][row.type] = {};
              }
              if (!newMerchantPrices[row.profile][row.type][row.state]) {
                newMerchantPrices[row.profile][row.type][row.state] = {};
              }

              newMerchantPrices[row.profile][row.type][row.state][row.year] = row.price;
            });

            console.log('Processed merchant prices:', newMerchantPrices);
            setConstants(prev => ({
              ...prev,
              merchantPrices: newMerchantPrices
            }));
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
          }
        });
      } catch (error) {
        console.error('Error loading merchant prices:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
    };

    loadMerchantPrices();
  }, []);

  const updateConstants = useCallback((field, value) => {
    console.log('Updating constant:', field, 'to:', value);
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

  const getMerchantPrice = useCallback((profile, type, region, year) => {
    try {
      return constants.merchantPrices[profile]?.[type]?.[region]?.[year] || 0;
    } catch (error) {
      console.warn(`Could not find merchant price for profile=${profile}, type=${type}, region=${region}, year=${year}`);
      return 0;
    }
  }, [constants.merchantPrices]);

  const value = {
    assets,
    setAssets,
    constants,
    updateConstants,
    getMerchantPrice
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioProvider;
