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

  // Function to aggregate data into yearly and quarterly
  const aggregateData = (monthlyData) => {
    const aggregated = {
      monthly: monthlyData,
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

    // Aggregate monthly data into yearly and quarterly
    Object.entries(monthlyData).forEach(([profile, profileData]) => {
      Object.entries(profileData).forEach(([type, typeData]) => {
        Object.entries(typeData).forEach(([state, stateData]) => {
          Object.entries(stateData).forEach(([time, data]) => {
            const [, , year] = time.split('/');
            const quarter = getQuarterFromDate(time);
            const yearKey = year.toString();
            const quarterKey = `${yearKey}-Q${quarter}`;

            // Initialize arrays if they don't exist
            if (!aggregated.yearly[profile][type][state]) {
              aggregated.yearly[profile][type][state] = {};
            }
            if (!aggregated.quarterly[profile][type][state]) {
              aggregated.quarterly[profile][type][state] = {};
            }
            if (!aggregated.yearly[profile][type][state][yearKey]) {
              aggregated.yearly[profile][type][state][yearKey] = [];
            }
            if (!aggregated.quarterly[profile][type][state][quarterKey]) {
              aggregated.quarterly[profile][type][state][quarterKey] = [];
            }

            // Add prices to arrays
            aggregated.yearly[profile][type][state][yearKey].push(data.price);
            aggregated.quarterly[profile][type][state][quarterKey].push(data.price);
          });
        });
      });
    });

    // Calculate averages for yearly and quarterly data
    ['yearly', 'quarterly'].forEach(period => {
      Object.entries(aggregated[period]).forEach(([profile, profileData]) => {
        Object.entries(profileData).forEach(([type, typeData]) => {
          Object.entries(typeData).forEach(([state, periodData]) => {
            Object.entries(periodData).forEach(([key, prices]) => {
              aggregated[period][profile][type][state][key] = _.mean(prices);
            });
          });
        });
      });
    });

    return aggregated;
  };

  // Function to process imported data
  const setMerchantPrices = useCallback((data) => {
    // Transform imported data into monthly format
    const monthlyData = {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    };

    data.forEach(row => {
      if (!monthlyData[row.profile][row.type][row.state]) {
        monthlyData[row.profile][row.type][row.state] = {};
      }
      monthlyData[row.profile][row.type][row.state][row.time] = {
        price: row.price,
        source: row.source || 'imported'
      };
    });

    // Aggregate the data and update state
    const aggregatedData = aggregateData(monthlyData);
    setPriceData(aggregatedData);
    setPriceSource('imported');
  }, []);

  // Function to process CSV data
  const processCSVData = useCallback((results) => {
    if (!results.data || results.data.length === 0) {
      console.error('No data found in merchant prices CSV');
      return;
    }

    const monthlyData = {
      solar: { black: {}, green: {} },
      wind: { black: {}, green: {} },
      baseload: { black: {}, green: {} }
    };

    // Process data into monthly format
    results.data.forEach(row => {
      if (!row.profile || !row.type || !row.state || !row.time || row.price === undefined) {
        return;
      }

      if (!monthlyData[row.profile][row.type][row.state]) {
        monthlyData[row.profile][row.type][row.state] = {};
      }

      monthlyData[row.profile][row.type][row.state][row.time] = {
        price: row.price,
        source: 'default'
      };
    });

    // Aggregate and update state
    const aggregatedData = aggregateData(monthlyData);
    setPriceData(aggregatedData);
  }, []);

  // Load data when price source changes
  useEffect(() => {
    const loadMerchantPrices = async () => {
      try {
        if (priceSource === 'imported') {
          return; // Data is already loaded via setMerchantPrices
        }

        const response = await fetch(`/${priceSource}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: processCSVData
        });
      } catch (error) {
        console.error('Error loading merchant prices:', error);
      }
    };

    loadMerchantPrices();
  }, [priceSource, processCSVData]);

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
    setPriceSource,
    setMerchantPrices
  };

  return (
    <MerchantPriceContext.Provider value={value}>
      {children}
    </MerchantPriceContext.Provider>
  );
}

export default MerchantPriceProvider;