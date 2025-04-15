import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetFormContract from './AssetFormContract';
import Papa from 'papaparse';
import { 
  calculateYear1Volume, 
  formatNumericValue, 
  handleNumericInput,
  getDefaultCapacityFactors,
  processAssetData,
  createNewContract,
  updateBundledPrices
} from './AssetUtils';

const AssetForm = ({ asset, onUpdateAsset, onUpdateContracts, onRemoveAsset }) => {
  const { constants, updateConstants } = usePortfolio();
  const [renewablesData, setRenewablesData] = useState([]);
  const [selectedRenewable, setSelectedRenewable] = useState(null);
  const [outOfSync, setOutOfSync] = useState({
    name: false,
    state: false,
    capacity: false,
    type: false,
    volumeLossAdjustment: false,
    constructionStartDate: false,
    constructionDuration: false,
    assetStartDate: false
  });
  const [previousName, setPreviousName] = useState(asset.name);

  const year1Volume = calculateYear1Volume(asset);
  const assetCosts = constants.assetCosts ? constants.assetCosts[asset.name] || {} : {};

  // Load renewables data
  useEffect(() => {
    const loadRenewablesData = async () => {
      try {
        const response = await fetch('/renewables_registration_data.csv');
        const csvText = await response.text();
        const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        setRenewablesData(processAssetData(result.data));
      } catch (error) {
        console.error('Error loading renewables data:', error);
      }
    };
    loadRenewablesData();
  }, []);

  // Update capacity factors when state/type changes
  useEffect(() => {
    const factors = getDefaultCapacityFactors(asset, constants);
    Object.entries(factors).forEach(([key, value]) => {
      if (key === 'annual') {
        onUpdateAsset('capacityFactor', value);
      } else {
        onUpdateAsset(`qtrCapacityFactor_${key}`, value);
      }
    });
  }, [asset.state, asset.type]);

  // Effect to set default degradation and initialize asset costs if needed
  useEffect(() => {
    // Set default degradation
    if (asset.type && !asset.annualDegradation) {
      const defaultDegradation = constants.annualDegradation[asset.type];
      if (defaultDegradation !== undefined) {
        onUpdateAsset('annualDegradation', defaultDegradation);
      }
    }
    
    // Set default construction duration if not set
    if (!asset.constructionDuration) {
      const defaultDuration = {
        solar: 12,
        wind: 18,
        storage: 12
      }[asset.type] || 12;
      onUpdateAsset('constructionDuration', defaultDuration);
    }
    
    // Initialize asset costs if they don't exist
    if (!constants.assetCosts[asset.name]) {
      // Set default cost values based on asset type and capacity
      const defaultCapexRate = {
        solar: 1.2,  // $M per MW
        wind: 2.5,   // $M per MW
        storage: 1.6, // $M per MW
        default: 2.0  // $M per MW
      }[asset.type] || 2.0;
      
      const defaultOpexRate = {
        solar: 0.014,    // $M per MW
        wind: 0.040,     // $M per MW
        storage: 0.015,  // $M per MW
        default: 0.030   // $M per MW
      }[asset.type] || 0.030;
      
      const defaultTerminalValueRate = {
        solar: 0.15,    // $M per MW
        wind: 0.20,     // $M per MW
        storage: 0.10,  // $M per MW
        default: 0.15   // $M per MW
      }[asset.type] || 0.15;
      
      const capacity = parseFloat(asset.capacity) || 100;
      
      const newAssetCosts = {
        ...constants.assetCosts,
        [asset.name]: {
          capex: defaultCapexRate * capacity,
          operatingCosts: defaultOpexRate * capacity,
          operatingCostEscalation: 2.5,
          terminalValue: defaultTerminalValueRate * capacity,
          // Add project finance parameters
          maxGearing: 0.70,
          targetDSCRContract: 1.35,
          targetDSCRMerchant: 2.00,
          interestRate: 0.06,
          tenorYears: 15
        }
      };
      
      updateConstants('assetCosts', newAssetCosts);
    }
  }, [asset.type, asset.name, asset.capacity, constants, onUpdateAsset, updateConstants]);

  // Handle asset name updates by updating the asset costs object key as well
  useEffect(() => {
    if (previousName !== asset.name && previousName !== "") {
      // Asset was renamed
      const newAssetCosts = { ...constants.assetCosts };
      
      // Only transfer values if the old name had cost data
      if (newAssetCosts[previousName]) {
        // Copy the cost values from the old name to the new name
        newAssetCosts[asset.name] = { ...newAssetCosts[previousName] };
        
        // Delete the old name entry
        delete newAssetCosts[previousName];
        
        // Update the constants with the new structure
        updateConstants('assetCosts', newAssetCosts);
      }
      
      // Update the previous name for future comparisons
      setPreviousName(asset.name);
    }
  }, [asset.name, previousName, constants.assetCosts, updateConstants]);

  // Check for out of sync values with template
  useEffect(() => {
    if (selectedRenewable) {
      setOutOfSync({
        name: asset.name !== selectedRenewable.name,
        state: asset.state !== selectedRenewable.state,
        capacity: asset.capacity !== selectedRenewable.capacity,
        type: asset.type !== selectedRenewable.type,
        volumeLossAdjustment: selectedRenewable.mlf && 
          String(asset.volumeLossAdjustment) !== String(selectedRenewable.mlf.toFixed(2)),
        assetStartDate: selectedRenewable.startDate && 
          asset.assetStartDate !== selectedRenewable.startDate,
      });
    } else {
      // Clear out of sync state for new assets
      setOutOfSync({
        name: false,
        state: false,
        capacity: false,
        type: false,
        volumeLossAdjustment: false,
        constructionStartDate: false,
        constructionDuration: false,
        assetStartDate: false
      });
    }
  }, [asset, selectedRenewable]);

  const handleFieldUpdate = (field, value, options = {}) => {
    const processedValue = handleNumericInput(value, options);
    
    // Save the previous name for reference before any update
    if (field === 'name') {
      setPreviousName(asset.name);
    }
    
    onUpdateAsset(field, processedValue);
  };

  const handleRenewableSelection = (selectedRenewableId) => {
    const selected = renewablesData.find(r => r.id === selectedRenewableId);
    if (selected) {
      setSelectedRenewable(selected);
      
      // Save the previous name before updating
      setPreviousName(asset.name);
      
      onUpdateAsset('name', selected.name);
      onUpdateAsset('state', selected.state);
      onUpdateAsset('capacity', selected.capacity);
      onUpdateAsset('type', selected.type);
      if (selected.mlf) {
        onUpdateAsset('volumeLossAdjustment', selected.mlf.toFixed(2));
      }
      if (selected.startDate) {
        onUpdateAsset('assetStartDate', selected.startDate);
      }
    }
  };

  // Handle cost field updates
  const handleCostUpdate = (field, value) => {
    const newAssetCosts = {
      ...constants.assetCosts,
      [asset.name]: {
        ...assetCosts,
        [field]: value === '' ? '' : parseFloat(value)
      }
    };
    updateConstants('assetCosts', newAssetCosts);
  };

  const handleContractUpdate = (id, field, value) => {
    // Ensure we're working with the current contracts array
    const updatedContracts = asset.contracts.map(contract => {
      if (contract.id !== id) return contract;
      
      // Handle the update and get the new contract state
      const updatedContract = updateBundledPrices({...contract}, field, value);
      
      // Ensure numeric fields are properly handled
      if (['strikePrice', 'EnergyPrice', 'greenPrice', 'buyersPercentage', 'indexation'].includes(field)) {
        // If the value is empty string, keep it as empty string to allow typing
        updatedContract[field] = value === '' ? '' : value;
      } else {
        updatedContract[field] = value;
      }
      
      return updatedContract;
    });

    onUpdateContracts(updatedContracts);
  };

  const addContract = () => {
    const newContract = createNewContract(asset.contracts, asset.assetStartDate);
    onUpdateContracts([...asset.contracts, newContract]);
  };

  const removeContract = (contractId) => {
    onUpdateContracts(asset.contracts.filter(c => c.id !== contractId));
  };
  
  // Calculate default construction start date based on operations start date and construction duration
  const calculateDefaultConstructionStart = () => {
    if (!asset.assetStartDate || !asset.constructionDuration) return '';
    
    const opsDate = new Date(asset.assetStartDate);
    const constructionMonths = parseInt(asset.constructionDuration) || 0;
    opsDate.setMonth(opsDate.getMonth() - constructionMonths);
    
    return opsDate.toISOString().split('T')[0];
  };
  
  // Set construction start date if it doesn't exist but we have ops start date and construction duration
  useEffect(() => {
    if (!asset.constructionStartDate && asset.assetStartDate && asset.constructionDuration) {
      onUpdateAsset('constructionStartDate', calculateDefaultConstructionStart());
    }
  }, [asset.assetStartDate, asset.constructionDuration]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Details</CardTitle>
          <Button variant="ghost" size="icon" onClick={onRemoveAsset} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Template Selection */}
            {!selectedRenewable && asset.name === `Default Asset ${asset.id}` && (
              <div className="col-span-2">
                <label className="text-sm font-medium">Template</label>
                <Select onValueChange={handleRenewableSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing renewable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {renewablesData
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(renewable => (
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
                onChange={(e) => onUpdateAsset('name', e.target.value)}
                className={outOfSync.name ? "text-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select 
                value={asset.state || ''} 
                onValueChange={(value) => onUpdateAsset('state', value)}
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
                onValueChange={(value) => onUpdateAsset('type', value)}
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
                  onChange={(e) => handleFieldUpdate('capacity', e.target.value, { round: true })}
                  className={outOfSync.capacity ? "text-red-500" : ""}
                />
              </div>

              {asset.type === 'storage' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Volume (MWh)</label>
                  <Input
                    type="number"
                    value={formatNumericValue(asset.volume)}
                    onChange={(e) => handleFieldUpdate('volume', e.target.value)}
                    placeholder="Volume (MWh)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Storage capacity in MWh</p>
                </div>
              )}
            </div>

            {/* Dates and Construction */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cons Start</label>
              <Input
                type="date"
                value={asset.constructionStartDate || ''}
                onChange={(e) => onUpdateAsset('constructionStartDate', e.target.value)}
                className={outOfSync.constructionStartDate ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">When construction begins</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Cons Duration (months)</label>
              <Input
                type="number"
                min="1"
                value={formatNumericValue(asset.constructionDuration)}
                onChange={(e) => handleFieldUpdate('constructionDuration', e.target.value, { round: true })}
                className={outOfSync.constructionDuration ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">Construction period length</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ops Start</label>
              <Input
                type="date"
                value={asset.assetStartDate || ''}
                onChange={(e) => onUpdateAsset('assetStartDate', e.target.value)}
                className={outOfSync.assetStartDate ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">When operations begin</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Life (years)</label>
              <Input
                type="number"
                min="0"
                value={formatNumericValue(asset.assetLife)}
                onChange={(e) => handleFieldUpdate('assetLife', e.target.value, { round: true })}
              />
            </div>

            {/* Performance Factors */}
            {asset.type !== 'storage' && (
              <div className="col-span-2">
                <h4 className="text-sm font-medium mb-2">Quarterly Capacity Factors (%)</h4>
                <div className="grid grid-cols-4 gap-4">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => (
                    <div key={quarter}>
                      <label className="text-xs text-gray-500">{quarter}</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={asset[`qtrCapacityFactor_${quarter.toLowerCase()}`] || ''}
                        onChange={(e) => handleFieldUpdate(
                          `qtrCapacityFactor_${quarter.toLowerCase()}`, 
                          e.target.value,
                          { min: 0, max: 100, round: true, asString: true }
                        )}
                      />
                    </div>
                  ))}
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
                onChange={(e) => handleFieldUpdate('volumeLossAdjustment', e.target.value, { min: 0, max: 100 })}
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
                onChange={(e) => handleFieldUpdate('annualDegradation', e.target.value, { min: 0, max: 100 })}
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
                onChange={(e) => handleCostUpdate('capex', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Total capital expenditure</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opex ($M/pa)</label>
              <Input
                type="number"
                value={assetCosts.operatingCosts ?? ''}
                onChange={(e) => handleCostUpdate('operatingCosts', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Annual operating costs</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Opex Escalation (%)</label>
              <Input
                type="number"
                value={assetCosts.operatingCostEscalation ?? ''}
                onChange={(e) => handleCostUpdate('operatingCostEscalation', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Annual increase in costs</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Terminal Value ($M)</label>
              <Input
                type="number"
                value={assetCosts.terminalValue ?? ''}
                onChange={(e) => handleCostUpdate('terminalValue', e.target.value)}
                className="w-full"
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
                onChange={(e) => handleCostUpdate('maxGearing', parseFloat(e.target.value) / 100)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Maximum debt-to-capital ratio</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target DSCR Contract (x)</label>
              <Input
                type="number"
                value={assetCosts.targetDSCRContract ?? ''}
                onChange={(e) => handleCostUpdate('targetDSCRContract', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">For contracted revenue</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target DSCR Merchant (x)</label>
              <Input
                type="number"
                value={assetCosts.targetDSCRMerchant ?? ''}
                onChange={(e) => handleCostUpdate('targetDSCRMerchant', e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">For merchant revenue</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Rate (%)</label>
              <Input
                type="number"
                value={(assetCosts.interestRate * 100) ?? ''}
                onChange={(e) => handleCostUpdate('interestRate', parseFloat(e.target.value) / 100)}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Annual interest rate</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenor (Years)</label>
              <Input
                type="number"
                value={assetCosts.tenorYears ?? ''}
                onChange={(e) => handleCostUpdate('tenorYears', e.target.value)}
                className="w-full"
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
          <Button onClick={addContract}>
            <Plus className="h-4 w-4 mr-2" />Add Contract
          </Button>
        </CardHeader>
        <CardContent>
          {asset.contracts.map((contract) => (
            <AssetFormContract
              key={contract.id}
              contract={contract}
              updateContract={(field, value) => handleContractUpdate(contract.id, field, value)}
              removeContract={() => removeContract(contract.id)}
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