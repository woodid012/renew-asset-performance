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
          floorValue: '70',
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