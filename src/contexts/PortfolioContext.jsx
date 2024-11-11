import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// Use @ alias for src directory
const ASSETS_PATH = '/src/data/assets.csv';
const MERCHANT_PRICES_PATH = '/src/data/merchant_prices_baseload.csv';

const PortfolioContext = createContext();

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
        // Use dynamic import for CSV files
        const csvModule = await import(/* @vite-ignore */ ASSETS_PATH);
        const response = await fetch(csvModule.default);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Parse complete, rows:', results.data.length);
            
            // Group the data by assetId
            const groupedByAsset = _.groupBy(results.data, 'assetId');
            
            // Transform the data into the required structure
            const transformedAssets = _.mapValues(groupedByAsset, (assetRows) => {
              // All rows for an asset have the same base information
              const firstRow = assetRows[0];
              
              // Transform contract data
              const contracts = assetRows.map(row => ({
                id: row.contractId.toString(),
                counterparty: row.contractCounterparty,
                type: row.contractType,
                buyersPercentage: row.contractBuyersPercentage,
                shape: row.contractShape,
                strikePrice: row.contractStrikePrice.toString(),
                greenPrice: row.contractGreenPrice.toString(),
                blackPrice: row.contractBlackPrice.toString(),
                indexation: row.contractIndexation,
                hasFloor: row.contractHasFloor,
                floorValue: row.contractFloorValue?.toString() || '',
                startDate: row.contractStartDate,
                endDate: row.contractEndDate,
                term: row.contractTerm.toString()
              }));
              
              // Return the transformed asset structure
              return {
                id: firstRow.assetId.toString(),
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
        // Use dynamic import for CSV files
        const csvModule = await import(/* @vite-ignore */ MERCHANT_PRICES_PATH);
        const response = await fetch(csvModule.default);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            console.log('Parse complete, rows:', results.data.length);
            const newMerchantPrices = {
              solar: { black: {}, green: {} },
              wind: { black: {}, green: {} },
              baseload: { black: {}, green: {} }
            };

            results.data.forEach(row => {
              if (!row.profile || !row.type || !row.state || !row.year || !row.price) {
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