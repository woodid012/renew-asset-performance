// src/hooks/useAssetManagement.jsx - Updated with Database Integration
import { useState, useCallback } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useDatabase } from './useDatabase';
import { 
  calculateYear1Volume, 
  handleNumericInput,
  getDefaultCapacityFactors,
  createNewContract,
  updateBundledPrices
} from '@/utils/assetUtils';
import {
  getDefaultValue,
  DEFAULT_PROJECT_FINANCE
} from '@/lib/default_constants';

export const useAssetManagement = () => {
  const { 
    assets, 
    setAssets, 
    constants, 
    updateConstants,
    portfolioId,
    hasUnsavedChanges,
    savePortfolioToDatabase
  } = usePortfolio();
  
  const db = useDatabase();
  const [newAssets, setNewAssets] = useState(new Set());
  const [savingAssets, setSavingAssets] = useState(false);

  // Helper function to get default values for asset costs
  const getAssetCostDefault = useCallback((field, assetType, capacity) => {
    const parsedCapacity = parseFloat(capacity) || 100;
    
    switch(field) {
      case 'capex':
        return getDefaultValue('capex', 'default', assetType) * parsedCapacity;
      case 'operatingCosts':
        return getDefaultValue('opex', 'default', assetType) * parsedCapacity;
      case 'operatingCostEscalation':
        return DEFAULT_PROJECT_FINANCE.opexEscalation;
      case 'terminalValue':
        return getDefaultValue('terminal', 'default', assetType) * parsedCapacity;
      case 'maxGearing':
        return DEFAULT_PROJECT_FINANCE.maxGearing / 100;
      case 'targetDSCRContract':
        return DEFAULT_PROJECT_FINANCE.targetDSCRContract;
      case 'targetDSCRMerchant':
        return DEFAULT_PROJECT_FINANCE.targetDSCRMerchant;
      case 'interestRate':
        return DEFAULT_PROJECT_FINANCE.interestRate / 100;
      case 'tenorYears':
        return getDefaultValue('finance', 'tenorYears', assetType);
      default:
        return 0;
    }
  }, []);

  // Save assets to database
  const saveAssetsToDatabase = useCallback(async (assetsToSave = null) => {
    if (!portfolioId) return { success: false, error: 'No portfolio ID' };

    setSavingAssets(true);
    try {
      const dataToSave = assetsToSave || assets;
      const result = await db.asset.batchSave(portfolioId, dataToSave, {
        onSuccess: () => {
          console.log('Assets saved to database');
        },
        onError: (error) => {
          console.error('Failed to save assets to database:', error);
        }
      });

      return result;
    } finally {
      setSavingAssets(false);
    }
  }, [portfolioId, assets, db.asset]);

  // Auto-save assets when they change (debounced)
  const scheduleAssetSave = useCallback(async () => {
    if (hasUnsavedChanges && portfolioId) {
      // Use the portfolio-level save which includes assets
      await savePortfolioToDatabase();
    }
  }, [hasUnsavedChanges, portfolioId, savePortfolioToDatabase]);

  // Asset CRUD operations
  const addNewAsset = useCallback(async () => {
    const newId = String(Object.keys(assets).length + 1);
    const assetNumber = Object.keys(assets).length + 1;
    
    const newAsset = {
      id: newId,
      name: `Default Asset ${assetNumber}`,
      state: 'NSW',
      assetStartDate: '2024-01-01',
      capacity: '100',
      type: 'solar',
      volumeLossAdjustment: '100',
      assetLife: '35',
      contracts: []
    };

    const updatedAssets = {
      ...assets,
      [newId]: newAsset
    };

    setAssets(updatedAssets);
    setNewAssets(prev => new Set([...prev, newId]));

    // Save to database if we have a portfolio ID
    if (portfolioId) {
      const result = await db.asset.create({
        portfolio_id: portfolioId,
        name: newAsset.name,
        data: newAsset
      });

      if (result.success) {
        console.log('New asset created in database:', result.data);
      }
    }

    return newId;
  }, [assets, setAssets, portfolioId, db.asset]);

  const updateAsset = useCallback(async (id, field, value, saveImmediately = false) => {
    const updatedAssets = {
      ...assets,
      [id]: {
        ...assets[id],
        [field]: value
      }
    };

    setAssets(updatedAssets);

    // Save to database if requested or if we're in auto-save mode
    if (saveImmediately && portfolioId) {
      const assetData = updatedAssets[id];
      const result = await db.asset.save(id, {
        portfolio_id: portfolioId,
        name: assetData.name,
        data: assetData
      });

      if (result.success) {
        console.log('Asset updated in database:', id);
      }
    } else {
      // Schedule auto-save
      scheduleAssetSave();
    }
  }, [assets, setAssets, portfolioId, db.asset, scheduleAssetSave]);

  const removeAsset = useCallback(async (id) => {
    const updatedAssets = { ...assets };
    delete updatedAssets[id];
    
    setAssets(updatedAssets);
    
    setNewAssets(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });

    // Delete from database
    if (portfolioId) {
      const result = await db.asset.delete(id);
      if (result.success) {
        console.log('Asset deleted from database:', id);
      }
    }
  }, [assets, setAssets, portfolioId, db.asset]);

  // Enhanced field update with database integration
  const handleFieldUpdate = useCallback((id, field, value, options = {}) => {
    const processedValue = handleNumericInput(value, options);
    updateAsset(id, field, processedValue, options.saveImmediately);
  }, [updateAsset]);

  // Date utilities
  const roundToFirstOfMonth = useCallback((dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }, []);

  const addMonthsToDate = useCallback((dateStr, months) => {
    if (!dateStr || !months) return '';
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + parseInt(months));
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }, []);

  const calculateMonthsBetween = useCallback((startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return '';
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    
    return yearDiff * 12 + monthDiff;
  }, []);

  // Enhanced date field handler with automatic calculation and database save
  const handleDateFieldUpdate = useCallback((id, field, value) => {
    const roundedValue = roundToFirstOfMonth(value);
    updateAsset(id, field, roundedValue);
    
    const asset = assets[id];
    if (!asset) return;
    
    if (field === 'constructionStartDate' && asset.constructionDuration) {
      const newOpsStart = addMonthsToDate(roundedValue, asset.constructionDuration);
      if (newOpsStart !== asset.assetStartDate) {
        updateAsset(id, 'assetStartDate', newOpsStart);
      }
    } else if (field === 'assetStartDate' && asset.constructionStartDate) {
      const newDuration = calculateMonthsBetween(asset.constructionStartDate, roundedValue);
      if (newDuration !== asset.constructionDuration) {
        updateAsset(id, 'constructionDuration', newDuration);
      }
    }
  }, [roundToFirstOfMonth, updateAsset, assets, addMonthsToDate, calculateMonthsBetween]);

  // Construction duration handler with database save
  const handleConstructionDurationUpdate = useCallback((id, value) => {
    const processedValue = handleNumericInput(value, { round: true });
    updateAsset(id, 'constructionDuration', processedValue);
    
    const asset = assets[id];
    if (asset?.constructionStartDate && processedValue) {
      const newOpsStart = addMonthsToDate(asset.constructionStartDate, processedValue);
      if (newOpsStart !== asset.assetStartDate) {
        updateAsset(id, 'assetStartDate', newOpsStart);
      }
    }
  }, [handleNumericInput, updateAsset, assets, addMonthsToDate]);

  // Asset costs management with database integration
  const initializeAssetCosts = useCallback(async (assetName, assetType, capacity) => {
    if (!constants.assetCosts[assetName]) {
      const newAssetCosts = {
        ...constants.assetCosts,
        [assetName]: {
          capex: getAssetCostDefault('capex', assetType, capacity),
          operatingCosts: getAssetCostDefault('operatingCosts', assetType, capacity),
          operatingCostEscalation: getAssetCostDefault('operatingCostEscalation', assetType, capacity),
          terminalValue: getAssetCostDefault('terminalValue', assetType, capacity),
          maxGearing: getAssetCostDefault('maxGearing', assetType, capacity),
          targetDSCRContract: getAssetCostDefault('targetDSCRContract', assetType, capacity),
          targetDSCRMerchant: getAssetCostDefault('targetDSCRMerchant', assetType, capacity),
          interestRate: getAssetCostDefault('interestRate', assetType, capacity),
          tenorYears: getAssetCostDefault('tenorYears', assetType, capacity)
        }
      };
      
      // Update constants with database save
      await updateConstants('assetCosts', newAssetCosts, true); // Auto-save enabled
    }
  }, [constants.assetCosts, getAssetCostDefault, updateConstants]);

  const updateAssetCost = useCallback(async (assetName, field, value) => {
    let processedValue = value === '' ? '' : parseFloat(value);
    
    if (field === 'maxGearing' || field === 'interestRate') {
      processedValue = processedValue === '' ? '' : processedValue / 100;
    }
    
    const newAssetCosts = {
      ...constants.assetCosts,
      [assetName]: {
        ...constants.assetCosts[assetName],
        [field]: processedValue
      }
    };
    
    // Update constants with database save
    await updateConstants('assetCosts', newAssetCosts, true); // Auto-save enabled
  }, [constants.assetCosts, updateConstants]);

  // Contract management with database integration
  const updateAssetContracts = useCallback(async (id, contracts) => {
    await updateAsset(id, 'contracts', contracts, true); // Save immediately for contracts
  }, [updateAsset]);

  const addContract = useCallback(async (assetId) => {
    const asset = assets[assetId];
    if (!asset) return;
    
    const newContract = createNewContract(asset.contracts, asset.assetStartDate);
    await updateAssetContracts(assetId, [...asset.contracts, newContract]);
  }, [assets, updateAssetContracts]);

  const removeContract = useCallback(async (assetId, contractId) => {
    const asset = assets[assetId];
    if (!asset) return;
    
    const updatedContracts = asset.contracts.filter(c => c.id !== contractId);
    await updateAssetContracts(assetId, updatedContracts);
  }, [assets, updateAssetContracts]);

  const updateContract = useCallback(async (assetId, contractId, field, value) => {
    const asset = assets[assetId];
    if (!asset) return;
    
    const updatedContracts = asset.contracts.map(contract => {
      if (contract.id !== contractId) return contract;
      
      const updatedContract = updateBundledPrices({...contract}, field, value);
      
      if (['strikePrice', 'EnergyPrice', 'greenPrice', 'buyersPercentage', 'indexation'].includes(field)) {
        updatedContract[field] = value === '' ? '' : value;
      } else {
        updatedContract[field] = value;
      }
      
      return updatedContract;
    });

    await updateAssetContracts(assetId, updatedContracts);
  }, [assets, updateAssetContracts]);

  // Capacity factors management
  const updateCapacityFactors = useCallback(async (assetId) => {
    const asset = assets[assetId];
    if (!asset) return;
    
    const factors = getDefaultCapacityFactors(asset, constants);
    const updates = [];
    
    Object.entries(factors).forEach(([key, value]) => {
      if (key === 'annual') {
        updates.push(['capacityFactor', value]);
      } else {
        updates.push([`qtrCapacityFactor_${key}`, value]);
      }
    });

    // Batch update all capacity factors
    for (const [field, value] of updates) {
      await updateAsset(assetId, field, value);
    }
  }, [assets, constants, updateAsset]);

  // Bulk operations
  const batchUpdateAssets = useCallback(async (updatedAssets) => {
    setAssets(updatedAssets);
    
    if (portfolioId) {
      const result = await saveAssetsToDatabase(updatedAssets);
      return result;
    }
    
    return { success: true };
  }, [setAssets, portfolioId, saveAssetsToDatabase]);

  // Load assets from database
  const loadAssetsFromDatabase = useCallback(async () => {
    if (!portfolioId) return { success: false, error: 'No portfolio ID' };

    const result = await db.asset.load(portfolioId, {
      onSuccess: (assetsData) => {
        // Convert array to object keyed by asset ID
        const assetsObject = {};
        assetsData.forEach(asset => {
          assetsObject[asset.id] = asset.data;
        });
        setAssets(assetsObject);
        console.log('Assets loaded from database');
      },
      onError: (error) => {
        console.error('Failed to load assets from database:', error);
      }
    });

    return result;
  }, [portfolioId, db.asset, setAssets]);

  // Calculated values
  const getYear1Volume = useCallback((assetId) => {
    const asset = assets[assetId];
    return asset ? calculateYear1Volume(asset) : null;
  }, [assets]);

  const getAssetCosts = useCallback((assetName) => {
    return constants.assetCosts?.[assetName] || {};
  }, [constants.assetCosts]);

  return {
    // State
    assets,
    newAssets,
    constants,
    savingAssets,
    
    // Asset operations
    addNewAsset,
    updateAsset,
    removeAsset,
    handleFieldUpdate,
    handleDateFieldUpdate,
    handleConstructionDurationUpdate,
    
    // Asset costs
    initializeAssetCosts,
    updateAssetCost,
    getAssetCosts,
    getAssetCostDefault,
    
    // Contracts
    updateAssetContracts,
    addContract,
    removeContract,
    updateContract,
    
    // Capacity factors
    updateCapacityFactors,
    
    // Database operations
    saveAssetsToDatabase,
    loadAssetsFromDatabase,
    batchUpdateAssets,
    
    // Utilities
    getYear1Volume,
    roundToFirstOfMonth,
    addMonthsToDate,
    calculateMonthsBetween,
  };
};