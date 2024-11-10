import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AssetDashboard = () => {
  const { assets, setAssets, defaultNewAsset } = usePortfolio();
  const [activeTab, setActiveTab] = useState(Object.keys(assets)[0] || '1');

  const addNewTab = () => {
    const newId = String(Object.keys(assets).length + 1);
    const assetNumber = Object.keys(assets).length + 1;
    setAssets(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        name: `Default Asset ${assetNumber}`,
        state: 'NSW',
        capacity: '100',
        type: 'solar',
        volumeLossAdjustment: '100',
        contracts: []
      }
    }));
    setActiveTab(newId);
  };

  
  const updateAsset = (id, field, value) => {
    setAssets(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const updateAssetContracts = (id, contracts) => {
    setAssets(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        contracts
      }
    }));
  };

  const removeAsset = (id) => {
    setAssets(prev => {
      const newAssets = { ...prev };
      delete newAssets[id];
      return newAssets;
    });
    setActiveTab(Object.keys(assets).find(key => key !== id) || '1');
  };

  if (Object.keys(assets).length === 0) {
    return (
      <div className="flex flex-col items-left justify-left p-8">
        <p className="text-gray-500 mb-4">No assets in portfolio</p>
        <Button variant="default" size="icon" onClick={addNewTab}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center space-x-2">
          <TabsList className="flex-grow">
            {Object.values(assets).map((asset) => (
              <TabsTrigger
                key={asset.id}
                value={asset.id}
                className="flex-grow relative"
              >
                {asset.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to remove this asset?')) {
                      removeAsset(asset.id);
                    }
                  }}
                  className="absolute right-2 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={addNewTab}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {Object.values(assets).map((asset) => (
          <TabsContent key={asset.id} value={asset.id}>
            <AssetForm
              asset={asset}
              onUpdateAsset={(field, value) => updateAsset(asset.id, field, value)}
              onUpdateContracts={(contracts) => updateAssetContracts(asset.id, contracts)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

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
      hasFloor: false,
      floorValue: '',
      startDate: '01/01/2024',
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
        
        // For bundled contracts, calculate green price based on strike and black price
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
                placeholder="Asset Name"
                value={asset.name}
                onChange={(e) => onUpdateAsset('name', e.target.value)}
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
                placeholder="Capacity"
                value={asset.capacity}
                onChange={(e) => onUpdateAsset('capacity', e.target.value)}
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
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Vol. Adjust (%)</label>
                <span className="text-xs text-gray-500">(Availability / MLF / Other adjustments)</span>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Volume Loss Adjustment"
                value={asset.volumeLossAdjustment}
                onChange={(e) => onUpdateAsset('volumeLossAdjustment', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Card key={contract.id} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => removeContract(contract.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardContent className="pt-8">
                <div className="grid grid-cols-2 gap-4">
                  {/* First Row */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Counterparty</label>
                    <Input
                      placeholder="Counterparty Name"
                      value={contract.counterparty}
                      onChange={(e) => updateContract(contract.id, 'counterparty', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contract Type</label>
                    <Select 
                      value={contract.type} 
                      onValueChange={(value) => updateContract(contract.id, 'type', value)}
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

                  {/* Second Row */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Strike Price</label>
                    <Input
                      type="number"
                      value={contract.strikePrice}
                      onChange={(e) => updateContract(contract.id, 'strikePrice', e.target.value)}
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
                      onChange={(e) => updateContract(contract.id, 'buyersPercentage', e.target.value)}
                    />
                  </div>

                  {/* Bundled-specific fields */}
                  {contract.type === 'bundled' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Black Price</label>
                        <Input
                          type="number"
                          value={contract.blackPrice}
                          onChange={(e) => updateContract(contract.id, 'blackPrice', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Green Price</label>
                        <Input
                          type="number"
                          value={contract.greenPrice}
                          onChange={(e) => updateContract(contract.id, 'greenPrice', e.target.value)}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </>
                  )}

                  {/* Remaining fields */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={contract.startDate}
                      onChange={(e) => updateContract(contract.id, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={contract.endDate}
                      onChange={(e) => updateContract(contract.id, 'endDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Indexation (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={contract.indexation}
                      onChange={(e) => updateContract(contract.id, 'indexation', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Floor</label>
                    <div className="flex space-x-2">
                    <Select
                        value={contract.hasFloor ? 'yes' : 'no'}
                        onValueChange={(value) => updateContract(contract.id, 'hasFloor', value === 'yes')}
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
                          onChange={(e) => updateContract(contract.id, 'floorValue', e.target.value)}
                          className="w-2/3"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

export default AssetDashboard;