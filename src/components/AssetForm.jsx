import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetFormContract from './AssetFormContract';

const AssetForm = ({ asset, onUpdateAsset, onUpdateContracts }) => {
  const { constants } = usePortfolio();

  // Effect to update capacity factor when state or type changes
  useEffect(() => {
    if (asset.state && asset.type) {
      const defaultCapacityFactor = constants.capacityFactors?.[asset.type]?.[asset.state];
      if (defaultCapacityFactor) {
        // Convert decimal to percentage and round to whole number
        onUpdateAsset('capacityFactor', Math.round(defaultCapacityFactor * 100));
      }
    }
  }, [asset.state, asset.type, constants.capacityFactors]);

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
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={asset.name}
                onChange={(e) => onUpdateAsset('name', e.target.value)}
                placeholder="Asset Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select
                value={asset.state}
                onValueChange={(value) => onUpdateAsset('state', value)}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Start Date</label>
              <Input
                type="date"
                value={asset.assetStartDate}
                onChange={(e) => onUpdateAsset('assetStartDate', e.target.value)}
                placeholder="Asset Start Date"
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