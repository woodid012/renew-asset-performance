import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AssetForm = ({ asset, onUpdateAsset, onUpdateContracts }) => {
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
            {/* Asset Details Form */}
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
              <label className="text-sm font-medium">Capacity (MW)</label>
              <Input
                type="number"
                value={asset.capacity}
                onChange={(e) => onUpdateAsset('capacity', e.target.value)}
                placeholder="Capacity"
              />
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
            <ContractCard
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

// Contract Card Component
const ContractCard = ({ contract, updateContract, removeContract }) => {
  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={removeContract}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="pt-8">
        <div className="grid grid-cols-2 gap-4">
          {/* Contract Form Fields */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Counterparty</label>
            <Input
              value={contract.counterparty}
              onChange={(e) => updateContract('counterparty', e.target.value)}
              placeholder="Counterparty Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contract Type</label>
            <Select 
              value={contract.type}
              onValueChange={(value) => updateContract('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bundled">Bundled PPA</SelectItem>
                <SelectItem value="green">Green Only</SelectItem>
                <SelectItem value="black">Black Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Strike Price</label>
            <Input
              type="number"
              value={contract.strikePrice}
              onChange={(e) => updateContract('strikePrice', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Buyer's Percentage (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={contract.buyersPercentage}
              onChange={(e) => updateContract('buyersPercentage', e.target.value)}
            />
          </div>

          {contract.type === 'bundled' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Black Price</label>
                <Input
                  type="number"
                  value={contract.blackPrice}
                  onChange={(e) => updateContract('blackPrice', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Green Price</label>
                <Input
                  type="number"
                  value={contract.greenPrice}
                  onChange={(e) => updateContract('greenPrice', e.target.value)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="date"
              value={contract.startDate}
              onChange={(e) => updateContract('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="date"
              value={contract.endDate}
              onChange={(e) => updateContract('endDate', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
                <label className="text-sm font-medium">Indexation (%)</label>
                <Input
                type="number"
                step="0.1"
                value={contract.indexation}
                onChange={(e) => updateContract('indexation', e.target.value)}
                />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium">Reference Year</label>
                <Input
                type="number"
                value={contract.indexationReferenceYear}
                onChange={(e) => updateContract('indexationReferenceYear', e.target.value)}
                min="2000"
                max="2100"
                />
            </div>
            <div className="space-y-1">
                <label className="text-sm font-medium">Floor Strike</label>
                <div className="flex space-x-2">
                  <Select
                    value={contract.hasFloor ? 'yes' : 'no'}
                    onValueChange={(value) => updateContract('hasFloor', value === 'yes')}
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                  {contract.hasFloor && (
                    <Input
                      type="number"
                      placeholder="Floor Value"
                      value={contract.floorValue}
                      onChange={(e) => updateContract('floorValue', e.target.value)}
                      className="w-2/3"
                    />
                  )}
                </div>
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Settlement Formula</label>
            <Input
              value={contract.settlementFormula}
              onChange={(e) => updateContract('settlementFormula', e.target.value)}
              placeholder="Enter settlement formula"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetForm;