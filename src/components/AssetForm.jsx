import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetFormContract from './AssetFormContract';
import Papa from 'papaparse';

const AssetForm = ({ asset, onUpdateAsset, onUpdateContracts }) => {
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
          capacity: parseFloat(row['Reg Cap generation (MW)']),
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

  // Helper function to format date from DD/MM/YYYY to YYYY-MM-DD
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  useEffect(() => {
    if (asset.state && asset.type) {
      const defaultCapacityFactor = constants.capacityFactors?.[asset.type]?.[asset.state];
      if (defaultCapacityFactor) {
        onUpdateAsset('capacityFactor', Math.round(defaultCapacityFactor * 100));
      }
    }
  }, [asset.state, asset.type, constants.capacityFactors]);

  // Check if values are out of sync with selected renewable
  useEffect(() => {
    if (selectedRenewable) {
      setOutOfSync({
        name: asset.name !== selectedRenewable.name,
        state: asset.state !== selectedRenewable.state,
        capacity: String(asset.capacity) !== String(selectedRenewable.capacity),
        type: asset.type !== selectedRenewable.type,
        volumeLossAdjustment: selectedRenewable.mlf && 
          String(asset.volumeLossAdjustment) !== String(selectedRenewable.mlf.toFixed(2)),
        assetStartDate: selectedRenewable.startDate && 
          asset.assetStartDate !== selectedRenewable.startDate,
      });
    }
  }, [asset, selectedRenewable]);

  const handleRenewableSelection = (selectedRenewableId) => {
    const selected = renewablesData.find(r => r.id === selectedRenewableId);
    if (selected) {
      setSelectedRenewable(selected);
      onUpdateAsset('name', selected.name);
      onUpdateAsset('state', selected.state);
      onUpdateAsset('capacity', String(selected.capacity));
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
      indexationReferenceYear: new Date().getFullYear(),
      settlementFormula: '',
      hasFloor: false,
      floorValue: '',
      startDate: '2024-01-01',
      endDate: '',
      term: ''
    };
    onUpdateContracts([...asset.contracts, newContract]);
  };

  const removeContract = (contractId) => {
    onUpdateContracts(asset.contracts.filter(c => c.id !== contractId));
  };

  const updateContract = (id, field, value) => {
    onUpdateContracts(
      asset.contracts.map(contract => {
        if (contract.id !== id) return contract;
        
        const updatedContract = { ...contract, [field]: value };
        
        if (updatedContract.type === 'bundled') {
          if (field === 'strikePrice' || field === 'blackPrice') {
            const strikePrice = field === 'strikePrice' ? Number(value) : Number(contract.strikePrice) || 0;
            const blackPrice = field === 'blackPrice' ? Number(value) : Number(contract.blackPrice) || 0;
            updatedContract.greenPrice = strikePrice - blackPrice;
          }
        }
        
        return updatedContract;
      })
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Populate with existing renewable asset</label>
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
                value={asset.name}
                onChange={(e) => onUpdateAsset('name', e.target.value)}
                placeholder="Asset Name"
                className={outOfSync.name ? "text-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select
                value={asset.state}
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
                value={asset.type}
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
                value={asset.capacity}
                onChange={(e) => onUpdateAsset('capacity', e.target.value)}
                placeholder="Capacity"
                className={outOfSync.capacity ? "text-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Start Date</label>
              <Input
                type="date"
                value={asset.assetStartDate}
                onChange={(e) => onUpdateAsset('assetStartDate', e.target.value)}
                placeholder="Asset Start Date"
                className={outOfSync.assetStartDate ? "text-red-500" : ""}
              />
            </div>
            <div></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity Factor (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(Number(asset.capacityFactor))}
                onChange={(e) => onUpdateAsset('capacityFactor', Math.round(Number(e.target.value)))}
                placeholder="Capacity Factor"
              />
              <p className="text-xs text-gray-500">Defaults from global settings based on State and Type</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Volume Loss Adjustment (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={asset.volumeLossAdjustment}
                onChange={(e) => onUpdateAsset('volumeLossAdjustment', e.target.value)}
                placeholder="Volume Loss Adjustment"
                className={outOfSync.volumeLossAdjustment ? "text-red-500" : ""}
              />
              <p className="text-xs text-gray-500">Includes MLF and degradation</p>
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