// useEarAnalysis.js
import { useState, useEffect, useMemo } from 'react';
import { generateScenarios, calculateYearlyMetrics, createHistogramData } from './EaR_calculation';

export const useEarAnalysis = (assets, constants, getMerchantPrice) => {
  const [scenarios, setScenarios] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Calculate scenarios when inputs change
  useEffect(() => {
    const calculateScenarios = async () => {
      if (!assets || Object.keys(assets).length === 0) {
        setScenarios([]);
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        // Use web worker or setTimeout to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
        const newScenarios = generateScenarios(assets, constants, getMerchantPrice);
        setScenarios(newScenarios);
      } catch (err) {
        setError(err.message);
        console.error('Error calculating scenarios:', err);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateScenarios();
  }, [
    assets,
    constants.analysisStartYear,
    constants.analysisEndYear,
    constants.volumeVariation,
    constants.greenPriceVariation,
    constants.blackPriceVariation,
    getMerchantPrice
  ]);

  // Memoize results for a specific year
  const getYearlyAnalysis = useMemo(() => {
    return (selectedYear) => {
      if (!scenarios.length) return null;

      const metrics = calculateYearlyMetrics(scenarios, selectedYear, assets, constants, getMerchantPrice);
      const histogram = createHistogramData(scenarios, selectedYear);

      return {
        metrics,
        histogram,
        isCalculating,
        error
      };
    };
  }, [scenarios, assets, constants, getMerchantPrice, isCalculating, error]);

  return {
    getYearlyAnalysis,
    isCalculating,
    error,
    hasScenarios: scenarios.length > 0
  };
};