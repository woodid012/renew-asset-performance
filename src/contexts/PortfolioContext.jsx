import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [assets, setAssets] = useState({
    '1': {
      id: '1',
      name: 'Solar Farm Alpha',
      state: 'NSW',
      capacity: 100,
      type: 'solar',
      volumeLossAdjustment: 95,
      contracts: [
        {
          id: '1',
          counterparty: "Corporate PPA 1",
          type: 'bundled',
          buyersPercentage: 40,
          shape: 'solar',
          strikePrice: '75',
          greenPrice: '30',
          blackPrice: '45',
          indexation: 2.5,
          hasFloor: true,
          floorValue: '0',
          startDate: '2024-01-01',
          endDate: '2028-12-31',
          term: '5'
        },
        {
          id: '2',
          counterparty: "Retail PPA",
          type: 'bundled',
          buyersPercentage: 30,
          shape: 'solar',
          strikePrice: '85',
          greenPrice: '45',
          blackPrice: '40',
          indexation: 2.0,
          hasFloor: false,
          floorValue: '',
          startDate: '2024-01-01',
          endDate: '2026-12-31',
          term: '3'
        }
      ]
    },
    '2': {
      id: '2',
      name: 'Wind Farm Beta',
      state: 'VIC',
      capacity: 150,
      type: 'wind',
      volumeLossAdjustment: 95,
      contracts: [
        {
          id: '1',
          counterparty: "Corporate PPA 1",
          type: 'bundled',
          buyersPercentage: 25,
          shape: 'wind',
          strikePrice: '100',
          greenPrice: '28',
          blackPrice: '72',
          indexation: 2.5,
          hasFloor: true,
          floorValue: '0',
          startDate: '2024-07-01',
          endDate: '2034-06-31',
          term: '10'
        }
      ]
    }
  });

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
      wind: { black: {}, green: {} }
    },
    analysisStartYear: 2024,
    analysisEndYear: 2030,
    volumeVariation: 20,
    priceVariation: 30
  });

  // Load merchant prices from CSV
    // Load merchant prices from CSV
    useEffect(() => {
      const loadMerchantPrices = async () => {
        try {
          console.log('Attempting to load merchant prices...');
          const response = await fetch('/merchant_prices.csv');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const csvText = await response.text();
          console.log('CSV content loaded:', csvText.slice(0, 100) + '...'); // Log first 100 chars
          
          Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              console.log('Parse complete, rows:', results.data.length);
              const newMerchantPrices = {
                solar: { black: {}, green: {} },
                wind: { black: {}, green: {} }
              };
  
              results.data.forEach(row => {
                if (!row.profile || !row.type || !row.state || !row.year || !row.price) {
                  console.log('Skipping invalid row:', row);
                  return;
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
      return constants.merchantPrices[profile][type][region][year] || 0;
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