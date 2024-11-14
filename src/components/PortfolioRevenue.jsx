import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceArea } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  generatePortfolioData, 
  processPortfolioData, 
} from './RevCalculations';

// Define a renewable-themed color palette
const assetColors = {
  asset1: { base: '#22C55E', faded: '#86EFAC' }, // vibrant green (solar)
  asset2: { base: '#0EA5E9', faded: '#7DD3FC' }, // bright blue (wind)
  asset3: { base: '#F97316', faded: '#FDBA74' }, // bright orange (biomass)
  asset4: { base: '#06B6D4', faded: '#67E8F9' }, // cyan (hydro)
  asset5: { base: '#EAB308', faded: '#FDE047' }  // yellow (solar thermal)
};

const roundNumber = (num) => Number(Number(num).toFixed(2));

const PortfolioDashboard = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [visibleAssets, setVisibleAssets] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  useEffect(() => {
    const newVisibleAssets = {};
    Object.values(assets).forEach(asset => {
      newVisibleAssets[asset.name] = true;
    });
    setVisibleAssets(newVisibleAssets);
    if (Object.keys(assets).length > 0 && !selectedAsset) {
      setSelectedAsset(Object.values(assets)[0].id.toString());
    }
  }, [assets, selectedAsset]);

  // Process data with rounding
  const portfolioData = generatePortfolioData(assets, constants, getMerchantPrice);
  const processedData = processPortfolioData(portfolioData, assets, visibleAssets).map(yearData => {
    const newData = { year: yearData.year }; // Start fresh with just the year
    
    // Round all numerical values
    Object.entries(yearData).forEach(([key, value]) => {
      if (typeof value === 'number') {
        newData[key] = roundNumber(value);
      } else {
        newData[key] = value;
      }
    });
    
    // Add combined contracted/merchant values for portfolio view
    Object.values(assets).forEach(asset => {
      if (visibleAssets[asset.name]) {
        newData[`${asset.name} Contracted`] = roundNumber(
          (yearData[`${asset.name} Contracted Black`] || 0) + 
          (yearData[`${asset.name} Contracted Green`] || 0)
        );
        newData[`${asset.name} Merchant`] = roundNumber(
          (yearData[`${asset.name} Merchant Black`] || 0) + 
          (yearData[`${asset.name} Merchant Green`] || 0)
        );
      }
    });

    return newData;
  });

  const toggleAsset = (assetName) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetName]: !prev[assetName]
    }));
  };

  // Custom tooltip formatter to ensure consistent decimal places
  const tooltipFormatter = (value, name) => [roundNumber(value), name];

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
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-9">
          <CardHeader>
            <CardTitle>Total Portfolio Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  {Object.values(assets).map((asset, index) => 
                    visibleAssets[asset.name] && (
                      <React.Fragment key={asset.id}>
                        <Bar 
                          dataKey={`${asset.name} Contracted`}
                          stackId="stack"
                          fill={Object.values(assetColors)[index % 5].base}
                          name={`${asset.name} Contracted`}
                        />
                        <Bar 
                          dataKey={`${asset.name} Merchant`}
                          stackId="stack"
                          fill={Object.values(assetColors)[index % 5].faded}
                          name={`${asset.name} Merchant`}
                        />
                      </React.Fragment>
                    )
                  )}
                  <ReferenceArea 
                    x1={constants.analysisStartYear} 
                    x2={constants.ForecastStartYear-1} 
                    fillOpacity={0.3}
                    fill="#808080"
                    strokeOpacity={0.3}
                    label={{
                      value: "Actuals\nWIP",
                      position: "center",
                      fontSize: 12,
                      fontWeight: "bold",
                      fill: "#000000"
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Asset Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(assets).map((asset, index) => (
                <div key={asset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={asset.id}
                    checked={visibleAssets[asset.name]}
                    onCheckedChange={() => toggleAsset(asset.name)}
                  />
                  <Label 
                    htmlFor={asset.id}
                    className="flex items-center space-x-2"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: Object.values(assetColors)[index % 5].base }}
                    />
                    <span>{asset.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Detail View</CardTitle>
          <Select 
            value={selectedAsset} 
            onValueChange={setSelectedAsset}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Asset" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(assets).map((asset) => (
                <SelectItem key={asset.id} value={asset.id.toString()}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                {/* Contracted Revenue Stack */}
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Contracted Black`} 
                  stackId="a"
                  fill="#171717"
                  name="Black Contracted"
                />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Contracted Green`} 
                  stackId="a"
                  fill="#16A34A"
                  name="Green Contracted"
                />
                {/* Merchant Revenue Stack */}
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Merchant Black`} 
                  stackId="a"
                  fill="#737373"
                  name="Black Merchant"
                />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Merchant Green`} 
                  stackId="a"
                  fill="#86EFAC"
                  name="Green Merchant"
                />
                <ReferenceArea 
                  x1={constants.analysisStartYear} 
                  x2={constants.ForecastStartYear-1}  
                  fillOpacity={0.3}
                  fill="#808080"
                  strokeOpacity={0.3}
                  label={{
                    value: "Actuals\nWIP",
                    position: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: "#000000"
                  }}
                />
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
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weightedGreenPercentage" 
                  stroke="#16A34A" 
                  name="Green Contracted %"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="weightedBlackPercentage" 
                  stroke="#171717" 
                  name="Black Contracted %"
                  strokeWidth={2}
                />
                <ReferenceArea 
                  x1={constants.analysisStartYear} 
                  x2={constants.ForecastStartYear-1} 
                  fillOpacity={0.3}
                  fill="#808080"
                  strokeOpacity={0.3}
                  label={{
                    value: "Actuals\nWIP",
                    position: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: "#000000"
                  }}
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