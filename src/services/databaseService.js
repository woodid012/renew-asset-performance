// src/services/databaseService.js
// Database abstraction layer for portfolio management

/**
 * Database Service Configuration
 * This service provides a unified interface for database operations
 * Can be configured to work with different backends (REST API, GraphQL, etc.)
 */

// Configuration - Update these based on your backend setup
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const API_ENDPOINTS = {
  portfolios: '/portfolios',
  assets: '/assets',
  constants: '/constants',
  scenarios: '/scenarios',
  users: '/users',
  merchantPrices: '/merchant-prices',
  templates: '/templates'
};

// Utility function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    // Handle different response types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
};

/**
 * Portfolio Management Operations
 */
export const portfolioService = {
  // Get all portfolios for a user
  async getPortfolios(userId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}?userId=${userId}`);
  },

  // Get specific portfolio by ID
  async getPortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}`);
  },

  // Create new portfolio
  async createPortfolio(portfolioData) {
    return await apiCall(API_ENDPOINTS.portfolios, {
      method: 'POST',
      body: JSON.stringify(portfolioData)
    });
  },

  // Update existing portfolio
  async updatePortfolio(portfolioId, portfolioData) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify(portfolioData)
    });
  },

  // Delete portfolio
  async deletePortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}`, {
      method: 'DELETE'
    });
  },

  // Import portfolio data
  async importPortfolio(portfolioData, userId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/import`, {
      method: 'POST',
      body: JSON.stringify({ ...portfolioData, userId })
    });
  },

  // Export portfolio data
  async exportPortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/export`);
  }
};

/**
 * Asset Management Operations
 */
export const assetService = {
  // Get assets for a portfolio
  async getAssets(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.assets}?portfolioId=${portfolioId}`);
  },

  // Get specific asset
  async getAsset(assetId) {
    return await apiCall(`${API_ENDPOINTS.assets}/${assetId}`);
  },

  // Create new asset
  async createAsset(assetData) {
    return await apiCall(API_ENDPOINTS.assets, {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
  },

  // Update asset
  async updateAsset(assetId, assetData) {
    return await apiCall(`${API_ENDPOINTS.assets}/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    });
  },

  // Delete asset
  async deleteAsset(assetId) {
    return await apiCall(`${API_ENDPOINTS.assets}/${assetId}`, {
      method: 'DELETE'
    });
  },

  // Batch update assets
  async batchUpdateAssets(portfolioId, assetsData) {
    return await apiCall(`${API_ENDPOINTS.assets}/batch`, {
      method: 'PUT',
      body: JSON.stringify({ portfolioId, assets: assetsData })
    });
  }
};

/**
 * Constants Management Operations
 */
export const constantsService = {
  // Get constants for a portfolio
  async getConstants(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.constants}?portfolioId=${portfolioId}`);
  },

  // Update constants
  async updateConstants(portfolioId, constantsData) {
    return await apiCall(`${API_ENDPOINTS.constants}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify(constantsData)
    });
  },

  // Update specific constant field
  async updateConstantField(portfolioId, field, value) {
    return await apiCall(`${API_ENDPOINTS.constants}/${portfolioId}/field`, {
      method: 'PATCH',
      body: JSON.stringify({ field, value })
    });
  }
};

/**
 * Scenario Management Operations
 */
export const scenarioService = {
  // Get scenarios for a portfolio
  async getScenarios(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.scenarios}?portfolioId=${portfolioId}`);
  },

  // Create new scenario
  async createScenario(scenarioData) {
    return await apiCall(API_ENDPOINTS.scenarios, {
      method: 'POST',
      body: JSON.stringify(scenarioData)
    });
  },

  // Update scenario
  async updateScenario(scenarioId, scenarioData) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}`, {
      method: 'PUT',
      body: JSON.stringify(scenarioData)
    });
  },

  // Delete scenario
  async deleteScenario(scenarioId) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}`, {
      method: 'DELETE'
    });
  },

  // Update scenario value
  async updateScenarioValue(scenarioId, parameterKey, value) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}/value`, {
      method: 'PATCH',
      body: JSON.stringify({ parameterKey, value })
    });
  }
};

/**
 * User Management Operations
 */
export const userService = {
  // Get user profile
  async getUser(userId) {
    return await apiCall(`${API_ENDPOINTS.users}/${userId}`);
  },

  // Update user profile
  async updateUser(userId, userData) {
    return await apiCall(`${API_ENDPOINTS.users}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  // Get user portfolios
  async getUserPortfolios(userId) {
    return await apiCall(`${API_ENDPOINTS.users}/${userId}/portfolios`);
  }
};

/**
 * Merchant Price Data Operations
 */
export const merchantPriceService = {
  // Get merchant prices
  async getMerchantPrices(portfolioId, filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiCall(`${API_ENDPOINTS.merchantPrices}?portfolioId=${portfolioId}&${queryParams}`);
  },

  // Update merchant prices
  async updateMerchantPrices(portfolioId, priceData) {
    return await apiCall(`${API_ENDPOINTS.merchantPrices}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify(priceData)
    });
  },

  // Import merchant prices from CSV
  async importMerchantPrices(portfolioId, csvData) {
    return await apiCall(`${API_ENDPOINTS.merchantPrices}/import`, {
      method: 'POST',
      body: JSON.stringify({ portfolioId, csvData })
    });
  }
};

/**
 * Template Management Operations
 */
export const templateService = {
  // Get available templates
  async getTemplates() {
    return await apiCall(API_ENDPOINTS.templates);
  },

  // Get specific template
  async getTemplate(templateId) {
    return await apiCall(`${API_ENDPOINTS.templates}/${templateId}`);
  },

  // Create custom template
  async createTemplate(templateData) {
    return await apiCall(API_ENDPOINTS.templates, {
      method: 'POST',
      body: JSON.stringify(templateData)
    });
  }
};

/**
 * Database Health Check
 */
export const healthService = {
  // Check database connection
  async checkHealth() {
    try {
      return await apiCall('/health');
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
};

/**
 * Bulk Operations
 */
export const bulkService = {
  // Sync entire portfolio to database
  async syncPortfolio(portfolioId, portfolioData) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/sync`, {
      method: 'POST',
      body: JSON.stringify(portfolioData)
    });
  },

  // Backup portfolio data
  async backupPortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/backup`, {
      method: 'POST'
    });
  },

  // Restore portfolio from backup
  async restorePortfolio(portfolioId, backupId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ backupId })
    });
  }
};

// Export all services
export default {
  portfolio: portfolioService,
  asset: assetService,
  constants: constantsService,
  scenario: scenarioService,
  user: userService,
  merchantPrice: merchantPriceService,
  template: templateService,
  health: healthService,
  bulk: bulkService
};