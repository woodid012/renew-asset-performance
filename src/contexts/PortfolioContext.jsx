import React, { createContext, useContext, useState, useCallback } from 'react';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  // Initialize state with assets
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

     // Initialize constants state with year-based merchant prices structure
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
        states: {
          NSW: {
            black: {
              2024: 75,
              2025: 77,
              2026: 79,
              2027: 81,
              2028: 83,
              2029: 85,
              2030: 87
            },
            green: {
              2024: 25,
              2025: 26,
              2026: 27,
              2027: 28,
              2028: 29,
              2029: 30,
              2030: 31
            }
          },
          VIC: {
            black: {
              2024: 70,
              2025: 72,
              2026: 74,
              2027: 76,
              2028: 78,
              2029: 80,
              2030: 82
            },
            green: {
              2024: 25,
              2025: 26,
              2026: 27,
              2027: 28,
              2028: 29,
              2029: 30,
              2030: 31
            }
          },
          QLD: {
            black: {
              2024: 65,
              2025: 67,
              2026: 69,
              2027: 71,
              2028: 73,
              2029: 75,
              2030: 77
            },
            green: {
              2024: 25,
              2025: 26,
              2026: 27,
              2027: 28,
              2028: 29,
              2029: 30,
              2030: 31
            }
          },
          SA: {
            black: {
              2024: 80,
              2025: 82,
              2026: 84,
              2027: 86,
              2028: 88,
              2029: 90,
              2030: 92
            },
            green: {
              2024: 25,
              2025: 26,
              2026: 27,
              2027: 28,
              2028: 29,
              2029: 30,
              2030: 31
            }
          }
        }
      },
      analysisStartYear: 2024,
      analysisEndYear: 2030,
      volumeVariation: 20,
      priceVariation: 30
    });
  
    // Enhanced updateConstants function to handle nested updates
    const updateConstants = useCallback((field, value) => {
      console.log('Updating constant:', field, 'to:', value); // Debug log
      setConstants(prev => {
        // Handle nested updates
        if (field.includes('.')) {
          const fields = field.split('.');
          const newConstants = { ...prev };
          let current = newConstants;
          
          // Navigate to the nested object
          for (let i = 0; i < fields.length - 1; i++) {
            current[fields[i]] = { ...current[fields[i]] };
            current = current[fields[i]];
          }
          
          // Update the final field
          current[fields[fields.length - 1]] = value;
          
          console.log('New constants state:', newConstants); // Debug log
          return newConstants;
        }
  
        // Handle top-level updates
        const newConstants = {
          ...prev,
          [field]: value
        };
        console.log('New constants state:', newConstants); // Debug log
        return newConstants;
      });
    }, []);
  
    const value = {
      assets,
      setAssets,
      constants,
      updateConstants
    };
  
    return (
      <PortfolioContext.Provider value={value}>
        {children}
      </PortfolioContext.Provider>
    );
  };
  
  export default PortfolioProvider;