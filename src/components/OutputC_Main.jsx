// OutputC_Main.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePortfolio } from '@/contexts/PortfolioContext';
import { generatePortfolioData, processPortfolioData } from './RevCalculations';
import PortfolioOverviewChart from './OutputC_Portfolio';
import AssetDetailChart from './OutputC_AssetDetail';

// Shared utilities and constants
const assetColors = {
  asset1: { base: '#22C55E', faded: '#86EFAC' },
  asset2: { base: '#0EA5E9', faded: '#7DD3FC' },
  asset3: { base: '#F97316', faded: '#FDBA74' },
  asset4: { base: '#06B6D4', faded: '#67E8F9' },
  asset5: { base: '#EAB308', faded: '#FDE047' }
};

const roundNumber = (num) => Number(Number(num).toFixed(2));

const generateTimeIntervals = (intervalType) => {
  const intervals = [];
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + 35;
  
  for (let year = currentYear; year <= endYear; year++) {
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

const getXAxisConfig = (intervalType) => ({
  tickFormatter: (value) => {
    if (intervalType === 'yearly') return value;
    if (intervalType === 'quarterly') {
      const [yearPart, quarter] = value.split('-');
      return quarter === 'Q1' ? yearPart : '';
    }
    if (intervalType === 'monthly') {
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
  const [intervalType, setIntervalType] = useState('yearly');
  const [visibleAssets, setVisibleAssets] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);

  const timeIntervals = useMemo(() => 
    generateTimeIntervals(intervalType),
    [intervalType]
  );

  const portfolioData = useMemo(() => 
    generatePortfolioData(assets, timeIntervals, constants, getMerchantPrice),
    [assets, timeIntervals, constants, getMerchantPrice]
  );

  const processedData = useMemo(() => {
    const rawData = processPortfolioData(portfolioData, assets, visibleAssets);
    return rawData.map(periodData => {
      const newData = { timeInterval: periodData.timeInterval };
      
      Object.entries(periodData).forEach(([key, value]) => {
        if (typeof value === 'number') {
          newData[key] = roundNumber(value);
        } else {
          newData[key] = value;
        }
      });
      
      Object.values(assets).forEach(asset => {
        if (visibleAssets[asset.name]) {
          newData[`${asset.name} Contracted`] = roundNumber(
            (periodData[`${asset.name} Contracted Energy`] || 0) + 
            (periodData[`${asset.name} Contracted Green`] || 0)
          );
          newData[`${asset.name} Merchant`] = roundNumber(
            (periodData[`${asset.name} Merchant Energy`] || 0) + 
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

  const sharedChartProps = {
    intervalType,
    xAxisConfig: getXAxisConfig(intervalType),
    tooltipLabelFormatter: getTooltipFormatter(intervalType),
    roundNumber,
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="interval-select" className="whitespace-nowrap">
              Chart Interval
            </Label>
            <Select 
              value={intervalType} 
              onValueChange={setIntervalType}
            >
              <SelectTrigger id="interval-select" className="w-48">
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

      <PortfolioOverviewChart
        {...sharedChartProps}
        assets={assets}
        processedData={processedData}
        visibleAssets={visibleAssets}
        setVisibleAssets={setVisibleAssets}
        assetColors={assetColors}
      />

      <AssetDetailChart
        {...sharedChartProps}
        assets={assets}
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        processedData={processedData}
        getMerchantPrice={getMerchantPrice}
      />
    </div>
  );
};

export default PortfolioDashboard;