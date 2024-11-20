// InputsData.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import _ from 'lodash';

class PriceProcessor {
  constructor() {
    this.MIN_YEAR = 2022;
    this.MAX_YEAR = 2100;
    this.priceTypes = [
      { key: 'baseloadBlack', profile: 'baseload', type: 'black' },
      { key: 'solarBlack', profile: 'solar', type: 'black' },
      { key: 'windBlack', profile: 'wind', type: 'black' },
      { key: 'green', profile: 'solar', type: 'green' }
    ];
    this.states = ['NSW', 'QLD', 'SA', 'VIC'];
    
    // Cache for parsed dates to avoid repeated parsing
    this.dateCache = new Map();
  }

  // Parse and cache date string to Date object
  getParsedDate(dateStr) {
    if (!this.dateCache.has(dateStr)) {
      this.dateCache.set(dateStr, new Date(dateStr));
    }
    return this.dateCache.get(dateStr);
  }

  // Get period key based on aggregation level
  getPeriodKey(date, aggregationLevel) {
    const year = date.getFullYear();
    
    switch (aggregationLevel) {
      case 'quarterly': {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      }
      case 'monthly': {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      }
      case 'yearly':
        return `${year}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  // Process merchant prices for a specific state and configuration
  processStateData(rawData, state, constants) {
    if (!rawData?.length) return [];

    // Filter data for the state and create period groups
    const groupedByPeriod = new Map();
    
    rawData.forEach(item => {
      if (item.state !== state) return;
      
      const date = this.getParsedDate(item.time);
      const periodKey = this.getPeriodKey(date, constants.aggregationLevel);
      
      if (!groupedByPeriod.has(periodKey)) {
        groupedByPeriod.set(periodKey, { 
          time: periodKey,
          year: date.getFullYear() // Store the year for escalation reference
        });
      }
      
      const periodData = groupedByPeriod.get(periodKey);
      
      // Match price types and store raw prices
      this.priceTypes.forEach(({ key, profile, type }) => {
        if (item.profile === profile && item.type === type) {
          const realPrice = item.price;
          
          // If we already have a price for this type in this period,
          // average it with the existing value
          if (periodData[key]) {
            periodData[key] = (periodData[key] + realPrice) / 2;
          } else {
            periodData[key] = realPrice;
          }

          // Store the raw price separately for the InputsChart
          const rawKey = `raw_${key}`;
          if (periodData[rawKey]) {
            periodData[rawKey] = (periodData[rawKey] + realPrice) / 2;
          } else {
            periodData[rawKey] = realPrice;
          }
        }
      });
    });

    // Convert to array, apply escalation, and sort
    return Array.from(groupedByPeriod.values())
      .map(periodData => {
        const result = { time: periodData.time };
        
        // Include both raw and escalated prices
        this.priceTypes.forEach(({ key }) => {
          // Store raw price for the chart
          result[`raw_${key}`] = periodData[`raw_${key}`];
          
          // Apply escalation for the final price
          if (periodData[key] !== undefined) {
            result[key] = this.applyEscalation(
              periodData[key],
              periodData.year,
              constants.referenceYear,
              constants.escalation,
              constants.ForecastStartYear
            );
          }
        });
        
        return result;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  // Apply escalation to convert from real to nominal dollars
  applyEscalation(realPrice, year, referenceYear, escalation, forecastStartYear) {
    if (!realPrice || year < forecastStartYear) return realPrice;
    if (!referenceYear || !escalation) return realPrice;
    
    const yearDiff = year - referenceYear;
    return realPrice * Math.pow(1 + escalation / 100, yearDiff);
  }

  // Get display name for price type
  getPriceTypeName(key) {
    const nameMap = {
      baseloadBlack: 'Baseload',
      solarBlack: 'Solar',
      windBlack: 'Wind',
      green: 'Green Certificate'
    };
    return nameMap[key] || key;
  }

  // Calculate Y-axis domain based on data
  calculateYAxisDomain(data) {
    if (!data || !data.length) return [0, 100];

    let maxPrice = -Infinity;
    let minPrice = Infinity;

    data.forEach(point => {
      this.priceTypes.forEach(({ key }) => {
        // Use raw prices for the chart
        const price = point[`raw_${key}`];
        if (typeof price === 'number' && !isNaN(price)) {
          maxPrice = Math.max(maxPrice, price);
          minPrice = Math.min(minPrice, price);
        }
      });
    });

    // Handle edge case where no valid prices were found
    if (maxPrice === -Infinity || minPrice === Infinity) {
      return [0, 100];
    }

    // Round up max and down min to nearest 50 for clean bounds
    const roundedMax = Math.ceil(maxPrice / 50) * 50;
    const roundedMin = Math.max(0, Math.floor(minPrice / 50) * 50);
    
    return [roundedMin, roundedMax];
  }
}

export const useInputsData = () => {
  const { constants, updateConstants, getMerchantPrices, merchantPricesData } = usePortfolio();
  
  // Create a single instance of the processor
  const dataProcessor = useMemo(() => new PriceProcessor(), []);

  // Memoize processed data by state
  const getProcessedData = useCallback((state) => {
    return dataProcessor.processStateData(merchantPricesData, state, constants);
  }, [dataProcessor, merchantPricesData, constants]);

  // Memoize calculate domain function
  const calculateYAxisDomain = useCallback((data) => {
    return dataProcessor.calculateYAxisDomain(data);
  }, [dataProcessor]);

  // Memoize available years calculation
  const availableYears = useMemo(() => {
    if (!merchantPricesData?.length) return [];
    
    const yearsSet = new Set(
      merchantPricesData.map(row => {
        const date = dataProcessor.getParsedDate(row.time);
        return date.getFullYear();
      })
    );
    
    return Array.from(yearsSet)
      .filter(year => year >= dataProcessor.MIN_YEAR && year <= dataProcessor.MAX_YEAR)
      .sort((a, b) => a - b);
  }, [merchantPricesData, dataProcessor]);

  return {
    constants,
    updateConstants,
    merchantPricesData,
    availableYears,
    getProcessedData,
    calculateYAxisDomain,
    dataProcessor
  };
};

export default useInputsData;