import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';

const PortfolioOverviewChart = ({
  assets,
  processedData,
  visibleAssets,
  setVisibleAssets,
  assetColors,
  intervalType,
  xAxisConfig,
  tooltipLabelFormatter,
  roundNumber,
}) => {
  const [viewMode, setViewMode] = useState('all');
  const [colorMode, setColorMode] = useState('all');

  const toggleAsset = (assetName) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetName]: !prev[assetName]
    }));
  };

  const renderBars = () => {
    return Object.values(assets).map((asset, index) => {
      if (!visibleAssets[asset.name]) return null;

      const bars = [];
      
      if (colorMode === 'all') {
        // Simplified view - combine Energy and green
        if (viewMode === 'all' || viewMode === 'contracted') {
          bars.push(
            <Bar 
              key={`${asset.id}-contracted`}
              yAxisId="left"
              dataKey={`${asset.name} Contracted`}
              stackId="stack"
              fill={Object.values(assetColors)[index % 5].base}
              name={`${asset.name} Contracted`}
              isAnimationActive={false}
            />
          );
        }
        if (viewMode === 'all' || viewMode === 'merchant') {
          bars.push(
            <Bar 
              key={`${asset.id}-merchant`}
              yAxisId="left"
              dataKey={`${asset.name} Merchant`}
              stackId="stack"
              fill={Object.values(assetColors)[index % 5].faded}
              name={`${asset.name} Merchant`}
              isAnimationActive={false}
            />
          );
        }
      } else {
        // Detailed view - separate Energy and green
        if ((viewMode === 'all' || viewMode === 'contracted')) {
          if (colorMode === 'Energy') {
            bars.push(
              <Bar 
                key={`${asset.id}-contracted-Energy`}
                yAxisId="left"
                dataKey={`${asset.name} Contracted Energy`}
                stackId="stack"
                fill={Object.values(assetColors)[index % 5].base}
                name={`${asset.name} Contracted Energy`}
                isAnimationActive={false}
              />
            );
          }
          if (colorMode === 'green') {
            bars.push(
              <Bar 
                key={`${asset.id}-contracted-green`}
                yAxisId="left"
                dataKey={`${asset.name} Contracted Green`}
                stackId="stack"
                fill={Object.values(assetColors)[index % 5].base}
                name={`${asset.name} Contracted Green`}
                isAnimationActive={false}
                opacity={0.7}
              />
            );
          }
        }

        if ((viewMode === 'all' || viewMode === 'merchant')) {
          if (colorMode === 'Energy') {
            bars.push(
              <Bar 
                key={`${asset.id}-merchant-Energy`}
                yAxisId="left"
                dataKey={`${asset.name} Merchant Energy`}
                stackId="stack"
                fill={Object.values(assetColors)[index % 5].faded}
                name={`${asset.name} Merchant Energy`}
                isAnimationActive={false}
              />
            );
          }
          if (colorMode === 'green') {
            bars.push(
              <Bar 
                key={`${asset.id}-merchant-green`}
                yAxisId="left"
                dataKey={`${asset.name} Merchant Green`}
                stackId="stack"
                fill={Object.values(assetColors)[index % 5].faded}
                name={`${asset.name} Merchant Green`}
                isAnimationActive={false}
                opacity={0.7}
              />
            );
          }
        }
      }

      return bars;
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{tooltipLabelFormatter(label)}</p>
          {payload.map((entry, index) => {
            let value = roundNumber(entry.value);
            // For 'all' colorMode, simplify the display names
            let displayName = entry.name;
            if (colorMode === 'all') {
              displayName = displayName.replace(' Energy', '').replace(' Green', '');
            }
            return (
              <p key={index} className="font-medium" style={{ color: entry.color }}>
                {`${displayName}: ${value}M`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle>Portfolio Revenue and Contract Percentage</CardTitle>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'all' ? "default" : "outline"}
                onClick={() => setViewMode('all')}
                className="w-24"
              >
                All
              </Button>
              <Button
                variant={viewMode === 'contracted' ? "default" : "outline"}
                onClick={() => setViewMode('contracted')}
                className="w-24"
              >
                Contracted
              </Button>
              <Button
                variant={viewMode === 'merchant' ? "default" : "outline"}
                onClick={() => setViewMode('merchant')}
                className="w-24"
              >
                Merchant
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={colorMode === 'all' ? "default" : "outline"}
                onClick={() => setColorMode('all')}
                className="w-24"
              >
                All
              </Button>
              <Button
                variant={colorMode === 'Energy' ? "default" : "outline"}
                onClick={() => setColorMode('Energy')}
                className="w-24"
              >
                Energy
              </Button>
              <Button
                variant={colorMode === 'green' ? "default" : "outline"}
                onClick={() => setColorMode('green')}
                className="w-24"
              >
                Green
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timeInterval" {...xAxisConfig} />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                label={{ value: 'Contracted (%)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {renderBars()}
              {(colorMode === 'all' || colorMode === 'green') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="weightedGreenPercentage" 
                  stroke="#16A34A" 
                  name="Green Contracted %"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              )}
              {(colorMode === 'all' || colorMode === 'Energy') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="weightedEnergyPercentage" 
                  stroke="#171717" 
                  name="Energy Contracted %"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="border-t pt-6">
          <div className="flex flex-wrap justify-center gap-6">
            {Object.values(assets).map((asset, index) => (
              <div key={asset.id} className="flex items-center gap-2">
                <Checkbox
                  id={`asset-${asset.id}`}
                  checked={visibleAssets[asset.name]}
                  onCheckedChange={() => toggleAsset(asset.name)}
                />
                <Label 
                  htmlFor={`asset-${asset.id}`}
                  className="flex items-center gap-2 whitespace-nowrap"
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioOverviewChart;
