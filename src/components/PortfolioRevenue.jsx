import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioDashboard = () => {
  const { assets, constants } = usePortfolio();
  const [visibleAssets, setVisibleAssets] = useState({});
  
  useEffect(() => {
    const newVisibleAssets = {};
    Object.values(assets).forEach(asset => {
      newVisibleAssets[asset.name] = true;
    });
    setVisibleAssets(newVisibleAssets);
  }, [assets]);

  const generatePortfolioData = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 7}, (_, i) => currentYear + i);
    
    return years.map(year => {
      const yearData = {
        year,
        assets: {}
      };

      Object.values(assets).forEach(asset => {
        const assetRevenue = calculateAssetRevenue(asset, year);
        yearData.assets[asset.name] = assetRevenue;
      });

      return yearData;
    });
  };

  const calculateAssetRevenue = (asset, year) => {
    const HOURS_IN_YEAR = constants.HOURS_IN_YEAR || 8760;
    const capacityFactor = constants.capacityFactors?.[asset.type]?.[asset.state] || 0.28; // Default to NSW solar
    const capacity = parseFloat(asset.capacity) || 0;
    const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment) || 95;
    const annualGeneration = capacity * volumeLossAdjustment / 100  * HOURS_IN_YEAR * capacityFactor;

    const activeContracts = asset.contracts.filter(contract => {
      const startYear = new Date(contract.startDate).getFullYear();
      const endYear = new Date(contract.endDate).getFullYear();
      return year >= startYear && year <= endYear;
    });

    let contracted = 0;
    let merchant = 0;
    
    activeContracts.forEach(contract => {
      const buyersPercentage = parseFloat(contract.buyersPercentage) || 0;
      const years = year - new Date(contract.startDate).getFullYear();
      const indexation = parseFloat(contract.indexation) || 0;
      let price = 0;

      if (contract.type === 'bundled') {
        price = (parseFloat(contract.greenPrice) || 0) + (parseFloat(contract.blackPrice) || 0);
      } else {
        price = parseFloat(contract.strikePrice) || 0;
      }

      // Apply indexation
      price *= Math.pow(1 + indexation/100, years);
      
      // Apply floor if exists
      if (contract.hasFloor && price < parseFloat(contract.floorValue)) {
        price = parseFloat(contract.floorValue);
      }

      // Calculate revenue in millions
      const contractRevenue = (annualGeneration * buyersPercentage/100 * price) / 1000000;
      contracted += contractRevenue;
    });

    // Calculate merchant revenue
    const totalContractedPercentage = activeContracts.reduce((sum, contract) => 
      sum + (parseFloat(contract.buyersPercentage) || 0), 0);
    
    const merchantPercentage = 100 - totalContractedPercentage;
    const merchantPrice = 50; // Simplified merchant price assumption
    merchant = (annualGeneration * merchantPercentage/100 * merchantPrice) / 1000000;

    return {
      total: contracted + merchant,
      contracted,
      merchant,
      contractedPercentage: totalContractedPercentage
    };
  };

  const portfolioData = generatePortfolioData();

  // Rest of the component remains the same...
  
  // Process data based on visible assets
  const processedData = portfolioData.map(yearData => {
    const processedYearData = {
      year: yearData.year,
      total: 0,
      contracted: 0,
      merchant: 0,
      weightedContractedPercentage: 0,
      totalGeneration: 0
    };

    Object.entries(yearData.assets).forEach(([assetName, assetData]) => {
      if (visibleAssets[assetName]) {
        processedYearData.total += assetData.total;
        processedYearData.contracted += assetData.contracted;
        processedYearData.merchant += assetData.merchant;
        processedYearData.totalGeneration += parseFloat(assets[Object.keys(assets).find(key => 
          assets[key].name === assetName)].capacity) || 0;
        processedYearData[`${assetName} Total`] = assetData.total;
        processedYearData[`${assetName} Contracted`] = assetData.contracted;
        processedYearData[`${assetName} Merchant`] = assetData.merchant;
      }
    });

    processedYearData.weightedContractedPercentage = 
      processedYearData.totalGeneration > 0 
        ? (processedYearData.contracted / processedYearData.total) * 100 
        : 0;

    return processedYearData;
  });

  const toggleAsset = (assetName) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetName]: !prev[assetName]
    }));
  };

  const assetColors = {
    base: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'],
    light: ['#9996db', '#a3d9b6', '#ffd47f', '#ff9347', '#00D4AE']
  };

  const getAssetColor = (index) => ({
    base: assetColors.base[index % assetColors.base.length],
    light: assetColors.light[index % assetColors.light.length]
  });

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
                        dataKey={`${asset.name} Contracted`} 
                        stackId="a" 
                        fill={getAssetColor(index).base}
                        name={`${asset.name} Contracted`}
                      />
                      <Bar 
                        dataKey={`${asset.name} Merchant`} 
                        stackId="a" 
                        fill={getAssetColor(index).light}
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
                  dataKey="weightedContractedPercentage" 
                  stroke="#ff7300" 
                  name="Portfolio Contracted %"
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