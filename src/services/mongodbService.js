// src/services/mongodbService.js
// MongoDB-specific database service for portfolio management

/**
 * MongoDB Service Configuration
 * Uses the existing MongoDB connection from your energy_contracts database
 */

// Configuration - Update these based on your MongoDB setup
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

// Utility function for API calls (same as before but optimized for MongoDB responses)
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
 * Portfolio Management Operations - MongoDB Optimized
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

  // Create new portfolio (MongoDB will auto-generate _id)
  async createPortfolio(portfolioData) {
    return await apiCall(API_ENDPOINTS.portfolios, {
      method: 'POST',
      body: JSON.stringify({
        ...portfolioData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Update existing portfolio (MongoDB upsert operation)
  async updatePortfolio(portfolioId, portfolioData) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...portfolioData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Delete portfolio and all related data
  async deletePortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}`, {
      method: 'DELETE'
    });
  },

  // Import portfolio data (creates new portfolio with all nested data)
  async importPortfolio(portfolioData, userId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/import`, {
      method: 'POST',
      body: JSON.stringify({ 
        ...portfolioData, 
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Export portfolio data (includes all nested collections)
  async exportPortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/export`);
  }
};

/**
 * Asset Management Operations - Embedded in Portfolio Document
 */
export const assetService = {
  // Get assets for a portfolio (from embedded assets array)
  async getAssets(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.assets}?portfolioId=${portfolioId}`);
  },

  // Get specific asset
  async getAsset(portfolioId, assetId) {
    return await apiCall(`${API_ENDPOINTS.assets}/${portfolioId}/${assetId}`);
  },

  // Create new asset (adds to portfolio's assets array)
  async createAsset(portfolioId, assetData) {
    return await apiCall(`${API_ENDPOINTS.assets}/${portfolioId}`, {
      method: 'POST',
      body: JSON.stringify({
        ...assetData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Update asset (updates specific asset in portfolio's assets array)
  async updateAsset(portfolioId, assetId, assetData) {
    return await apiCall(`${API_ENDPOINTS.assets}/${portfolioId}/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...assetData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Delete asset (removes from portfolio's assets array)
  async deleteAsset(portfolioId, assetId) {
    return await apiCall(`${API_ENDPOINTS.assets}/${portfolioId}/${assetId}`, {
      method: 'DELETE'
    });
  },

  // Batch update assets (replaces entire assets array)
  async batchUpdateAssets(portfolioId, assetsData) {
    return await apiCall(`${API_ENDPOINTS.assets}/${portfolioId}/batch`, {
      method: 'PUT',
      body: JSON.stringify({
        assets: assetsData,
        updatedAt: new Date().toISOString()
      })
    });
  }
};

/**
 * Constants Management Operations - Embedded in Portfolio Document
 */
export const constantsService = {
  // Get constants for a portfolio (from embedded constants object)
  async getConstants(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.constants}?portfolioId=${portfolioId}`);
  },

  // Update constants (replaces entire constants object)
  async updateConstants(portfolioId, constantsData) {
    return await apiCall(`${API_ENDPOINTS.constants}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify({
        constants: constantsData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Update specific constant field (uses MongoDB $set operator)
  async updateConstantField(portfolioId, field, value) {
    return await apiCall(`${API_ENDPOINTS.constants}/${portfolioId}/field`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        field, 
        value,
        updatedAt: new Date().toISOString()
      })
    });
  }
};

/**
 * Scenario Management Operations - Separate Collection
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
      body: JSON.stringify({
        ...scenarioData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Update scenario
  async updateScenario(scenarioId, scenarioData) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...scenarioData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Delete scenario
  async deleteScenario(scenarioId) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}`, {
      method: 'DELETE'
    });
  },

  // Update scenario value (uses MongoDB $set for specific field)
  async updateScenarioValue(scenarioId, parameterKey, value) {
    return await apiCall(`${API_ENDPOINTS.scenarios}/${scenarioId}/value`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        parameterKey, 
        value,
        updatedAt: new Date().toISOString()
      })
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
      body: JSON.stringify({
        ...userData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Get user portfolios
  async getUserPortfolios(userId) {
    return await apiCall(`${API_ENDPOINTS.users}/${userId}/portfolios`);
  },

  // Create new user
  async createUser(userData) {
    return await apiCall(API_ENDPOINTS.users, {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    });
  }
};

/**
 * Merchant Price Data Operations - Separate Collection
 */
export const merchantPriceService = {
  // Get merchant prices (can be portfolio-specific or global)
  async getMerchantPrices(portfolioId = null, filters = {}) {
    const queryParams = new URLSearchParams({
      ...(portfolioId && { portfolioId }),
      ...filters
    }).toString();
    return await apiCall(`${API_ENDPOINTS.merchantPrices}?${queryParams}`);
  },

  // Update merchant prices for a portfolio
  async updateMerchantPrices(portfolioId, priceData) {
    return await apiCall(`${API_ENDPOINTS.merchantPrices}/${portfolioId}`, {
      method: 'PUT',
      body: JSON.stringify({
        portfolioId,
        priceData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Import merchant prices from CSV
  async importMerchantPrices(portfolioId, csvData) {
    return await apiCall(`${API_ENDPOINTS.merchantPrices}/import`, {
      method: 'POST',
      body: JSON.stringify({ 
        portfolioId, 
        csvData,
        createdAt: new Date().toISOString()
      })
    });
  },

  // Get global merchant prices (not portfolio-specific)
  async getGlobalMerchantPrices(filters = {}) {
    return await this.getMerchantPrices(null, filters);
  }
};

/**
 * Template Management Operations - Global Collection
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
      body: JSON.stringify({
        ...templateData,
        createdAt: new Date().toISOString()
      })
    });
  },

  // Update template
  async updateTemplate(templateId, templateData) {
    return await apiCall(`${API_ENDPOINTS.templates}/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...templateData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Delete template
  async deleteTemplate(templateId) {
    return await apiCall(`${API_ENDPOINTS.templates}/${templateId}`, {
      method: 'DELETE'
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
 * Bulk Operations - MongoDB Optimized
 */
export const bulkService = {
  // Sync entire portfolio to database (atomic operation)
  async syncPortfolio(portfolioId, portfolioData) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/sync`, {
      method: 'POST',
      body: JSON.stringify({
        ...portfolioData,
        updatedAt: new Date().toISOString()
      })
    });
  },

  // Create backup of portfolio data
  async backupPortfolio(portfolioId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/backup`, {
      method: 'POST',
      body: JSON.stringify({
        backupDate: new Date().toISOString()
      })
    });
  },

  // Restore portfolio from backup
  async restorePortfolio(portfolioId, backupId) {
    return await apiCall(`${API_ENDPOINTS.portfolios}/${portfolioId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ 
        backupId,
        restoredAt: new Date().toISOString()
      })
    });
  },

  // Batch operations for multiple portfolios
  async batchOperation(operation, portfolioIds, data = {}) {
    return await apiCall('/batch', {
      method: 'POST',
      body: JSON.stringify({
        operation,
        portfolioIds,
        data,
        timestamp: new Date().toISOString()
      })
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