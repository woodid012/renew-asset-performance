import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// Date helper functions
const getQuarterFromDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const [, month] = dateStr.split('/');
    return Math.ceil(parseInt(month) / 3);
  } catch (error) {
    console.warn('Error extracting quarter from date:', dateStr, error);
    return null;
  }
};

// Context creation
const MerchantPriceContext = createContext();

export function useMerchantPrices() {
  const context = useContext(MerchantPriceContext);
  if (!context) {
    throw new Error('useMerchantPrices must be used within a MerchantPriceProvider');
  }
  return context;
}

export function MerchantPriceProvider({ children }) {
  // Add state for price source
  const [priceSource, setPriceSource] = useState('merchant_price_monthly.csv');
  
  // Extended state to include pre-calculated aggregations
  const [priceData, setPriceData] = useState({
    monthly: {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    },
    yearly: {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    },
    quarterly: {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    }
  });

  // Pre-calculate aggregations during data load
  useEffect(() => {
    const loadMerchantPrices = async () => {
      try {
        console.log('Loading merchant prices from:', `/${priceSource}`);
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

            const newPriceData = {
              monthly: {
                solar: { black: {}, green: {} },
                wind: { black: {}, green: {} },
                baseload: { black: {}, green: {} }
              },
              yearly: {
                solar: { black: {}, green: {} },
                wind: { black: {}, green: {} },
                baseload: { black: {}, green: {} }
              },
              quarterly: {
                solar: { black: {}, green: {} },
                wind: { black: {}, green: {} },
                baseload: { black: {}, green: {} }
              }
            };

            // First, organize monthly data
            results.data.forEach(row => {
              if (!row.profile || !row.type || !row.state || !row.time || row.price === undefined) {
                return;
              }

              // Ensure all necessary objects exist
              if (!newPriceData.monthly[row.profile]) {
                newPriceData.monthly[row.profile] = { black: {}, green: {} };
              }
              if (!newPriceData.monthly[row.profile][row.type]) {
                newPriceData.monthly[row.profile][row.type] = {};
              }
              if (!newPriceData.monthly[row.profile][row.type][row.state]) {
                newPriceData.monthly[row.profile][row.type][row.state] = {};
              }

              // Store monthly data
              newPriceData.monthly[row.profile][row.type][row.state][row.time] = {
                price: row.price,
                source: row.source
              };

              // Extract year and quarter for aggregations
              const [, , yearStr] = row.time.split('/');
              const year = parseInt(yearStr);
              const quarter = getQuarterFromDate(row.time);

              // Initialize aggregation objects if needed
              ['yearly', 'quarterly'].forEach(period => {
                if (!newPriceData[period][row.profile][row.type][row.state]) {
                  newPriceData[period][row.profile][row.type][row.state] = {};
                }
              });

              // Add to yearly aggregation arrays
              const yearKey = year.toString();
              if (!newPriceData.yearly[row.profile][row.type][row.state][yearKey]) {
                newPriceData.yearly[row.profile][row.type][row.state][yearKey] = [];
              }
              newPriceData.yearly[row.profile][row.type][row.state][yearKey].push(row.price);

              // Add to quarterly aggregation arrays
              const quarterKey = `${yearKey}-Q${quarter}`;
              if (!newPriceData.quarterly[row.profile][row.type][row.state][quarterKey]) {
                newPriceData.quarterly[row.profile][row.type][row.state][quarterKey] = [];
              }
              newPriceData.quarterly[row.profile][row.type][row.state][quarterKey].push(row.price);
            });

            // Calculate final aggregations
            Object.entries(newPriceData.yearly).forEach(([profile, typeData]) => {
              Object.entries(typeData).forEach(([type, stateData]) => {
                Object.entries(stateData).forEach(([state, yearData]) => {
                  Object.entries(yearData).forEach(([year, prices]) => {
                    newPriceData.yearly[profile][type][state][year] = _.mean(prices);
                  });
                });
              });
            });

            Object.entries(newPriceData.quarterly).forEach(([profile, typeData]) => {
              Object.entries(typeData).forEach(([type, stateData]) => {
                Object.entries(stateData).forEach(([state, quarterData]) => {
                  Object.entries(quarterData).forEach(([quarter, prices]) => {
                    newPriceData.quarterly[profile][type][state][quarter] = _.mean(prices);
                  });
                });
              });
            });

            setPriceData(newPriceData);
          }
        });
      } catch (error) {
        console.error('Error loading merchant prices:', error);
      }
    };

    loadMerchantPrices();
  }, [priceSource]); // Added priceSource as dependency

  // Optimized getMerchantPrice that uses pre-calculated values
  const getMerchantPrice = useCallback((profile, type, region, timeStr) => {
    try {
      // Case 1: Year only (e.g., "2022" or 2022)
      if (typeof timeStr === 'number' || (!timeStr.includes('/') && !timeStr.includes('-'))) {
        const yearKey = timeStr.toString();
        return priceData.yearly[profile]?.[type]?.[region]?.[yearKey] || 0;
      }
      
      // Case 2: Quarterly format (e.g., "2022-Q1")
      if (timeStr.includes('-Q')) {
        return priceData.quarterly[profile]?.[type]?.[region]?.[timeStr] || 0;
      }
      
      // Case 3: Monthly format (e.g., "1/01/2022")
      return priceData.monthly[profile]?.[type]?.[region]?.[timeStr]?.price || 0;
    } catch (error) {
      console.warn(`Error getting merchant price for profile=${profile}, type=${type}, region=${region}, time=${timeStr}`, error);
      return 0;
    }
  }, [priceData]);

  const value = {
    merchantPrices: priceData.monthly,
    getMerchantPrice,
    priceSource,
    setPriceSource
  };

  return (
    <MerchantPriceContext.Provider value={value}>
      {children}
    </MerchantPriceContext.Provider>
  );
}

export default MerchantPriceProvider;