// components/AssetForm.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssetForm } from '@/hooks/useAssetForm';
import { useAssetTemplates } from '@/hooks/useAssetTemplates';
import { useAssetManagement } from '@/hooks/useAssetManagement';
import AssetFormContract from './AssetFormContract';
import { formatNumericValue } from '@/utils/assetUtils';

const AssetForm = ({ assetId }) => {
  const { assets, removeAsset, addContract, removeContract, updateContract } = useAssetManagement();
  const { getSortedTemplates } = useAssetTemplates();
  const asset = assets[assetId];
  
  const {
    assetCosts,
    year1Volume,
    selectedTemplate,
    outOfSync,
    handleAssetFieldUpdate,
    handleAssetDateUpdate,
    handleAssetConstructionDurationUpdate,
    handleAssetCostUpdate,
    handleTemplateSelection,
    isOpsStartValid,
    getValueStyle,
    getFieldDefault,
    getQuarterlyDefaults,
    getAssetCostDefault,
  } = useAssetForm(asset);

  if (!asset) {
    return <div>Asset not found</div>;
  }

  const sortedTemplates = getSortedTemplates();
  const quarterlyDefaults = getQuarterlyDefaults();

  const handleRemove = () => {
    removeAsset(assetId);
  };

  const handleAddContract = () => {
    addContract(assetId);
  };

  const handleRemoveContract = (contractId) => {
    removeContract(assetId, contractId);
  };

  const handleUpdateContract = (contractId, field, value) => {
    updateContract(assetId, contractId, field, value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleRemove} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Template Selection */}
            {!selectedTemplate && asset.name === `Default Asset ${asset.id}` && (
              <div className="col-span-2">
                <label className="text-sm font-medium">Template</label>
                <Select onValueChange={handleTemplateSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing renewable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sortedTemplates.map(renewable => (
                        <SelectItem key={renewable.id} value={renewable.id}>
                          {renewable.name} ({renewable.capacity} MW, {renewable.type})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Basic Details */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={asset.name || ''}
                onChange={(e) => handleAssetFieldUpdate('name', e.target.value)}
                className={outOfSync.name ? "text-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select 
                value={asset.state || ''} 
                onValueChange={(value) => handleAssetFieldUpdate('state', value)}
              >
                <SelectTrigger className={outOfSync.state ? "text-red-500" : ""}>
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {['NSW', 'VIC', 'SA', 'QLD'].map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={asset.type || ''} 
                onValueChange={(value) => handleAssetFieldUpdate('type', value)}
              >
                <SelectTrigger className={outOfSync.type ? "text-red-500" : ""}>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'wind', label: 'Wind' },
                    { value: 'solar', label: 'Solar' },
                    { value: 'storage', label: 'Storage' }
                  ].map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Capacity Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capacity (MW)</label>
                <Input
                  type="number"
                  value={formatNumericValue(asset.capacity)}
                  onChange={(e) => handleAssetFieldUpdate('capacity', e.target.value, { round: true })}
                  className={outOfSync.capacity ? "text-red-500" : ""}
                />
              </div>

              {asset.type === 'storage' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Volume (MWh)</label>
                  <Input
                    type="number"
                    value={formatNumericValue(asset.volume)}
                    onChange={(e) => handleAssetFieldUpdate('volume', e.target.value)}
                    placeholder="Volume (MWh)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Storage capacity in MWh</p>
                </div>
              )}
            </div>

            {/* Enhanced Dates and Construction Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cons Start</label>
              <Input
                type="date"
                value={asset.constructionStartDate || ''}
                onChange={(e) => handleAssetDateUpdate('constructionStartDate', e.target.value)}
                className={outOfSync.constructionStartDate ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">When construction begins (rounded to 1st of month)</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cons Duration (months)</label>
              <Input
                type="number"
                min="1"
                value={formatNumericValue(asset.constructionDuration)}
                onChange={(e) => handleAssetConstructionDurationUpdate(e.target.value)}
                className={`${outOfSync.constructionDuration ? "text-red-500" : ""} ${getValueStyle(asset.constructionDuration, getFieldDefault('constructionDuration'))}`}
              />
              <p className="text-xs text-gray-500">Construction period length</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ops Start</label>
              <Input
                type="date"
                value={asset.assetStartDate || ''}
                onChange={(e) => handleAssetDateUpdate('assetStartDate', e.target.value)}
                className={outOfSync.assetStartDate ? "text-red-500" : ""}
                style={{
                  backgroundColor: isOpsStartValid()
                    ? 'rgba(0, 255, 0, 0.1)' // Light green
                    : 'rgba(255, 0, 0, 0.1)'  // Light red
                }}
              />
              <p className="text-xs text-gray-500">When operations begin (rounded to 1st of month)</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Life (years)</label>
              <Input
                type="number"
                min="0"
                value={formatNumericValue(asset.assetLife)}
                onChange={(e) => handleAssetFieldUpdate('assetLife', e.target.value, { round: true })}
              />
            </div>

            {/* Performance Factors */}
            {asset.type !== 'storage' && (
              <div className="col-span-2">
                <h4 className="text-sm font-medium mb-2">Quarterly Capacity Factors (%)</h4>
                <div className="grid grid-cols-4 gap-4">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
                    const currentValue = asset[`qtrCapacityFactor_${quarter.toLowerCase()}`];
                    const defaultValue = quarterlyDefaults[quarter.toLowerCase()];
                    
                    return (
                      <div key={quarter}>
                        <label className="text-xs text-gray-500">{quarter}</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={currentValue || ''}
                          onChange={(e) => handleAssetFieldUpdate(
                            `qtrCapacityFactor_${quarter.toLowerCase()}`, 
                            e.target.value,
                            { min: 0, max: 100, round: true, asString: true }
                          )}
                          className={getValueStyle(currentValue, defaultValue)}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">Defaults from global settings based on State and Type</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Volume Loss Adjustment (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formatNumericValue(asset.volumeLossAdjustment)}
                onChange={(e) => handleAssetFieldUpdate('volumeLossAdjustment', e.target.value, { min: 0, max: 100 })}
                className={outOfSync.volumeLossAdjustment ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">Include MLF, availability and constraints</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Annual Degradation (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formatNumericValue(asset.annualDegradation)}
                onChange={(e) => handleAssetFieldUpdate('annualDegradation', e.target.value, { min: 0, max: 100 })}
                className={getValueStyle(asset.annualDegradation, getFieldDefault('annualDegradation'))}
              />
              <p className="text-xs text-gray-500">Annual reduction in output (e.g. 0.4% per year)</p>
            </div>

            <div className="col-span-2 bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium mb-2">Year 1 Volume</h4>
              {year1Volume ? (
                <>
                  <div className="text-lg font-semibold">
                    {year1Volume.toFixed(0).toLocaleString()} GWh
                  </div>
                  <p className="text-xs text-gray-500">
                    {asset.type === 'storage' ? (
                      `Based on ${asset.volume} MWh × 365 days × ${asset.volumeLossAdjustment || 0}% volume loss adjustment`
                    ) : (
                      `Based on ${asset.capacity} MW × ${asset.capacityFactor}% CF × 8,760 hours × ${asset.volumeLossAdjustment || 0}% volume loss adjustment`
                    )}
                  </p>
                </>
              ) : (
                <div className="text-lg font-semibold">Not calculated</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Costs & Terminal Value Section */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Costs & Terminal Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Capex ($M)</label>
              <Input
                type="number"
                value={assetCosts.capex ?? ''}
                onChange={(e) => handleAssetCostUpdate('capex', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.capex, getAssetCostDefault('capex', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Total capital expenditure</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opex ($M/pa)</label>
              <Input
                type="number"
                value={assetCosts.operatingCosts ?? ''}
                onChange={(e) => handleAssetCostUpdate('operatingCosts', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.operatingCosts, getAssetCostDefault('operatingCosts', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Annual operating costs</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opex Escalation (%)</label>
              <Input
                type="number"
                value={assetCosts.operatingCostEscalation ?? ''}
                onChange={(e) => handleAssetCostUpdate('operatingCostEscalation', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.operatingCostEscalation, getAssetCostDefault('operatingCostEscalation', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Annual increase in costs</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Terminal Value ($M)</label>
              <Input
                type="number"
                value={assetCosts.terminalValue ?? ''}
                onChange={(e) => handleAssetCostUpdate('terminalValue', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.terminalValue, getAssetCostDefault('terminalValue', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">End of life value</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Debt Parameters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Financing Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Gearing (%)</label>
              <Input
                type="number"
                value={(assetCosts.maxGearing * 100) ?? ''}
                onChange={(e) => handleAssetCostUpdate('maxGearing', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.maxGearing, getAssetCostDefault('maxGearing', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Maximum debt-to-capital ratio</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target DSCR Contract (x)</label>
              <Input
                type="number"
                value={assetCosts.targetDSCRContract ?? ''}
                onChange={(e) => handleAssetCostUpdate('targetDSCRContract', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.targetDSCRContract, getAssetCostDefault('targetDSCRContract', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">For contracted revenue</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target DSCR Merchant (x)</label>
              <Input
                type="number"
                value={assetCosts.targetDSCRMerchant ?? ''}
                onChange={(e) => handleAssetCostUpdate('targetDSCRMerchant', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.targetDSCRMerchant, getAssetCostDefault('targetDSCRMerchant', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">For merchant revenue</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Rate (%)</label>
              <Input
                type="number"
                value={(assetCosts.interestRate * 100) ?? ''}
                onChange={(e) => handleAssetCostUpdate('interestRate', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.interestRate, getAssetCostDefault('interestRate', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Annual interest rate</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenor (Years)</label>
              <Input
                type="number"
                value={assetCosts.tenorYears ?? ''}
                onChange={(e) => handleAssetCostUpdate('tenorYears', e.target.value)}
                className={`w-full ${getValueStyle(assetCosts.tenorYears, getAssetCostDefault('tenorYears', asset.type, asset.capacity))}`}
              />
              <p className="text-xs text-gray-500">Loan term length</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contracts</CardTitle>
          <Button onClick={handleAddContract}>
            <Plus className="h-4 w-4 mr-2" />Add Contract
          </Button>
        </CardHeader>
        <CardContent>
          {asset.contracts.map((contract) => (
            <AssetFormContract
              key={contract.id}
              contract={contract}
              updateContract={(field, value) => handleUpdateContract(contract.id, field, value)}
              removeContract={() => handleRemoveContract(contract.id)}
              isStorage={asset.type === 'storage'}
              capacity={asset.capacity}
              capacityFactor={asset.capacityFactor}
              volumeLossAdjustment={asset.volumeLossAdjustment || 95}
              volume={asset.volume}
            />
          ))}
          {asset.contracts.length === 0 && (
            <div className="text-center py-4 text-gray-500">No contracts added yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetForm;