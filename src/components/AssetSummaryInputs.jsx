import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  formatNumericValue, 
  handleNumericInput,
  createNewContract
} from './AssetUtils';
import {
  DEFAULT_CAPEX_RATES,
  DEFAULT_OPEX_RATES,
  DEFAULT_PROJECT_FINANCE,
  DEFAULT_TAX_DEPRECIATION,
  DEFAULT_ASSET_PERFORMANCE,
  DEFAULT_TERMINAL_RATES,
  getDefaultValue,
  UI_CONSTANTS
} from '@/lib/default_constants';

const AssetSummaryInputs = () => {
  const { assets, setAssets, constants, updateConstants } = usePortfolio();
  const [editState, setEditState] = useState({});
  const [activeTab, setActiveTab] = useState("assets");
  const assetCosts = constants.assetCosts || {};

  // Ensure deprecation periods and tax rate exist with defaults
  const corporateTaxRate = constants.corporateTaxRate !== undefined ? constants.corporateTaxRate : DEFAULT_TAX_DEPRECIATION.corporateTaxRate;
  const deprecationPeriods = constants.deprecationPeriods || DEFAULT_TAX_DEPRECIATION.deprecationPeriods;

  // Helper function to determine if a value is default (blue) or user-defined (black)
  const getValueStyle = (currentValue, defaultValue) => {
    const isDefault = currentValue === undefined || currentValue === null || currentValue === defaultValue;
    return isDefault ? UI_CONSTANTS.colors.defaultValue : UI_CONSTANTS.colors.userValue;
  };

  // Helper function to get default values for asset costs
  const getAssetCostDefault = (field, assetType, capacity) => {
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
        return DEFAULT_PROJECT_FINANCE.maxGearing;
      case 'targetDSCRContract':
        return DEFAULT_PROJECT_FINANCE.targetDSCRContract;
      case 'targetDSCRMerchant':
        return DEFAULT_PROJECT_FINANCE.targetDSCRMerchant;
      case 'interestRate':
        return DEFAULT_PROJECT_FINANCE.interestRate;
      case 'tenorYears':
        return getDefaultValue('finance', 'tenorYears', assetType);
      default:
        return 0;
    }
  };

  // Helper function to round date to first of nearest month
  const roundToFirstOfMonth = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Set to first day of the month
    date.setDate(1);
    return date.toISOString().split('T')[0];
  };

  // Helper function to add months to a date and round to first of month
  const addMonthsToDate = (dateStr, months) => {
    if (!dateStr || !months) return '';
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + parseInt(months));
    date.setDate(1); // Always set to first of month
    return date.toISOString().split('T')[0];
  };

  // Helper function to calculate months between two dates
  const calculateMonthsBetween = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return '';
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    
    return yearDiff * 12 + monthDiff;
  };

  // Initialize tax/depreciation values if they don't exist
  useEffect(() => {
    if (constants.corporateTaxRate === undefined) {
      updateConstants('corporateTaxRate', DEFAULT_TAX_DEPRECIATION.corporateTaxRate);
    }
    
    if (!constants.deprecationPeriods) {
      updateConstants('deprecationPeriods', DEFAULT_TAX_DEPRECIATION.deprecationPeriods);
    }
  }, [constants, updateConstants]);

  // Initialize edit state with asset values
  useEffect(() => {
    const initialState = {};
    Object.values(assets).forEach(asset => {
      // Create a deep copy to avoid reference issues
      initialState[asset.id] = JSON.parse(JSON.stringify(asset));
    });
    setEditState(initialState);
  }, [assets]);

  // Update a field for a specific asset with linked date logic
  const handleFieldUpdate = (assetId, field, value, options = {}) => {
    console.log(`Updating field ${field} for asset ${assetId} with value:`, value);
    
    // Handle date fields with linked logic
    if (field === 'constructionStartDate' || field === 'assetStartDate') {
      handleDateFieldUpdate(assetId, field, value);
      return;
    }
    
    // Handle construction duration with linked logic
    if (field === 'constructionDuration') {
      handleConstructionDurationUpdate(assetId, value);
      return;
    }
    
    // For all other fields, use normal processing
    setEditState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: handleNumericInput(value, options)
      }
    }));
  };

  // Enhanced date field handler with automatic calculation
  const handleDateFieldUpdate = (assetId, field, value) => {
    // Round the input date to first of month
    const roundedValue = roundToFirstOfMonth(value);
    
    // Update the changed field first
    setEditState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: roundedValue
      }
    }));
    
    // Get current asset data
    const currentAsset = editState[assetId];
    if (!currentAsset) return;
    
    // Then calculate the dependent field based on which field was changed
    if (field === 'constructionStartDate' && currentAsset.constructionDuration) {
      // Calculate ops start from cons start + duration
      const newOpsStart = addMonthsToDate(roundedValue, currentAsset.constructionDuration);
      if (newOpsStart !== currentAsset.assetStartDate) {
        setEditState(prev => ({
          ...prev,
          [assetId]: {
            ...prev[assetId],
            assetStartDate: newOpsStart
          }
        }));
      }
    } else if (field === 'assetStartDate' && currentAsset.constructionStartDate) {
      // Calculate construction duration from the difference
      const newDuration = calculateMonthsBetween(currentAsset.constructionStartDate, roundedValue);
      if (newDuration !== currentAsset.constructionDuration) {
        setEditState(prev => ({
          ...prev,
          [assetId]: {
            ...prev[assetId],
            constructionDuration: newDuration
          }
        }));
      }
    }
  };

  // Enhanced construction duration handler
  const handleConstructionDurationUpdate = (assetId, value) => {
    const processedValue = handleNumericInput(value, { round: true });
    
    // Update the construction duration field
    setEditState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        constructionDuration: processedValue
      }
    }));
    
    // Get current asset data
    const currentAsset = editState[assetId];
    if (!currentAsset) return;
    
    // If we have a construction start date, calculate the ops start
    if (currentAsset.constructionStartDate && processedValue) {
      const newOpsStart = addMonthsToDate(currentAsset.constructionStartDate, processedValue);
      if (newOpsStart !== currentAsset.assetStartDate) {
        setEditState(prev => ({
          ...prev,
          [assetId]: {
            ...prev[assetId],
            assetStartDate: newOpsStart
          }
        }));
      }
    }
  };

  // Add a new contract to all assets
  const addContractToAll = () => {
    const updatedAssets = {};
    
    Object.entries(assets).forEach(([id, asset]) => {
      const newContract = createNewContract(asset.contracts, asset.assetStartDate);
      updatedAssets[id] = {
        ...asset,
        contracts: [...asset.contracts, newContract]
      };
    });
    
    setAssets(updatedAssets);
  };

  // Update a contract field for a specific asset
  const handleContractUpdate = (assetId, contractId, field, value, options = {}) => {
    console.log(`Updating contract field ${field} for asset ${assetId}, contract ${contractId} with value:`, value);
    
    // If it's a date field, pass the value directly
    if (field === 'startDate' || field === 'endDate') {
      setEditState(prev => ({
        ...prev,
        [assetId]: {
          ...prev[assetId],
          contracts: prev[assetId]?.contracts?.map(contract => {
            if (contract.id !== contractId) return contract;
            return {
              ...contract,
              [field]: value
            };
          }) || []
        }
      }));
      return;
    }
    
    // For non-date fields, use normal processing
    setEditState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        contracts: prev[assetId]?.contracts?.map(contract => {
          if (contract.id !== contractId) return contract;
          return {
            ...contract,
            [field]: handleNumericInput(value, options)
          };
        }) || []
      }
    }));
  };

  // Save all changes
  const saveChanges = () => {
    console.log("Saving changes to assets:", editState);
    setAssets(editState);
  };

  // Get all unique contract IDs across all assets
  const getAllContractIds = () => {
    const contractIds = new Set();
    
    Object.values(assets).forEach(asset => {
      asset.contracts.forEach(contract => {
        contractIds.add(contract.id);
      });
    });
    
    return Array.from(contractIds).sort((a, b) => {
      // Ensure numeric sorting
      return parseInt(a) - parseInt(b);
    });
  };

  // Handle tax rate change
  const handleTaxRateChange = (value) => {
    updateConstants('corporateTaxRate', parseFloat(value) || 0);
  };

  // Handle depreciation period change
  const handleDepreciationChange = (assetType, value) => {
    const updatedPeriods = {
      ...deprecationPeriods,
      [assetType]: parseInt(value) || 0
    };
    
    updateConstants('deprecationPeriods', updatedPeriods);
  };

  // Check if ops start date is valid based on construction start + duration
  const isOpsStartValid = (asset) => {
    if (!asset.constructionStartDate || !asset.constructionDuration || !asset.assetStartDate) return true;
    
    const consStart = new Date(asset.constructionStartDate);
    const opsStart = new Date(asset.assetStartDate);
    const duration = parseInt(asset.constructionDuration) || 0;
    
    // Calculate expected ops start date based on construction start + duration
    const expectedOpsStart = new Date(consStart);
    expectedOpsStart.setMonth(expectedOpsStart.getMonth() + duration);
    
    // Format to YYYY-MM-DD to compare just the dates
    const expectedDateStr = expectedOpsStart.toISOString().split('T')[0];
    const actualDateStr = opsStart.toISOString().split('T')[0];
    
    return expectedDateStr === actualDateStr;
  };

  // Check if contract start equals asset ops start
  const isContractStartValid = (asset, contract) => {
    if (!asset.assetStartDate || !contract.startDate) return null; // Null means no validation
    
    const assetStart = new Date(asset.assetStartDate).toISOString().split('T')[0];
    const contractStart = new Date(contract.startDate).toISOString().split('T')[0];
    
    return assetStart === contractStart;
  };

  // Calculate contract duration in years
  const calculateContractTenor = (contract) => {
    if (!contract.startDate || !contract.endDate) return null;
    
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const diffTime = Math.abs(end - start);
    const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    return diffYears;
  };

  // Check if assets have any contracts
  const hasContracts = Object.values(assets).some(asset => asset.contracts.length > 0);
  const allContractIds = getAllContractIds();

  const assetFields = [
    { label: 'Name', field: 'name', type: 'text' },
    { label: 'State', field: 'state', type: 'select', options: ['NSW', 'VIC', 'SA', 'QLD'] },
    { label: 'Type', field: 'type', type: 'select', options: ['solar', 'wind', 'storage'] },
    { label: 'Capacity (MW)', field: 'capacity', type: 'number' },
    { label: 'Cons Start', field: 'constructionStartDate', type: 'date' },
    { label: 'Cons Duration (months)', field: 'constructionDuration', type: 'number' },
    { label: 'Ops Start', field: 'assetStartDate', type: 'date' },
    { label: 'Asset Life (years)', field: 'assetLife', type: 'number' },
    { label: 'Volume Loss Adjustment (%)', field: 'volumeLossAdjustment', type: 'number' },
  ];

  const advancedFields = [
    { label: 'Annual Degradation (%)', field: 'annualDegradation', type: 'number' },
    { label: 'Q1 Capacity Factor (%)', field: 'qtrCapacityFactor_q1', type: 'number' },
    { label: 'Q2 Capacity Factor (%)', field: 'qtrCapacityFactor_q2', type: 'number' },
    { label: 'Q3 Capacity Factor (%)', field: 'qtrCapacityFactor_q3', type: 'number' },
    { label: 'Q4 Capacity Factor (%)', field: 'qtrCapacityFactor_q4', type: 'number' },
  ];

  const contractFields = [
    { label: 'Counterparty', field: 'counterparty', type: 'text' },
    { label: 'Type', field: 'type', type: 'select', options: ['bundled', 'green', 'Energy', 'fixed', 'cfd', 'tolling'] },
    { label: 'Start Date', field: 'startDate', type: 'date' },
    { label: 'End Date', field: 'endDate', type: 'date' },
    { label: 'Strike Price ($)', field: 'strikePrice', type: 'number' },
    { label: 'Energy Price ($)', field: 'EnergyPrice', type: 'number' },
    { label: 'Green Price ($)', field: 'greenPrice', type: 'number' },
    { label: 'Buyer\'s Percentage (%)', field: 'buyersPercentage', type: 'number' },
    { label: 'Indexation (%)', field: 'indexation', type: 'number' },
  ];

  const renderCellContent = (assetId, field, type, options = []) => {
    const asset = editState[assetId];
    if (!asset) return null;

    const value = asset[field.field];
    let defaultValue = null;
    let cellStyle = '';

    // Get default values for color coding
    if (field.field === 'constructionDuration') {
      const defaultDuration = getDefaultValue('performance', 'constructionDuration', asset.type);
      defaultValue = defaultDuration;
      cellStyle = getValueStyle(value, defaultValue);
    } else if (field.field === 'annualDegradation') {
      defaultValue = getDefaultValue('performance', 'annualDegradation', asset.type);
      cellStyle = getValueStyle(value, defaultValue);
    } else if (field.field.startsWith('qtrCapacityFactor_')) {
      const quarter = field.field.split('_')[1].toUpperCase();
      const defaultFactor = constants.capacityFactors_qtr?.[asset.type]?.[asset.state]?.[quarter];
      defaultValue = defaultFactor ? String(Math.round(defaultFactor * 100)) : '';
      cellStyle = getValueStyle(value, defaultValue);
    }

    switch (type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value)}
            className={`w-full h-8 ${cellStyle}`}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={formatNumericValue(value)}
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value, { min: 0 })}
            className={`w-full h-8 ${cellStyle}`}
          />
        );
      case 'date':
        // For Ops Start, add color validation
        const opsStartStyle = field.field === 'assetStartDate' 
          ? { 
              backgroundColor: isOpsStartValid(asset)
                ? 'rgba(0, 255, 0, 0.1)' // Light green
                : 'rgba(255, 0, 0, 0.1)'  // Light red
            }
          : {};
          
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => {
              // Use the enhanced date field handler
              handleFieldUpdate(assetId, field.field, e.target.value);
            }}
            className={`w-full h-8 ${cellStyle}`}
            style={opsStartStyle}
          />
        );
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(value) => handleFieldUpdate(assetId, field.field, value)}
          >
            <SelectTrigger className={`w-full h-8 ${cellStyle}`}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return value;
    }
  };

  const renderContractCellContent = (assetId, contractId, field, type, options = []) => {
    const asset = editState[assetId];
    if (!asset) return null;

    const contract = asset.contracts.find(c => c.id === contractId);
    if (!contract) return <span className="text-gray-300">-</span>;

    const value = contract[field.field];

    switch (type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleContractUpdate(assetId, contractId, field.field, e.target.value)}
            className="w-full h-8"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={formatNumericValue(value)}
            onChange={(e) => handleContractUpdate(assetId, contractId, field.field, e.target.value, { min: 0 })}
            className="w-full h-8"
          />
        );
      case 'date':
        const isValid = field.field === 'startDate' 
          ? isContractStartValid(asset, contract)
          : null;
          
        let cellStyle = {};
        
        if (field.field === 'startDate' && isValid !== null) {
          cellStyle = {
            backgroundColor: isValid 
              ? 'rgba(0, 255, 0, 0.1)'  // Light green
              : 'rgba(255, 165, 0, 0.1)' // Light orange
          };
        }
        
        return (
          <div>
            <Input
              type="date"
              value={value || ''}
              onChange={(e) => handleContractUpdate(assetId, contractId, field.field, e.target.value)}
              className="w-full h-8 mb-1"
              style={cellStyle}
            />
            {field.field === 'endDate' && (
              <div className="text-xs text-gray-500 mt-1">
                {calculateContractTenor(contract) ? `${calculateContractTenor(contract)} years` : ''}
              </div>
            )}
          </div>
        );
      case 'select':
        const contractType = asset.type === 'storage' ? 
          ['cfd', 'fixed', 'tolling'] : 
          ['bundled', 'green', 'Energy', 'fixed'];
            
        return (
          <Select
            value={value || ''}
            onValueChange={(value) => handleContractUpdate(assetId, contractId, field.field, value)}
          >
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.field === 'type' ? contractType : options).map(option => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return value;
    }
  };

  // Handle asset cost field update
  const handleAssetCostChange = (assetName, field, value) => {
    const asset = Object.values(assets).find(a => a.name === assetName);
    if (!asset) return;

    // Make sure the asset costs object exists for this asset
    if (!constants.assetCosts[assetName]) {
      updateConstants('assetCosts', {
        ...constants.assetCosts,
        [assetName]: {
          // Set default values based on asset type and capacity
          capex: getAssetCostDefault('capex', asset.type, asset.capacity),
          operatingCosts: getAssetCostDefault('operatingCosts', asset.type, asset.capacity),
          operatingCostEscalation: getAssetCostDefault('operatingCostEscalation', asset.type, asset.capacity),
          terminalValue: getAssetCostDefault('terminalValue', asset.type, asset.capacity),
          maxGearing: getAssetCostDefault('maxGearing', asset.type, asset.capacity) / 100,
          targetDSCRContract: getAssetCostDefault('targetDSCRContract', asset.type, asset.capacity),
          targetDSCRMerchant: getAssetCostDefault('targetDSCRMerchant', asset.type, asset.capacity),
          interestRate: getAssetCostDefault('interestRate', asset.type, asset.capacity) / 100,
          tenorYears: getAssetCostDefault('tenorYears', asset.type, asset.capacity)
        }
      });
    }

    // Now update the specific field
    const processedValue = field === 'maxGearing' || field === 'interestRate' 
      ? parseFloat(value) / 100 
      : parseFloat(value);
    
    updateConstants('assetCosts', {
      ...constants.assetCosts,
      [assetName]: {
        ...constants.assetCosts[assetName],
        [field]: isNaN(processedValue) ? '' : processedValue
      }
    });
  };

  return (
    <div className="w-full p-4 space-y-4">
      <Card className="w-full">
        <CardHeader className="p-4">
          <CardTitle>Asset Summary Inputs</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="w-full flex justify-start bg-gray-100">
                <TabsTrigger value="assets">General</TabsTrigger>
                <TabsTrigger value="advanced">Capacity</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="finance">Capex/Opex & Debt</TabsTrigger>
                <TabsTrigger value="taxation">Tax & Dep</TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={saveChanges} variant="default" className="ml-4">
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </div>
            
            <TabsContent value="assets">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    {Object.values(assets).map(asset => (
                      <TableHead key={`asset-${asset.id}`}>{asset.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetFields.map(field => (
                    <TableRow key={field.field}>
                      <TableCell className="font-medium">
                        {field.label}
                        {(field.field === 'constructionStartDate' || field.field === 'assetStartDate') && (
                          <div className="text-xs text-gray-500 mt-1">
                            (rounds to 1st of month)
                          </div>
                        )}
                      </TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`${asset.id}-${field.field}`}>
                          {renderCellContent(asset.id, field, field.type, field.options)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="advanced">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    {Object.values(assets).map(asset => (
                      <TableHead key={`asset-${asset.id}`}>{asset.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advancedFields.map(field => (
                    <TableRow key={field.field}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`${asset.id}-${field.field}`}>
                          {renderCellContent(asset.id, field, field.type, field.options)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            
            <TabsContent value="finance">
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      {Object.values(assets).map(asset => (
                        <TableHead key={`asset-${asset.id}`}>{asset.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Capex ($M)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.capex;
                        const defaultValue = getAssetCostDefault('capex', asset.type, asset.capacity);
                        return (
                          <TableCell key={`capex-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'capex', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Opex ($M/pa)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.operatingCosts;
                        const defaultValue = getAssetCostDefault('operatingCosts', asset.type, asset.capacity);
                        return (
                          <TableCell key={`opex-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Opex Escalation (%)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.operatingCostEscalation;
                        const defaultValue = getAssetCostDefault('operatingCostEscalation', asset.type, asset.capacity);
                        return (
                          <TableCell key={`opexesc-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Terminal Value ($M)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.terminalValue;
                        const defaultValue = getAssetCostDefault('terminalValue', asset.type, asset.capacity);
                        return (
                          <TableCell key={`terminal-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'terminalValue', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
                
                <h3 className="text-lg font-medium mt-6 mb-3">Project Finance Parameters</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      {Object.values(assets).map(asset => (
                        <TableHead key={`asset-${asset.id}`}>{asset.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Max Gearing (%)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.maxGearing;
                        const defaultValue = getAssetCostDefault('maxGearing', asset.type, asset.capacity);
                        return (
                          <TableCell key={`gearing-${asset.id}`}>
                            <Input
                              type="number"
                              value={(currentValue * 100) ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'maxGearing', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Target DSCR Contract (x)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.targetDSCRContract;
                        const defaultValue = getAssetCostDefault('targetDSCRContract', asset.type, asset.capacity);
                        return (
                          <TableCell key={`dscrcontract-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRContract', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Target DSCR Merchant (x)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.targetDSCRMerchant;
                        const defaultValue = getAssetCostDefault('targetDSCRMerchant', asset.type, asset.capacity);
                        return (
                          <TableCell key={`dscrmerchant-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Interest Rate (%)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.interestRate;
                        const defaultValue = getAssetCostDefault('interestRate', asset.type, asset.capacity);
                        return (
                          <TableCell key={`interest-${asset.id}`}>
                            <Input
                              type="number"
                              value={(currentValue * 100) ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'interestRate', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tenor (Years)</TableCell>
                      {Object.values(assets).map(asset => {
                        const currentValue = assetCosts[asset.name]?.tenorYears;
                        const defaultValue = getAssetCostDefault('tenorYears', asset.type, asset.capacity);
                        return (
                          <TableCell key={`tenor-${asset.id}`}>
                            <Input
                              type="number"
                              value={currentValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'tenorYears', e.target.value)}
                              className={`w-32 h-8 ${getValueStyle(currentValue, defaultValue)}`}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Tax & Depreciation Tab - Styled like Portfolio Inputs */}
            <TabsContent value="taxation">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Corporate Tax Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tax Rate (%)</label>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={corporateTaxRate}
                            onChange={(e) => handleTaxRateChange(e.target.value)}
                            className={`max-w-xs ${getValueStyle(corporateTaxRate, DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}`}
                          />
                          <p className="text-sm text-gray-500">
                            Corporate tax rate applied to taxable income
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Asset Depreciation Periods</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Solar (Years)</label>
                            <Input 
                              type="number"
                              min="1"
                              max="40"
                              value={deprecationPeriods.solar}
                              onChange={(e) => handleDepreciationChange('solar', e.target.value)}
                              className={`max-w-xs ${getValueStyle(deprecationPeriods.solar, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar)}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Wind (Years)</label>
                            <Input 
                              type="number"
                              min="1"
                              max="40"
                              value={deprecationPeriods.wind}
                              onChange={(e) => handleDepreciationChange('wind', e.target.value)}
                              className={`max-w-xs ${getValueStyle(deprecationPeriods.wind, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind)}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Storage (Years)</label>
                            <Input 
                              type="number"
                              min="1"
                              max="40"
                              value={deprecationPeriods.storage}
                              onChange={(e) => handleDepreciationChange('storage', e.target.value)}
                              className={`max-w-xs ${getValueStyle(deprecationPeriods.storage, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage)}`}
                            />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Asset depreciation periods for tax and accounting purposes
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetSummaryInputs;