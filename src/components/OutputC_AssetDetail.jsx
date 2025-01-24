import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts';

const AssetDetailChart = ({
  assets,
  selectedAsset,
  setSelectedAsset,
  processedData,
  getMerchantPrice,
  intervalType,
  xAxisConfig,
  tooltipLabelFormatter,
  roundNumber,
}) => {
  const selectedAssetData = assets[selectedAsset];
  const isStorage = selectedAssetData?.type === 'storage';

  const processedDataWithPrices = useMemo(() => {
    return processedData.map(periodData => {
      if (!selectedAssetData) return periodData;

      if (isStorage) {
        const calculatedDuration = selectedAssetData.volume / selectedAssetData.capacity;
        const standardDurations = [0.5, 1, 2, 4];
        
        let lowerDuration = standardDurations[0];
        let upperDuration = standardDurations[standardDurations.length - 1];
        let interpolationRatio = 0.5;
        
        for (let i = 0; i < standardDurations.length - 1; i++) {
          if (calculatedDuration >= standardDurations[i] && calculatedDuration <= standardDurations[i + 1]) {
            lowerDuration = standardDurations[i];
            upperDuration = standardDurations[i + 1];
            interpolationRatio = (calculatedDuration - lowerDuration) / (upperDuration - lowerDuration);
            break;
          }
        }

        const lowerPrice = getMerchantPrice('storage', lowerDuration, selectedAssetData.state, periodData.timeInterval);
        const upperPrice = getMerchantPrice('storage', upperDuration, selectedAssetData.state, periodData.timeInterval);
        
        const merchantPriceSpread = (lowerPrice * (1 - interpolationRatio)) + (upperPrice * interpolationRatio);
        
        return {
          ...periodData,
          merchantPriceSpread: roundNumber(merchantPriceSpread)
        };
      } else {
        const merchantGreenPrice = getMerchantPrice(
          selectedAssetData.type, 
          'green', 
          selectedAssetData.state, 
          periodData.timeInterval
        );
        const merchantBlackPrice = getMerchantPrice(
          selectedAssetData.type, 
          'black', 
          selectedAssetData.state, 
          periodData.timeInterval
        );
        const bundledPrice = merchantGreenPrice + merchantBlackPrice;
        
        return {
          ...periodData,
          merchantGreenPrice: roundNumber(merchantGreenPrice),
          merchantBlackPrice: roundNumber(merchantBlackPrice),
          bundledPrice: roundNumber(bundledPrice)
        };
      }
    });
  }, [processedData, selectedAsset, assets, getMerchantPrice, roundNumber, isStorage, selectedAssetData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Asset Detail View</CardTitle>
        <Select 
          value={selectedAsset} 
          onValueChange={setSelectedAsset}
        >
          <SelectTrigger className="w-64 hover:bg-slate-50 border-slate-200 shadow-sm">
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
            <ComposedChart data={processedDataWithPrices}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timeInterval" {...xAxisConfig} />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                label={{ value: 'Price ($/MWh)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name.includes('Price')) {
                    return [`$${roundNumber(value)}/MWh`, name];
                  }
                  return [roundNumber(value), name];
                }}
                labelFormatter={tooltipLabelFormatter}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey={`${selectedAssetData?.name} Contracted Black`} 
                stackId="a"
                fill="#171717"
                name="Black Contracted"
                isAnimationActive={false}
              />
              {!isStorage && (
                <Bar 
                  yAxisId="left"
                  dataKey={`${selectedAssetData?.name} Contracted Green`} 
                  stackId="a"
                  fill="#16A34A"
                  name="Green Contracted"
                  isAnimationActive={false}
                />
              )}
              <Bar 
                yAxisId="left"
                dataKey={`${selectedAssetData?.name} Merchant Black`} 
                stackId="a"
                fill="#737373"
                name="Black Merchant"
                isAnimationActive={false}
              />
              {!isStorage && (
                <Bar 
                  yAxisId="left"
                  dataKey={`${selectedAssetData?.name} Merchant Green`} 
                  stackId="a"
                  fill="#86EFAC"
                  name="Green Merchant"
                  isAnimationActive={false}
                />
              )}
              {isStorage ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="merchantPriceSpread"
                  stroke="#171717"
                  strokeWidth={2}
                  name="Merchant Price Spread"
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="merchantGreenPrice"
                    stroke="#16A34A"
                    strokeWidth={2}
                    name="Merchant Green Price"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="merchantBlackPrice"
                    stroke="#171717"
                    strokeWidth={2}
                    name="Merchant Black Price"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bundledPrice"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Bundled Price"
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetDetailChart;