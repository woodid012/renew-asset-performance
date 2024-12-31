// EarDashboard.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useEarAnalysis } from './useEarAnalysis';
import EarInputs from './EarInputs';
import EarOutputs from './EarOutputs';

const EarningsRiskAnalysis = () => {
  const { 
    assets, 
    constants, 
    updateConstants, 
    getMerchantPrice,
    analysisMode,
    updateAnalysisMode 
  } = usePortfolio();
  
  const [selectedYear, setSelectedYear] = useState(constants.analysisStartYear);
  const [timePeriods, setTimePeriods] = useState(null);
  
  const { getYearlyAnalysis, isCalculating, error, hasScenarios } = useEarAnalysis(
    assets, 
    constants, 
    getMerchantPrice,
    timePeriods
  );

  // Handle time period changes from EarInputs
  const handleTimePeriodsChange = useCallback((newPeriods) => {
    setTimePeriods(newPeriods);
  }, []);

  // Memoize the analysis for the selected year
  const yearlyAnalysis = useMemo(() => {
    if (!hasScenarios) return null;
    return getYearlyAnalysis(selectedYear);
  }, [
    hasScenarios,
    getYearlyAnalysis,
    selectedYear,
    timePeriods
  ]);

  // Memoize waterfall data
  const waterfallData = useMemo(() => {
    if (!hasScenarios) return [];
    
    return Array.from(
      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
      (_, i) => {
        const year = constants.analysisStartYear + i;
        const yearAnalysis = getYearlyAnalysis(year);
        if (!yearAnalysis) return null;
        
        const { metrics } = yearAnalysis;
        return {
          year,
          baseCase: metrics.baseCase,
          p10: metrics.p10,
          p90: metrics.p90,
          worstCase: metrics.stressTests.worstCase,
          volumeStress: metrics.stressTests.volumeStress,
          priceStress: metrics.stressTests.priceStress
        };
      }
    ).filter(Boolean);
  }, [
    hasScenarios,
    getYearlyAnalysis,
    constants.analysisStartYear,
    constants.analysisEndYear,
    timePeriods
  ]);

  // Memoized callback for year changes
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  if (!assets || Object.keys(assets).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-gray-500">
        <p className="text-lg font-medium">No Assets Available</p>
        <p className="text-sm">Add assets to view risk analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <EarInputs 
        constants={constants} 
        updateConstants={updateConstants}
        onTimePeriodsChange={handleTimePeriodsChange}
        mode={analysisMode}
        setMode={updateAnalysisMode}
      />
      
      <EarOutputs
        yearlyAnalysis={yearlyAnalysis}
        waterfallData={waterfallData}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        constants={constants}
        isCalculating={isCalculating}
        error={error}
      />
    </div>
  );
};

export default EarningsRiskAnalysis;