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
      name: 'Example Solar Farm',
      state: 'NSW',
      capacity: 100,
      type: 'solar',
      volumeLossAdjustment: 95,
      contracts: [
        {
          id: '1',
          counterparty: "Counterparty 1",
          type: 'bundled',
          buyersPercentage: 70,
          shape: 'solar',
          strikePrice: '75',
          greenPrice: '30',
          blackPrice: '45',
          indexation: 2.5,
          hasFloor: true,
          floorValue: '0',
          startDate: '2024-01-01',
          endDate: '2034-12-31',
          term: '10'
        },
        {
          id: '2',
          counterparty: "Counterparty 2",
          type: 'green',
          buyersPercentage: 20,
          shape: 'solar',
          strikePrice: '45',
          greenPrice: '',
          blackPrice: '',
          indexation: 2.0,
          hasFloor: false,
          floorValue: '',
          startDate: '2024-01-01',
          endDate: '2029-12-31',
          term: '5'
        }
      ]
    }
  });

  // Initialize constants state
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
      NSW: {
        black: 75,
        green: 25,
        escalation: 3.0
      },
      VIC: {
        black: 70,
        green: 22,
        escalation: 2.8
      }
    },
    analysisStartYear: 2024,
    analysisEndYear: 2030,
    volumeVariation: 20,
    priceVariation: 30
  });

  // Create updateConstants as a useCallback to prevent unnecessary rerenders
  const updateConstants = useCallback((field, value) => {
    console.log('Updating constant:', field, 'to:', value); // Debug log
    setConstants(prev => {
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