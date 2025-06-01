// pages/AssetDashboard.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useAssetManagement } from '@/hooks/useAssetManagement';
import AssetForm from '@/components/AssetForm';
import AssetSummaryInputs from '@/components/AssetSummaryInputs';

const AssetDashboard = () => {
  const { 
    portfolioName, 
    setPortfolioName, 
    exportPortfolioData,
    importPortfolioData
  } = usePortfolio();
  
  const { assets, addNewAsset } = useAssetManagement();
  
  const [activeTab, setActiveTab] = useState('summary');
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const tabsListRef = useRef(null);
  const fileInputRef = useRef(null);

  // Import functionality
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          importPortfolioData(importedData);
          alert('Asset data imported successfully');
        } catch (error) {
          alert('Error importing asset data: Invalid format');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  // Export functionality
  const exportPortfolio = () => {
    const exportData = exportPortfolioData();
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `${portfolioName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  // Check if tabs overflow and show scroll buttons
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

  // Scroll tabs left or right
  const scroll = (direction) => {
    if (tabsListRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Add new asset and switch to its tab
  const handleAddNewAsset = () => {
    const newAssetId = addNewAsset();
    setActiveTab(newAssetId);
  };

  // Handle empty state
  if (Object.keys(assets).length === 0) {
    return (
      <div className="flex flex-col items-left justify-left p-8">
        <p className="text-gray-500 mb-4">No assets in portfolio</p>
        <Button variant="default" size="icon" onClick={handleAddNewAsset}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span>Asset & Contracts Definitions</span>
              <Input 
                className="w-64 border-2 px-3 py-1 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Portfolio Name"
                value={portfolioName}
                onChange={(e) => setPortfolioName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Load Inputs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPortfolio}
              >
                <Download className="w-4 h-4 mr-2" />
                Save Inputs
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TabsTrigger
                    value="summary"
                    className="flex-shrink-0 relative group w-auto data-[state=active]:bg-blue-500 data-[state=active]:text-white hover:bg-blue-100"
                  >
                    <span className="flex items-center justify-center w-full">
                      Summary Editor
                    </span>
                  </TabsTrigger>
                  {Object.values(assets).map((asset) => (
                    <TabsTrigger
                      key={asset.id}
                      value={asset.id}
                      className="flex-shrink-0 relative group w-auto"
                    >
                      <span className="flex items-center justify-center w-full">
                        {asset.name}
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

              <Button onClick={handleAddNewAsset} className="flex-shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <TabsContent value="summary">
              <AssetSummaryInputs />
            </TabsContent>
            
            {Object.values(assets).map((asset) => (
              <TabsContent key={asset.id} value={asset.id}>
                <AssetForm assetId={asset.id} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetDashboard;