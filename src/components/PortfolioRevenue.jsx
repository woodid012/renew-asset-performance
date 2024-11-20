import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  asset1: { base: '#22C55E', faded: '#86EFAC' },
  asset2: { base: '#0EA5E9', faded: '#7DD3FC' },
  asset3: { base: '#F97316', faded: '#FDBA74' },
  asset4: { base: '#06B6D4', faded: '#67E8F9' },
  asset5: { base: '#EAB308', faded: '#FDE047' }
};

const roundNumber = (num) => Number(Number(num).toFixed(2));

// Generate time intervals based on start and end years
const generateTimeIntervals = (startYear, endYear, intervalType) => {
  const intervals = [];
  for (let year = startYear; year <= endYear; year++) {
    if (intervalType === 'yearly') {
      intervals.push(year.toString());
    } else if (intervalType === 'quarterly') {
      for (let quarter = 1; quarter <= 4; quarter++) {
        intervals.push(`${year}-Q${quarter}`);
      }
    } else if (intervalType === 'monthly') {
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        intervals.push(`${monthStr}/01/${year}`);
      }
    }
  }
  return intervals;
};

// Shared X-axis configuration
const getXAxisConfig = (intervalType) => ({
  tickFormatter: (value) => {
    if (intervalType === 'yearly') {
      return value;
    } else if (intervalType === 'quarterly') {
      const [yearPart, quarter] = value.split('-');
      return quarter === 'Q1' ? yearPart : '';
    } else if (intervalType === 'monthly') {
      const [month] = value.split('/');
      return month === '01' ? value.split('/')[2] : '';
    }
  },
  interval: 0,
  axisLine: { strokeWidth: 2 },
  tick: { fontSize: 12 },
  tickLine: { strokeWidth: 2 },
  minorTick: true,
  minorTickSize: 4,
  minorTickLine: { strokeWidth: 1 },
  dy: 10
});

// Shared tooltip formatter
const getTooltipFormatter = (intervalType) => (label) => {
  if (intervalType === 'quarterly') {
    const [year, quarter] = label.split('-');
    return `${quarter} ${year}`;
  }
  if (intervalType === 'monthly') {
    const [month, , year] = label.split('/');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  return `Year ${label}`;
};

const PortfolioDashboard = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [visibleAssets, setVisibleAssets] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [intervalType, setIntervalType] = useState('yearly');

  // Generate time intervals based on selected type
  const timeIntervals = useMemo(() => 
    generateTimeIntervals(
      constants.analysisStartYear, 
      constants.analysisEndYear, 
      intervalType
    ),
    [constants.analysisStartYear, constants.analysisEndYear, intervalType]
  );

  // Pre-calculate portfolio data using useMemo
  const portfolioData = useMemo(() => 
    generatePortfolioData(assets, timeIntervals, constants, getMerchantPrice),
    [assets, timeIntervals, constants, getMerchantPrice]
  );

  // Pre-calculate processed data with useMemo
  const processedData = useMemo(() => {
    const rawData = processPortfolioData(portfolioData, assets, visibleAssets);
    return rawData.map(periodData => {
      const newData = { timeInterval: periodData.timeInterval };
      
      // Round all numerical values
      Object.entries(periodData).forEach(([key, value]) => {
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
            (periodData[`${asset.name} Contracted Black`] || 0) + 
            (periodData[`${asset.name} Contracted Green`] || 0)
          );
          newData[`${asset.name} Merchant`] = roundNumber(
            (periodData[`${asset.name} Merchant Black`] || 0) + 
            (periodData[`${asset.name} Merchant Green`] || 0)
          );
        }
      });

      return newData;
    });
  }, [portfolioData, assets, visibleAssets]);

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

  const xAxisConfig = getXAxisConfig(intervalType);
  const tooltipLabelFormatter = getTooltipFormatter(intervalType);

  return (
    <div className="space-y-6 p-4">
      {/* Interval Selection at the top */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-end">
            <Select 
              value={intervalType} 
              onValueChange={setIntervalType}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                  <XAxis dataKey="timeInterval" {...xAxisConfig} />
                  <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={tooltipFormatter}
                    labelFormatter={tooltipLabelFormatter}
                  />
                  <Legend />
                  {Object.values(assets).map((asset, index) => 
                    visibleAssets[asset.name] && (
                      <React.Fragment key={asset.id}>
                        <Bar 
                          dataKey={`${asset.name} Contracted`}
                          stackId="stack"
                          fill={Object.values(assetColors)[index % 5].base}
                          name={`${asset.name} Contracted`}
                          isAnimationActive={false}
                        />
                        <Bar 
                          dataKey={`${asset.name} Merchant`}
                          stackId="stack"
                          fill={Object.values(assetColors)[index % 5].faded}
                          name={`${asset.name} Merchant`}
                          isAnimationActive={false}
                        />
                      </React.Fragment>
                    )
                  )}
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
                <XAxis dataKey="timeInterval" {...xAxisConfig} />
                <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={tooltipFormatter}
                  labelFormatter={tooltipLabelFormatter}
                />
                <Legend />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Contracted Black`} 
                  stackId="a"
                  fill="#171717"
                  name="Black Contracted"
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Contracted Green`} 
                  stackId="a"
                  fill="#16A34A"
                  name="Green Contracted"
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Merchant Black`} 
                  stackId="a"
                  fill="#737373"
                  name="Black Merchant"
                  isAnimationActive={false}
                />
                <Bar 
                  dataKey={`${assets[selectedAsset]?.name} Merchant Green`} 
                  stackId="a"
                  fill="#86EFAC"
                  name="Green Merchant"
                  isAnimationActive={false}
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
                <XAxis dataKey="timeInterval" {...xAxisConfig} />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Contracted (%)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  formatter={tooltipFormatter}
                  labelFormatter={tooltipLabelFormatter}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weightedGreenPercentage" 
                  stroke="#16A34A" 
                  name="Green Contracted %"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="weightedBlackPercentage" 
                  stroke="#171717" 
                  name="Black Contracted %"
                  strokeWidth={2}
                  isAnimationActive={false}
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