/**
 * Default Constants Reference File
 * Path: C:\Projects\renew-asset-performance\src\lib\default_constants.js
 * 
 * This file contains all default values used throughout the portfolio management application.
 * These constants serve as fallback values when user-defined values are not provided.
 */

// Asset Cost Parameters - Default capex and opex rates by technology
export const DEFAULT_CAPEX_RATES = {
  solar: 1.2,     // $M per MW
  wind: 2.5,      // $M per MW
  storage: 1.6,   // $M per MW
  default: 2.0    // $M per MW
};

export const DEFAULT_OPEX_RATES = {
  solar: 0.014,    // $M per MW per annum
  wind: 0.040,     // $M per MW per annum
  storage: 0.015,  // $M per MW per annum
  default: 0.030   // $M per MW per annum
};

// Project Finance Parameters - Default debt and financing assumptions
export const DEFAULT_PROJECT_FINANCE = {
  maxGearing: 70,              // %
  targetDSCRContract: 1.35,    // x
  targetDSCRMerchant: 2.00,    // x
  interestRate: 6.0,           // %
  opexEscalation: 2.5,         // %
  tenorYears: {
    solar: 22,                 // years
    wind: 22,                  // years
    storage: 18,               // years
    default: 20                // years
  }
};

// Platform Management - Corporate-level operational costs and policies
export const DEFAULT_PLATFORM_COSTS = {
  platformOpex: 4.2,           // $M per annum
  otherOpex: 1.0,              // $M per annum
  platformOpexEscalation: 2.5, // %
  dividendPolicy: 85,          // %
  minimumCashBalance: 5.0      // $M
};

// Tax and Depreciation - Corporate tax and asset depreciation settings
export const DEFAULT_TAX_DEPRECIATION = {
  corporateTaxRate: 0,         // %
  deprecationPeriods: {
    solar: 30,                 // years
    wind: 30,                  // years
    storage: 20                // years
  }
};

// Valuation - Discount rates for NPV calculations
export const DEFAULT_DISCOUNT_RATES = {
  contract: 8.0,               // %
  merchant: 10.0               // %
};

// Risk Analysis - Monte Carlo simulation parameters
export const DEFAULT_RISK_PARAMETERS = {
  volumeVariation: 20,         // ±%
  EnergyPriceVariation: 20,    // ±%
  greenPriceVariation: 20      // ±%
};

// Price Settings - Real-to-nominal price conversion
export const DEFAULT_PRICE_SETTINGS = {
  escalation: 2.5,             // %
  referenceYear: new Date().getFullYear()
};

// Data Sources - Default price curve sources
export const DEFAULT_DATA_SOURCES = {
  priceCurveSource: 'merchant_price_monthly.csv',
  availableSources: [
    { value: 'merchant_price_monthly.csv', label: 'Monthly Merchant Prices' },
    { value: 'imported', label: 'Imported Prices' }
  ]
};

// Utility Functions for working with defaults
export const getDefaultValue = (category, key, assetType = null) => {
  const categoryMap = {
    capex: DEFAULT_CAPEX_RATES,
    opex: DEFAULT_OPEX_RATES,
    finance: DEFAULT_PROJECT_FINANCE,
    platform: DEFAULT_PLATFORM_COSTS,
    tax: DEFAULT_TAX_DEPRECIATION,
    discount: DEFAULT_DISCOUNT_RATES,
    risk: DEFAULT_RISK_PARAMETERS,
    price: DEFAULT_PRICE_SETTINGS,
    data: DEFAULT_DATA_SOURCES
  };

  const categoryDefaults = categoryMap[category];
  if (!categoryDefaults) return null;

  if (assetType && categoryDefaults[assetType] !== undefined) {
    return categoryDefaults[assetType];
  }

  return categoryDefaults[key] || categoryDefaults.default;
};

// Asset type validation
export const VALID_ASSET_TYPES = ['solar', 'wind', 'storage'];

export const isValidAssetType = (assetType) => {
  return VALID_ASSET_TYPES.includes(assetType);
};

// Formatting utilities
export const formatPercent = (value) => `${value}%`;
export const formatCurrency = (value) => `$${value}M`;
export const formatRate = (value) => `$${value}M/MW`;
export const formatMultiplier = (value) => `${value}x`;
export const formatYears = (value) => `${value} years`;

// Constants for UI consistency
export const UI_CONSTANTS = {
  colors: {
    defaultValue: 'text-blue-600',
    userValue: 'text-black',
    tableHeader: 'font-medium'
  },
  spacing: {
    cardGap: 'space-y-6',
    contentPadding: 'p-4',
    gridGap: 'gap-6'
  }
};

export default {
  DEFAULT_CAPEX_RATES,
  DEFAULT_OPEX_RATES,
  DEFAULT_PROJECT_FINANCE,
  DEFAULT_PLATFORM_COSTS,
  DEFAULT_TAX_DEPRECIATION,
  DEFAULT_DISCOUNT_RATES,
  DEFAULT_RISK_PARAMETERS,
  DEFAULT_PRICE_SETTINGS,
  DEFAULT_DATA_SOURCES,
  getDefaultValue,
  VALID_ASSET_TYPES,
  isValidAssetType,
  formatPercent,
  formatCurrency,
  formatRate,
  formatMultiplier,
  formatYears,
  UI_CONSTANTS
};