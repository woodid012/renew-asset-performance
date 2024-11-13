import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetForm from './AssetForm';

const AssetDashboard = () => {
  const { assets, setAssets } = usePortfolio();
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

export default AssetDashboard;