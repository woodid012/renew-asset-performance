import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
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
  const { constants } = usePortfolio();
  const [renewablesData, setRenewablesData] = useState([]);
  const [selectedRenewable, setSelectedRenewable] = useState(null);
  const [outOfSync, setOutOfSync] = useState({
    name: false,
    state: false,
    capacity: false,
    type: false,
    volumeLossAdjustment: false,
    assetStartDate: false
  });

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

  // Set default degradation
  useEffect(() => {
    if (asset.type && !asset.annualDegradation) {
      const defaultDegradation = constants.annualDegradation[asset.type];
      if (defaultDegradation !== undefined) {
        onUpdateAsset('annualDegradation', defaultDegradation);
      }
    }
  }, [asset.type]);

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
        assetStartDate: false
      });
    }
  }, [asset, selectedRenewable]);

  const handleFieldUpdate = (field, value, options = {}) => {
    const processedValue = handleNumericInput(value, options);
    onUpdateAsset(field, processedValue);
  };

  const handleRenewableSelection = (selectedRenewableId) => {
    const selected = renewablesData.find(r => r.id === selectedRenewableId);
    if (selected) {
      setSelectedRenewable(selected);
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

  const year1Volume = calculateYear1Volume(asset);

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

            {/* Dates and Lifecycle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={asset.assetStartDate || ''}
                onChange={(e) => onUpdateAsset('assetStartDate', e.target.value)}
                className={outOfSync.assetStartDate ? "text-red-500" : ""}
              />
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
