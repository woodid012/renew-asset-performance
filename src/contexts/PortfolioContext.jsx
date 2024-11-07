import React, { createContext, useContext, useState } from 'react';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  // Initialize state with both assets and constants
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

  const value = {
    assets,
    setAssets,
    constants,
    updateConstants: (field, value) => {
      setConstants(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};