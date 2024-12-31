import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioSettings = () => {
  const { 
    portfolioSource,
    setPortfolioSource,
    priceCurveSource,
    setPriceCurveSource
  } = usePortfolio();

  const getPortfolioDisplayName = (filename) => {
    switch(filename) {
      case 'assets_aula.csv':
        return 'Aula Assets - with dummy contracts';
      case 'assets_neoen.csv':
        return 'Neoen Asset - merchant';
      case 'assets_acciona.csv':
        return 'Acciona Asset - merchant';
      default:
        return filename;
    }
  };

  const getPriceCurveDisplayName = (source) => {
    switch(source) {
      case 'merchant_price_monthly.csv':
        return 'Monthly Merchant Prices';
      case 'imported':
        return 'Imported Prices';
      default:
        return source;
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Data Sources Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dummy Asset Portfolio - Data Sources</CardTitle>
          <CardDescription>
            Select a dummy portfolio and price curve data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Portfolio Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio Source</label>
                <Select 
                  value={portfolioSource}
                  onValueChange={setPortfolioSource}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {getPortfolioDisplayName(portfolioSource)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assets_aula.csv">Aula Assets - public info with dummy contracts</SelectItem>
                    <SelectItem value="assets_neoen.csv">Neoen Assets - merchant</SelectItem>
                    <SelectItem value="assets_acciona.csv">Acciona Assets - merchant</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Select the portfolio of assets to analyze</p>
              </div>
              
              {/* Price Curve Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Curve Source</label>
                <Select 
                  value={priceCurveSource}
                  onValueChange={setPriceCurveSource}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {getPriceCurveDisplayName(priceCurveSource)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant_price_monthly.csv">Monthly Merchant Prices</SelectItem>
                    <SelectItem value="imported">Imported Prices</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Select the source for price curves</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Guide Card */}
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
                You can use the default Monthly Merchant Prices or switch to your Imported Prices after uploading
                a custom price file. Changes will take effect immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;