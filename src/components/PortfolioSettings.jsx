import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolio } from '@/contexts/PortfolioContext';

const portfolios = [
  {
    id: 'aula',
    filename: 'aula_2025-01-13.json',
    displayName: 'Aula',
    description: 'Greenfield wind portfolio with long-term PPAs'
  },
  {
    id: 'neoen',
    filename: 'neoen___merchant_2025-01-13.json',
    displayName: 'Neoen - Merchant',
    description: 'Operational renewables portfolio'
  },
  {
    id: 'zebre',
    filename: 'zebre_2025-01-13.json',
    displayName: 'ZEBRE',
    description: 'Mixed technology portfolio with storage'
  },
  {
    id: 'acciona',
    filename: 'acciona_merchant_2025-01-13.json',
    displayName: 'Acciona - Merchant',
    description: 'Operational and development portfolio'
  }
];

const PortfolioSettings = () => {
  const { 
    setAssets,
    setPortfolioName,
    activePortfolio,
    setActivePortfolio,
    priceCurveSource,
    setPriceCurveSource
  } = usePortfolio();

  const loadPortfolio = async (filename, portfolioId) => {
    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error('Failed to load portfolio');
      
      const data = await response.json();
      setAssets(data.assets);
      setPortfolioName(data.portfolioName);
      setActivePortfolio(portfolioId);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      alert('Failed to load portfolio');
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
          <CardTitle>Portfolio Settings</CardTitle>
          <CardDescription>
            Select a portfolio template and price curve data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Portfolio Source Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio Template</label>
                <Select 
                  value={activePortfolio}
                  onValueChange={(value) => {
                    const portfolio = portfolios.find(p => p.id === value);
                    if (portfolio) loadPortfolio(portfolio.filename, portfolio.id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a portfolio template">
                      {portfolios.find(p => p.id === activePortfolio)?.displayName || "Select a portfolio template"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map(portfolio => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Select a predefined portfolio template</p>
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
              <h4 className="font-medium mb-2">Portfolio Templates</h4>
              <p className="text-sm text-gray-600">
                Choose from predefined portfolio templates that showcase different scenarios:
              </p>
              <ul className="mt-2 space-y-2">
                {portfolios.map(portfolio => (
                  <li key={portfolio.id} className="text-sm text-gray-600">
                    <strong>{portfolio.displayName}</strong>: {portfolio.description}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Price Curves</h4>
              <p className="text-sm text-gray-600">
                Select your preferred price curve source. You can use the default Monthly Merchant Prices or 
                switch to your Imported Prices after uploading a custom price file. Changes will take effect immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;
