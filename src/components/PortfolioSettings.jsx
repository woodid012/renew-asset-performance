import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioSettings = () => {
  const { 
    assets, 
    setAssets,
    constants,
    updateConstants,
    setPortfolioSource,
    setPriceCurveSource,
    portfolioSource,
    priceCurveSource
  } = usePortfolio();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          if (importedData.assets && importedData.constants) {
            setAssets(importedData.assets);
            Object.entries(importedData.constants).forEach(([key, value]) => {
              updateConstants(key, value);
            });
            alert('Portfolio data imported successfully');
          } else {
            throw new Error('Invalid data structure');
          }
        } catch (error) {
          alert('Error importing portfolio data: Invalid format');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const exportPortfolio = () => {
    const exportData = {
      assets,
      constants,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Data Sources</CardTitle>
          <CardDescription>
            Select portfolio and price curve data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio Source</label>
                <Select 
                  value={portfolioSource} 
                  onValueChange={setPortfolioSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assets_aula.csv">Test 1 Portfolio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Curve Source</label>
                <Select 
                  value={priceCurveSource} 
                  onValueChange={setPriceCurveSource}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select price curve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant_price_monthly.csv">Monthly Merchant Prices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User Guide</CardTitle>
          <CardDescription>
            How to manage your portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Data Sources</h4>
              <p className="text-sm text-gray-600">
                Select your preferred portfolio data source and price curve from the dropdown menus above.
                Changes will take effect immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;