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

const AssetSummaryInputs = () => {
  const { assets, setAssets, constants, updateConstants } = usePortfolio();
  const [editState, setEditState] = useState({});
  const [activeTab, setActiveTab] = useState("assets");
  const assetCosts = constants.assetCosts || {};

  // Ensure deprecation periods and tax rate exist with defaults
  const corporateTaxRate = constants.corporateTaxRate !== undefined ? constants.corporateTaxRate : 0;
  const deprecationPeriods = constants.deprecationPeriods || {
    solar: 30,
    wind: 30,
    storage: 20
  };

  // Initialize tax/depreciation values if they don't exist
  useEffect(() => {
    if (constants.corporateTaxRate === undefined) {
      updateConstants('corporateTaxRate', 0);
    }
    
    if (!constants.deprecationPeriods) {
      updateConstants('deprecationPeriods', {
        solar: 30,
        wind: 30,
        storage: 20
      });
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

  // Update a field for a specific asset
  const handleFieldUpdate = (assetId, field, value, options = {}) => {
    console.log(`Updating field ${field} for asset ${assetId} with value:`, value);
    
    // If it's a date field, pass directly without additional processing
    if (field === 'constructionStartDate' || field === 'assetStartDate') {
      setEditState(prev => ({
        ...prev,
        [assetId]: {
          ...prev[assetId],
          [field]: value
        }
      }));
      return;
    }
    
    // For non-date fields, use the normal processing
    setEditState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: handleNumericInput(value, options)
      }
    }));
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

    switch (type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value)}
            className="w-full h-8"
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={formatNumericValue(value)}
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value, { min: 0 })}
            className="w-full h-8"
          />
        );
      case 'date':
        // For Ops Start, add color validation
        const cellStyle = field.field === 'assetStartDate' 
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
              // Simply pass the value from the input without additional formatting
              handleFieldUpdate(assetId, field.field, e.target.value);
            }}
            className="w-full h-8"
            style={cellStyle}
          />
        );
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(value) => handleFieldUpdate(assetId, field.field, value)}
          >
            <SelectTrigger className="w-full h-8">
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
    // Make sure the asset costs object exists for this asset
    if (!constants.assetCosts[assetName]) {
      updateConstants('assetCosts', {
        ...constants.assetCosts,
        [assetName]: {
          // Set some default values
          capex: 0,
          operatingCosts: 0,
          operatingCostEscalation: 2.5,
          terminalValue: 0,
          maxGearing: 0.7,
          targetDSCRContract: 1.35,
          targetDSCRMerchant: 2.0,
          interestRate: 0.06,
          tenorYears: 15
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
            
            <TabsContent value="contracts">
              <div className="space-y-4">
                {hasContracts ? (
                  <>
                    {allContractIds.map(contractId => (
                      <div key={contractId} className="mb-6">
                        <div className="flex justify-between mb-2">
                          <h4 className="text-md font-medium">Contract {contractId}</h4>
                        </div>
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
                            {contractFields.map(field => (
                              <TableRow key={field.field}>
                                <TableCell className="font-medium">{field.label}</TableCell>
                                {Object.values(assets).map(asset => (
                                  <TableCell key={`${asset.id}-${contractId}-${field.field}`}>
                                    {renderContractCellContent(asset.id, contractId, field, field.type, field.options)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                    <div className="flex justify-center mt-4">
                      <Button onClick={addContractToAll}>
                        Add Contract to All Assets
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-2">No contracts have been added yet</p>
                    <Button onClick={addContractToAll}>
                      Add Contract to All Assets
                    </Button>
                  </div>
                )}
              </div>
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
                      {Object.values(assets).map(asset => (
                        <TableCell key={`capex-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.capex ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'capex', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Opex ($M/pa)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`opex-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.operatingCosts ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Opex Escalation (%)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`opexesc-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.operatingCostEscalation ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Terminal Value ($M)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`terminal-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.terminalValue ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'terminalValue', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
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
                      {Object.values(assets).map(asset => (
                        <TableCell key={`gearing-${asset.id}`}>
                          <Input
                            type="number"
                            value={(assetCosts[asset.name]?.maxGearing * 100) ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'maxGearing', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Target DSCR Contract (x)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`dscrcontract-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.targetDSCRContract ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRContract', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Target DSCR Merchant (x)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`dscrmerchant-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.targetDSCRMerchant ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Interest Rate (%)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`interest-${asset.id}`}>
                          <Input
                            type="number"
                            value={(assetCosts[asset.name]?.interestRate * 100) ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'interestRate', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Tenor (Years)</TableCell>
                      {Object.values(assets).map(asset => (
                        <TableCell key={`tenor-${asset.id}`}>
                          <Input
                            type="number"
                            value={assetCosts[asset.name]?.tenorYears ?? ''}
                            onChange={(e) => handleAssetCostChange(asset.name, 'tenorYears', e.target.value)}
                            className="w-32 h-8"
                          />
                        </TableCell>
                      ))}
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
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Solar (Years)</label>
                            <Input 
                              type="number"
                              min="1"
                              max="40"
                              value={deprecationPeriods.solar}
                              onChange={(e) => handleDepreciationChange('solar', e.target.value)}
                              className="max-w-xs"
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
                              className="max-w-xs"
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
                              className="max-w-xs"
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