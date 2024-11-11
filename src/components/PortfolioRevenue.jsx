import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  generatePortfolioData, 
  processPortfolioData, 
  getAssetColor 
} from './portfolioUtils';

const PortfolioDashboard = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [visibleAssets, setVisibleAssets] = useState({});
  
  useEffect(() => {
    const newVisibleAssets = {};
    Object.values(assets).forEach(asset => {
      newVisibleAssets[asset.name] = true;
    });
    setVisibleAssets(newVisibleAssets);
  }, [assets]);

  const portfolioData = generatePortfolioData(assets, constants, getMerchantPrice);
  const processedData = processPortfolioData(portfolioData, assets, visibleAssets);

  const toggleAsset = (assetName) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetName]: !prev[assetName]
    }));
  };

  if (Object.keys(assets).length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">No assets in portfolio to visualize</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex space-x-4">
        <Card className="w-64">
          <CardHeader>
            <CardTitle>Asset Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(assets).map((asset) => (
                <div key={asset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={asset.id}
                    checked={visibleAssets[asset.name]}
                    onCheckedChange={() => toggleAsset(asset.name)}
                  />
                  <Label htmlFor={asset.id}>{asset.name}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Showing data for {Object.entries(visibleAssets)
                .filter(([_, isVisible]) => isVisible)
                .map(([name]) => name)
                .join(', ')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Total Capacity</p>
                <p className="text-2xl font-bold">
                  {Object.values(assets)
                    .filter(asset => visibleAssets[asset.name])
                    .reduce((sum, asset) => sum + parseFloat(asset.capacity), 0)}
                  MW
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Contracted %</p>
                <div className="space-y-1">
                  <p className="text-lg">
                    <span className="font-medium text-emerald-600">Green: </span>
                    {Math.round(processedData[0]?.weightedGreenPercentage || 0)}%
                  </p>
                  <p className="text-lg">
                    <span className="font-medium text-gray-600">Black: </span>
                    {Math.round(processedData[0]?.weightedBlackPercentage || 0)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Portfolio Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {Object.values(assets).map((asset, index) => 
                  visibleAssets[asset.name] && (
                    <React.Fragment key={asset.id}>
                      <Bar 
                        dataKey={`${asset.name} Green`} 
                        stackId="a" 
                        fill="#10B981"
                        name={`${asset.name} Green`}
                      />
                      <Bar 
                        dataKey={`${asset.name} Black`} 
                        stackId="a" 
                        fill="#4B5563"
                        name={`${asset.name} Black`}
                      />
                      <Bar 
                        dataKey={`${asset.name} Merchant`} 
                        stackId="a" 
                        fill="#9CA3AF"
                        name={`${asset.name} Merchant`}
                      />
                    </React.Fragment>
                  )
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Contracted Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Contracted (%)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weightedGreenPercentage" 
                  stroke="#10B981" 
                  name="Green Contracted %"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="weightedBlackPercentage" 
                  stroke="#4B5563" 
                  name="Black Contracted %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;