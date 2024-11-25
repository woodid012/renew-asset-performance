import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, X, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import AssetForm from './AssetForm';

const AssetDashboard = () => {
  const { assets, setAssets } = usePortfolio();
  const [activeTab, setActiveTab] = useState(Object.keys(assets)[0] || '1');
  const [newAssets, setNewAssets] = useState(new Set());
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const tabsListRef = useRef(null);

  // Import functionality
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          if (importedData.assets) {
            setAssets(importedData.assets);
            alert('Asset data imported successfully');
          } else {
            throw new Error('Invalid data structure');
          }
        } catch (error) {
          alert('Error importing asset data: Invalid format');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Export functionality
  const exportPortfolio = () => {
    const exportData = {
      assets,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `portfolio_assets_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (tabsListRef.current) {
        const { scrollWidth, clientWidth } = tabsListRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [assets]);

  const scroll = (direction) => {
    if (tabsListRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const addNewTab = () => {
    const newId = String(Object.keys(assets).length + 1);
    const assetNumber = Object.keys(assets).length + 1;
    setAssets(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        name: `Default Asset ${assetNumber}`,
        state: 'NSW',
        assetStartDate: '2024-01-01',
        capacity: '100',
        type: 'solar',
        volumeLossAdjustment: '100',
        contracts: []
      }
    }));
    setNewAssets(prev => new Set([...prev, newId]));
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
    setNewAssets(prev => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
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
      {/* Import/Export Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Asset & Contracts Defintions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => document.getElementById('import-portfolio').click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Load Inputs
              </Button>
              <input
                id="import-portfolio"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            <div className="flex-1">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={exportPortfolio}
              >
                <Download className="mr-2 h-4 w-4" />
                Save Inputs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center space-x-2">
          {showScrollButtons && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex-grow overflow-hidden">
            <TabsList 
              ref={tabsListRef} 
              className="flex overflow-x-hidden scroll-smooth justify-start"
            >
              {Object.values(assets).map((asset) => (
                <TabsTrigger
                  key={asset.id}
                  value={asset.id}
                  className="flex-shrink-0 relative group w-auto"
                >
                  <span className="flex items-center justify-center w-full">
                    {asset.name}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to remove this asset?')) {
                          removeAsset(asset.id);
                        }
                      }}
                      className="absolute right-2 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </span>
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {showScrollButtons && (
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          <Button onClick={addNewTab} className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {Object.values(assets).map((asset) => (
          <TabsContent key={asset.id} value={asset.id}>
            <AssetForm
              asset={asset}
              isNewAsset={newAssets.has(asset.id)}
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