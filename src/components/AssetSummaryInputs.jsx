// components/AssetSummaryInputs.jsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save } from 'lucide-react';
import { useAssetSummary } from '@/hooks/useAssetSummary';
import { getDefaultValue } from '@/lib/default_constants';

const AssetSummaryInputs = () => {
  const {
    assets,
    editState,
    constants,
    corporateTaxRate,
    deprecationPeriods,
    getAssetFields,
    getAdvancedFields,
    getContractFields,
    handleFieldUpdate,
    handleContractUpdate,
    handleAssetCostChange,
    handleTaxRateChange,
    handleDepreciationChange,
    addContractToAll,
    getAllContractIds,
    saveChanges,
    isOpsStartValid,
    isContractStartValid,
    calculateContractTenor,
    getValueStyle,
    getAssetCostDefault,
    formatNumericValue,
  } = useAssetSummary();

  const [activeTab, setActiveTab] = useState("assets");
  const assetCosts = constants.assetCosts || {};

  // Check if assets have any contracts
  const hasContracts = Object.values(assets).some(asset => asset.contracts.length > 0);
  const allContractIds = getAllContractIds();

  const assetFields = getAssetFields();
  const advancedFields = getAdvancedFields();
  const contractFields = getContractFields();

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
            onChange={(e) => handleFieldUpdate(assetId, field.field, e.target.value)}
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
            
            <TabsContent value="contracts">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Contract Summary</h3>
                  <Button onClick={addContractToAll} size="sm">
                    Add Contract to All Assets
                  </Button>
                </div>
                
                {hasContracts ? (
                  <div className="space-y-6">
                    {allContractIds.map(contractId => (
                      <div key={contractId}>
                        <h4 className="text-md font-medium mb-3">Contract {contractId}</h4>
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
                                  <TableCell key={`${asset.id}-${field.field}`}>
                                    {renderContractCellContent(asset.id, contractId, field, field.type, field.options)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No contracts have been added yet. Add contracts to individual assets or use "Add Contract to All Assets" button.
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
                            className="max-w-xs"
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