import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, DollarSign } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  formatNumericValue, 
  handleNumericInput,
  createNewContract
} from './AssetUtils';

const AssetSummaryEditor = () => {
  const { assets, setAssets, constants, updateConstants } = usePortfolio();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editState, setEditState] = useState({});
  const [activeTab, setActiveTab] = useState("assets");
  const assetCosts = constants.assetCosts || {};

  // Initialize edit state with asset values
  React.useEffect(() => {
    const initialState = {};
    Object.values(assets).forEach(asset => {
      initialState[asset.id] = { ...asset };
    });
    setEditState(initialState);
    
    // Debug logging
    console.log("Assets:", assets);
    console.log("Asset costs:", constants.assetCosts);
    Object.values(assets).forEach(asset => {
      console.log(`Asset ${asset.name} costs:`, constants.assetCosts[asset.name]);
    });
  }, [assets, constants.assetCosts]);

  // Update a field for a specific asset
  const handleFieldUpdate = (assetId, field, value, options = {}) => {
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
    setAssets(editState);
  };

  // Add a new empty asset
  const addNewAsset = () => {
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
    
    setAssets(prev => ({
      ...prev,
      [newId]: newAsset
    }));
    
    setEditState(prev => ({
      ...prev,
      [newId]: newAsset
    }));
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

  // Check if assets have any contracts
  const hasContracts = Object.values(assets).some(asset => asset.contracts.length > 0);
  const allContractIds = getAllContractIds();

  const assetFields = [
    { label: 'Name', field: 'name', type: 'text' },
    { label: 'State', field: 'state', type: 'select', options: ['NSW', 'VIC', 'SA', 'QLD'] },
    { label: 'Type', field: 'type', type: 'select', options: ['solar', 'wind', 'storage'] },
    { label: 'Capacity (MW)', field: 'capacity', type: 'number' },
    { label: 'Start Date', field: 'assetStartDate', type: 'date' },
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
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value)}
            className="w-full h-8"
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
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleContractUpdate(assetId, contractId, field.field, e.target.value)}
            className="w-full h-8"
          />
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
      console.log(`Creating new asset cost entry for ${assetName}`);
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
    
    console.log(`Updated ${field} for ${assetName} to ${processedValue}`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asset Summary Editor</CardTitle>
        <div className="flex space-x-2">
          <Button size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </Button>
          <Button size="sm" onClick={addNewAsset}>
            <Plus className="h-4 w-4 mr-2" />Add Asset
          </Button>
          <Button size="sm" onClick={saveChanges} variant="default">
            <Save className="h-4 w-4 mr-2" />Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="assets" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-100">
              Assets & Contracts
            </TabsTrigger>
            <TabsTrigger value="capex" className="data-[state=active]:bg-green-500 data-[state=active]:text-white hover:bg-green-100">
              Capex & Opex
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="overflow-x-auto">
            <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Asset Properties</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Field</TableHead>
                    {Object.values(assets).map(asset => (
                      <TableHead key={asset.id}>{asset.name}</TableHead>
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
                  
                  {showAdvanced && advancedFields.map(field => (
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
            </div>
          </div>

          {hasContracts && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Contracts</h3>
                <Button size="sm" onClick={addContractToAll}>
                  <Plus className="h-4 w-4 mr-2" />Add Contract to All Assets
                </Button>
              </div>
              
              {allContractIds.map(contractId => (
                <div key={contractId} className="mb-4">
                  <h4 className="text-md font-medium mb-2">Contract {contractId}</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-36">Field</TableHead>
                          {Object.values(assets).map(asset => (
                            <TableHead key={asset.id}>{asset.name}</TableHead>
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
                </div>
              ))}
            </div>
          )}
          
          {!hasContracts && (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">No contracts have been added yet</p>
              <Button onClick={addContractToAll}>
                <Plus className="h-4 w-4 mr-2" />Add Contract to All Assets
              </Button>
            </div>
          )}
        </div>
          </TabsContent>
          
          <TabsContent value="capex" className="overflow-x-auto">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Financial Parameters</CardTitle>
                  <CardDescription>Define capital and operating costs for valuation and financial modeling</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Asset</TableHead>
                        <TableHead>Capex ($M)</TableHead>
                        <TableHead>Opex ($M/pa)</TableHead>
                        <TableHead>Opex Escalation (%)</TableHead>
                        <TableHead>Terminal Value ($M)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(assets).map(asset => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.capex ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'capex', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.operatingCosts ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.operatingCostEscalation ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.terminalValue ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'terminalValue', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Project Finance Parameters</CardTitle>
                  <CardDescription>Debt parameters for project finance modeling</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Asset</TableHead>
                        <TableHead>Max Gearing (%)</TableHead>
                        <TableHead>Target DSCR Contract (x)</TableHead>
                        <TableHead>Target DSCR Merchant (x)</TableHead>
                        <TableHead>Interest Rate (%)</TableHead>
                        <TableHead>Tenor (Years)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(assets).map(asset => (
                        <TableRow key={`finance-${asset.id}`}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={(assetCosts[asset.name]?.maxGearing * 100) ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'maxGearing', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.targetDSCRContract ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRContract', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.targetDSCRMerchant ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={(assetCosts[asset.name]?.interestRate * 100) ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'interestRate', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={assetCosts[asset.name]?.tenorYears ?? ''}
                              onChange={(e) => handleAssetCostChange(asset.name, 'tenorYears', e.target.value)}
                              className="w-32 h-8"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Discount Rates</CardTitle>
                  <CardDescription>Global discount rate settings for revenue streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium">Contracted Revenue (%)</label>
                      <Input
                        type="number"
                        value={(constants.discountRates?.contract * 100) ?? ''}
                        onChange={(e) => {
                          updateConstants('discountRates', {
                            ...constants.discountRates,
                            contract: parseFloat(e.target.value) / 100
                          });
                        }}
                        className="w-32 h-8 mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Discount rate applied to contracted revenue streams
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Merchant Revenue (%)</label>
                      <Input
                        type="number"
                        value={(constants.discountRates?.merchant * 100) ?? ''}
                        onChange={(e) => {
                          updateConstants('discountRates', {
                            ...constants.discountRates,
                            merchant: parseFloat(e.target.value) / 100
                          });
                        }}
                        className="w-32 h-8 mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Discount rate applied to merchant revenue streams
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AssetSummaryEditor;