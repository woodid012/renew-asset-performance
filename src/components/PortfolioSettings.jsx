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

  return (
    <div className="space-y-6 p-4">
      {/* Data Sources Card */}
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
              {/* Portfolio Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio Source</label>
                <Select 
                  value={portfolioSource}
                  onValueChange={setPortfolioSource}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {portfolioSource === 'assets_esp.csv' ? 'Test 2 Portfolio' : 'Test 1 Portfolio'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assets_aula.csv">Test 1 Portfolio</SelectItem>
                    <SelectItem value="assets_esp.csv">Test 2 Portfolio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Price Curve Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Curve Source</label>
                <Select 
                  value={priceCurveSource}
                  onValueChange={setPriceCurveSource}
                >
                  <SelectTrigger>
                    <SelectValue>Monthly Merchant Prices</SelectValue>
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