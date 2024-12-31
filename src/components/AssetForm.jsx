import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetFormContract from './AssetFormContract';
import Papa from 'papaparse';

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
    assetStartDate: false,
  });

  // Helper function to safely handle numeric inputs
  const handleNumericInput = (field, value, forceNumber = false) => {
    const parsed = value === '' ? '' : Number(value);
    if (field === 'capacity') {
      // Round capacity to whole number and keep as number
      const roundedValue = Math.round(parsed);
      onUpdateAsset(field, roundedValue);
    } else if (field.startsWith('qualrtyCapacityFactor_')) {
      // Round capacity factors to whole numbers and store as string
      const roundedValue = Math.round(parsed);
      onUpdateAsset(field, String(roundedValue));
    } else {
      onUpdateAsset(field, forceNumber ? parsed : String(parsed));
    }
  };

  // Helper function to format numeric values for display
  const formatNumericValue = (value) => {
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  };

  useEffect(() => {
    const loadRenewablesData = async () => {
      try {
        const response = await fetch('/renewables_registration_data.csv');
        const csvText = await response.text();
        
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true
        });
        
        const processed = result.data.map(row => ({
          id: row.DUID,
          name: row['Station Name'],
          state: row.Region.substring(0, row.Region.length - 1),
          capacity: Math.round(parseFloat(row['Reg Cap generation (MW)'])), // Keep rounded
          type: row['Fuel Source - Primary'].toLowerCase(),
          mlf: row['2024-25 MLF'] ? parseFloat(row['2024-25 MLF']) * 100 : null,
          startDate: row['StartDate'] ? formatDate(row['StartDate']) : ''
        }));
        
        setRenewablesData(processed);
      } catch (error) {
        console.error('Error loading renewables data:', error);
      }
    };

    loadRenewablesData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  // Update capacity and quarterly factors when state or type changes
  useEffect(() => {
    console.log('Effect triggered - State:', asset.state, 'Type:', asset.type);
    // Reset quarterly factors when type or state changes
    if (!asset.state || !asset.type) {
      ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
        const quarterKey = `qualrtyCapacityFactor_${quarter.toLowerCase()}`;
        onUpdateAsset(quarterKey, '');
      });
      return;
    }

    // Always update quarterly capacity factors when state or type changes
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
      const defaultValue = constants.capacityFactors_qtr?.[asset.type]?.[asset.state]?.[quarter];
      const quarterKey = `qualrtyCapacityFactor_${quarter.toLowerCase()}`;
      
      // Force update the value regardless of existing value
      if (defaultValue !== undefined) {
        const roundedValue = Math.round(defaultValue * 100);
        onUpdateAsset(quarterKey, String(roundedValue));
      }
    });

    // Update annual capacity factor
    const defaultCapacityFactor = constants.capacityFactors?.[asset.type]?.[asset.state];
    if (defaultCapacityFactor) {
      onUpdateAsset('capacityFactor', String(Math.round(defaultCapacityFactor * 100)));
    }
  }, [asset.state, asset.type, onUpdateAsset]);

  useEffect(() => {
    if (selectedRenewable) {
      setOutOfSync({
        name: asset.name !== selectedRenewable.name,
        state: asset.state !== selectedRenewable.state,
        capacity: asset.capacity !== selectedRenewable.capacity, // Compare numbers directly
        type: asset.type !== selectedRenewable.type,
        volumeLossAdjustment: selectedRenewable.mlf && 
          String(asset.volumeLossAdjustment) !== String(selectedRenewable.mlf.toFixed(2)),
        assetStartDate: selectedRenewable.startDate && 
          asset.assetStartDate !== selectedRenewable.startDate,
      });
    }
  }, [asset, selectedRenewable]);
  

  useEffect(() => {
    // If we have a type but no degradation value, set the default
    if (asset.type && !asset.annualDegradation) {
      const defaultDegradation = constants.annualDegradation[asset.type];
      if (defaultDegradation !== undefined) {
        onUpdateAsset('annualDegradation', defaultDegradation);
      }
    }
  }, []);
  const handleRenewableSelection = (selectedRenewableId) => {
    const selected = renewablesData.find(r => r.id === selectedRenewableId);
    if (selected) {
      setSelectedRenewable(selected);
      onUpdateAsset('name', selected.name);
      onUpdateAsset('state', selected.state);
      onUpdateAsset('capacity', Math.round(selected.capacity)); // Keep as number
      onUpdateAsset('type', selected.type);
      
      if (selected.mlf) {
        onUpdateAsset('volumeLossAdjustment', selected.mlf.toFixed(2));
      }
      
      if (selected.startDate) {
        onUpdateAsset('assetStartDate', selected.startDate);
      }
    }
  };

  const addContract = () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const newContract = {
      id: String(asset.contracts.length + 1),
      counterparty: `Counterparty ${asset.contracts.length + 1}`,
      type: '',
      buyersPercentage: '',
      shape: 'flat',
      strikePrice: '',
      greenPrice: '',
      blackPrice: '',
      indexation: '',
      indexationReferenceYear: String(new Date().getFullYear()),
      settlementFormula: '',
      hasFloor: false,
      floorValue: '',
      startDate: startDate,
    };
    onUpdateContracts([...asset.contracts, newContract]);
  };

  const removeContract = (contractId) => {
    onUpdateContracts(asset.contracts.filter(c => c.id !== contractId));
  };

  const updateContract = (id, field, value) => {
    console.log('Updating contract:', field, value); // Debug log
    onUpdateContracts(
      asset.contracts.map(contract => {
        if (contract.id !== id) return contract;
        
        let updatedValue = value;
        // Handle numeric fields
        if (field === 'term' || field === 'strikePrice' || field === 'buyersPercentage' || 
            field === 'blackPrice' || field === 'greenPrice' || field === 'indexation' || 
            field === 'floorValue') {
          updatedValue = value === '' ? '' : value;  // Keep as is, don't convert
        }
        
        const updatedContract = { ...contract, [field]: updatedValue };
        
        // Handle bundled contract price calculations
        if (updatedContract.type === 'bundled') {
          if (field === 'strikePrice' || field === 'blackPrice') {
            const strikePrice = field === 'strikePrice' ? Number(value) : Number(contract.strikePrice) || 0;
            const blackPrice = field === 'blackPrice' ? Number(value) : Number(contract.blackPrice) || 0;
            updatedContract.greenPrice = String(strikePrice - blackPrice);
          }
        }
        
        return updatedContract;
      })
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Details</CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRemoveAsset}
            className="h-8 w-8 p-0 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Populate with existing renewable asset template</label>
              <Select onValueChange={handleRenewableSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an existing renewable" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    <SelectLabel>Select Asset</SelectLabel>
                    {renewablesData
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(renewable => (
                        <SelectItem key={renewable.id} value={renewable.id}>
                          {renewable.name} ({renewable.capacity} MW, {renewable.type.charAt(0).toUpperCase() + renewable.type.slice(1)})
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={asset.name || ''}
                onChange={(e) => onUpdateAsset('name', e.target.value)}
                placeholder="Asset Name"
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
                  <SelectItem value="NSW">NSW</SelectItem>
                  <SelectItem value="VIC">VIC</SelectItem>
                  <SelectItem value="SA">SA</SelectItem>
                  <SelectItem value="QLD">QLD</SelectItem>
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
                  <SelectItem value="wind">Wind</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity (MW)</label>
              <Input
                type="number"
                value={asset.capacity || ''}
                onChange={(e) => handleNumericInput('capacity', e.target.value)}
                placeholder="Capacity"
                className={outOfSync.capacity ? "text-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Start Date</label>
              <Input
                type="date"
                value={asset.assetStartDate || ''}
                onChange={(e) => onUpdateAsset('assetStartDate', e.target.value)}
                placeholder="Asset Start Date"
                className={outOfSync.assetStartDate ? "text-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Life (years)</label>
              <Input
                type="number"
                min="0"
                value={formatNumericValue(asset.assetLife) || '35'}
                onChange={(e) => handleNumericInput('assetLife', e.target.value)}
                placeholder="Asset Life"
              />
            </div>

            <div className="col-span-2">
              <h4 className="text-sm font-medium mb-2">Quarterly Capacity Factors (%)</h4>
              <div className="grid grid-cols-4 gap-4">
                {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => (
                  <div key={quarter} className="space-y-1">
                    <label className="text-xs text-gray-500">{quarter}</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={asset[`qualrtyCapacityFactor_${quarter.toLowerCase()}`] || ''}
                      onChange={(e) => handleNumericInput(`qualrtyCapacityFactor_${quarter.toLowerCase()}`, e.target.value)}
                      placeholder={`${quarter}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Defaults from global settings based on State and Type</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Volume Loss Adjustment (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formatNumericValue(asset.volumeLossAdjustment)}
                onChange={(e) => handleNumericInput('volumeLossAdjustment', e.target.value)}
                placeholder="Volume Loss Adjustment"
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
                onChange={(e) => handleNumericInput('annualDegradation', e.target.value)}
                placeholder="Annual Degradation"
                className={outOfSync.annualDegradation ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">Annual reduction in output (e.g. 0.4% per year)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contracts</CardTitle>
          <Button onClick={addContract}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contract
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {asset.contracts.map((contract) => (
            <AssetFormContract
              key={contract.id}
              contract={contract}
              updateContract={(field, value) => updateContract(contract.id, field, value)}
              removeContract={() => removeContract(contract.id)}
            />
          ))}
          {asset.contracts.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No contracts added yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetForm;