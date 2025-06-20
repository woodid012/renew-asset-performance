// src/hooks/useDatabase.js
// React hook for database operations with loading states and error handling

import { useState, useCallback, useRef } from 'react';
import databaseService from '../services/databaseService';

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Generic database operation wrapper
  const executeOperation = useCallback(async (operation, options = {}) => {
    const { 
      showLoading = true, 
      suppressErrors = false,
      onSuccess,
      onError 
    } = options;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    if (showLoading) setLoading(true);
    setError(null);

    try {
      const result = await operation();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return { success: true, data: result, error: null };
    } catch (err) {
      const errorMessage = err.message || 'Database operation failed';
      
      if (!suppressErrors) {
        setError(errorMessage);
        console.error('Database operation error:', err);
      }
      
      if (onError) {
        onError(err);
      }
      
      return { success: false, data: null, error: errorMessage };
    } finally {
      if (showLoading) setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Portfolio operations
  const portfolioOps = {
    load: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.portfolio.getPortfolio(portfolioId),
        options
      );
    }, [executeOperation]),

    save: useCallback(async (portfolioId, portfolioData, options) => {
      return executeOperation(
        () => databaseService.portfolio.updatePortfolio(portfolioId, portfolioData),
        options
      );
    }, [executeOperation]),

    create: useCallback(async (portfolioData, options) => {
      return executeOperation(
        () => databaseService.portfolio.createPortfolio(portfolioData),
        options
      );
    }, [executeOperation]),

    import: useCallback(async (portfolioData, userId, options) => {
      return executeOperation(
        () => databaseService.portfolio.importPortfolio(portfolioData, userId),
        options
      );
    }, [executeOperation]),

    export: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.portfolio.exportPortfolio(portfolioId),
        options
      );
    }, [executeOperation]),

    list: useCallback(async (userId, options) => {
      return executeOperation(
        () => databaseService.portfolio.getPortfolios(userId),
        options
      );
    }, [executeOperation])
  };

  // Asset operations
  const assetOps = {
    load: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.asset.getAssets(portfolioId),
        options
      );
    }, [executeOperation]),

    save: useCallback(async (assetId, assetData, options) => {
      return executeOperation(
        () => databaseService.asset.updateAsset(assetId, assetData),
        options
      );
    }, [executeOperation]),

    create: useCallback(async (assetData, options) => {
      return executeOperation(
        () => databaseService.asset.createAsset(assetData),
        options
      );
    }, [executeOperation]),

    delete: useCallback(async (assetId, options) => {
      return executeOperation(
        () => databaseService.asset.deleteAsset(assetId),
        options
      );
    }, [executeOperation]),

    batchSave: useCallback(async (portfolioId, assetsData, options) => {
      return executeOperation(
        () => databaseService.asset.batchUpdateAssets(portfolioId, assetsData),
        options
      );
    }, [executeOperation])
  };

  // Constants operations
  const constantsOps = {
    load: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.constants.getConstants(portfolioId),
        options
      );
    }, [executeOperation]),

    save: useCallback(async (portfolioId, constantsData, options) => {
      return executeOperation(
        () => databaseService.constants.updateConstants(portfolioId, constantsData),
        options
      );
    }, [executeOperation]),

    updateField: useCallback(async (portfolioId, field, value, options) => {
      return executeOperation(
        () => databaseService.constants.updateConstantField(portfolioId, field, value),
        options
      );
    }, [executeOperation])
  };

  // Scenario operations
  const scenarioOps = {
    load: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.scenario.getScenarios(portfolioId),
        options
      );
    }, [executeOperation]),

    save: useCallback(async (scenarioId, scenarioData, options) => {
      return executeOperation(
        () => databaseService.scenario.updateScenario(scenarioId, scenarioData),
        options
      );
    }, [executeOperation]),

    create: useCallback(async (scenarioData, options) => {
      return executeOperation(
        () => databaseService.scenario.createScenario(scenarioData),
        options
      );
    }, [executeOperation]),

    delete: useCallback(async (scenarioId, options) => {
      return executeOperation(
        () => databaseService.scenario.deleteScenario(scenarioId),
        options
      );
    }, [executeOperation]),

    updateValue: useCallback(async (scenarioId, parameterKey, value, options) => {
      return executeOperation(
        () => databaseService.scenario.updateScenarioValue(scenarioId, parameterKey, value),
        options
      );
    }, [executeOperation])
  };

  // Merchant price operations
  const merchantPriceOps = {
    load: useCallback(async (portfolioId, filters, options) => {
      return executeOperation(
        () => databaseService.merchantPrice.getMerchantPrices(portfolioId, filters),
        options
      );
    }, [executeOperation]),

    save: useCallback(async (portfolioId, priceData, options) => {
      return executeOperation(
        () => databaseService.merchantPrice.updateMerchantPrices(portfolioId, priceData),
        options
      );
    }, [executeOperation]),

    import: useCallback(async (portfolioId, csvData, options) => {
      return executeOperation(
        () => databaseService.merchantPrice.importMerchantPrices(portfolioId, csvData),
        options
      );
    }, [executeOperation])
  };

  // Template operations
  const templateOps = {
    load: useCallback(async (options) => {
      return executeOperation(
        () => databaseService.template.getTemplates(),
        options
      );
    }, [executeOperation]),

    get: useCallback(async (templateId, options) => {
      return executeOperation(
        () => databaseService.template.getTemplate(templateId),
        options
      );
    }, [executeOperation])
  };

  // Bulk operations
  const bulkOps = {
    sync: useCallback(async (portfolioId, portfolioData, options) => {
      return executeOperation(
        () => databaseService.bulk.syncPortfolio(portfolioId, portfolioData),
        options
      );
    }, [executeOperation]),

    backup: useCallback(async (portfolioId, options) => {
      return executeOperation(
        () => databaseService.bulk.backupPortfolio(portfolioId),
        options
      );
    }, [executeOperation]),

    restore: useCallback(async (portfolioId, backupId, options) => {
      return executeOperation(
        () => databaseService.bulk.restorePortfolio(portfolioId, backupId),
        options
      );
    }, [executeOperation])
  };

  // Utility functions
  const clearError = useCallback(() => setError(null), []);

  const checkHealth = useCallback(async (options) => {
    return executeOperation(
      () => databaseService.health.checkHealth(),
      options
    );
  }, [executeOperation]);

  // Cancel any pending operations
  const cancelPendingOperations = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Operations
    portfolio: portfolioOps,
    asset: assetOps,
    constants: constantsOps,
    scenario: scenarioOps,
    merchantPrice: merchantPriceOps,
    template: templateOps,
    bulk: bulkOps,
    
    // Utilities
    clearError,
    checkHealth,
    cancelPendingOperations
  };
};

// Specialized hooks for common operations
export const usePortfolioDatabase = () => {
  const db = useDatabase();
  
  return {
    loading: db.loading,
    error: db.error,
    loadPortfolio: db.portfolio.load,
    savePortfolio: db.portfolio.save,
    createPortfolio: db.portfolio.create,
    importPortfolio: db.portfolio.import,
    exportPortfolio: db.portfolio.export,
    listPortfolios: db.portfolio.list,
    clearError: db.clearError
  };
};

export const useAssetDatabase = () => {
  const db = useDatabase();
  
  return {
    loading: db.loading,
    error: db.error,
    loadAssets: db.asset.load,
    saveAsset: db.asset.save,
    createAsset: db.asset.create,
    deleteAsset: db.asset.delete,
    batchSaveAssets: db.asset.batchSave,
    clearError: db.clearError
  };
};

export const useScenarioDatabase = () => {
  const db = useDatabase();
  
  return {
    loading: db.loading,
    error: db.error,
    loadScenarios: db.scenario.load,
    saveScenario: db.scenario.save,
    createScenario: db.scenario.create,
    deleteScenario: db.scenario.delete,
    updateScenarioValue: db.scenario.updateValue,
    clearError: db.clearError
  };
};