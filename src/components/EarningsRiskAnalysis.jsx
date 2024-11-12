import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { generateScenarios, createHistogramData, calculateStatistics } from './earningsRisk';
import StressTestAnalysis from './StressTestAnalysis';
import { calculateAssetRevenue } from './portfolioUtils.jsx';

const EarningsRiskAnalysis = () => {
  const { assets, constants, updateConstants, getMerchantPrice } = usePortfolio();
  const [selectedYear, setSelectedYear] = useState(constants.analysisStartYear);
  const hasAssets = useMemo(() => Object.keys(assets || {}).length > 0, [assets]);
  const calculateStressScenario = (assets, year, constants, getMerchantPrice, volumeChange, greenPriceChange, blackPriceChange) => {
    if (!assets || Object.keys(assets).length === 0) return 0;
    
    return Object.values(assets).reduce((total, asset) => {
      const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
      const contractedGreen = baseRevenue.contractedGreen * (1 + volumeChange/100);
      const contractedBlack = baseRevenue.contractedBlack * (1 + volumeChange/100);
      const merchantGreen = baseRevenue.merchantGreen * (1 + volumeChange/100) * (1 + greenPriceChange/100);
      const merchantBlack = baseRevenue.merchantBlack * (1 + volumeChange/100) * (1 + blackPriceChange/100);
      return total + contractedGreen + contractedBlack + merchantGreen + merchantBlack;
    }, 0);
  };
  // Use the new external calculations
  const scenarios = useMemo(() => 
    generateScenarios(assets, constants, getMerchantPrice), 
    [assets, constants, getMerchantPrice]
  );

  const histogramData = useMemo(() => 
    createHistogramData(scenarios, selectedYear),
    [scenarios, selectedYear]
  );

  const stats = useMemo(() => 
    calculateStatistics(scenarios, selectedYear, assets, constants, getMerchantPrice),
    [scenarios, selectedYear, assets, constants, getMerchantPrice]
  );

  const waterfallData = useMemo(() => {
    if (!hasAssets) return [];
    
    const years = Array.from(
      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
      (_, i) => constants.analysisStartYear + i
    );
  
    return years.map(year => {
      const baseStats = calculateStatistics(scenarios, year, assets, constants, getMerchantPrice);
      const volumeVar = constants.volumeVariation || 0;
      const greenVar = constants.greenPriceVariation || constants.priceVariation || 0;
      const blackVar = constants.blackPriceVariation || constants.priceVariation || 0;
  
      return {
        year,
        ...baseStats,
        worstCase: calculateStressScenario(
          assets, year, constants, getMerchantPrice,
          -volumeVar, -greenVar, -blackVar
        ),
        volumeStress: calculateStressScenario(
          assets, year, constants, getMerchantPrice,
          -volumeVar, 0, 0
        ),
        priceStress: calculateStressScenario(
          assets, year, constants, getMerchantPrice,
          0, -greenVar, -blackVar
        )
      };
    });
  }, [scenarios, assets, constants, getMerchantPrice, hasAssets]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-72 text-gray-500">
      <p className="text-lg font-medium">No Assets Available</p>
      <p className="text-sm">Add assets to view risk analysis</p>
    </div>
  );


  
  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-2 gap-6">
        <Card>

        <Card className="w-full max-w-3xl">
      <CardHeader className="pb-4">
        <CardTitle>Analysis Input Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="font-medium text-sm mb-3">Assumptions</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">
                Volume Sensitivity (±%)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={constants.volumeVariation ?? 20}
                  min={0}
                  onChange={(e) => updateConstants?.('volumeVariation', parseInt(e.target.value) || 0)}
                  className="h-9 w-24"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">
                Green Price Sensitivity (±%)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={constants.greenPriceVariation ?? 20}
                  min={0}
                  onChange={(e) => updateConstants?.('greenPriceVariation', parseInt(e.target.value) || 0)}
                  className="h-9 w-24"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">
                Black Price Sensitivity (±%)
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={constants.blackPriceVariation ?? 20}
                  min={0}
                  onChange={(e) => updateConstants?.('blackPriceVariation', parseInt(e.target.value) || 0)}
                  className="h-9 w-24"
                />
              </div>
            </div>
            <ul className="text-sm space-y-1.5 text-gray-600 mt-4">
              <li>Merchant revenue affected by both volume and price risks</li>
              <li>Green and black prices vary independently</li>
              <li>PPA revenue affected by volume risk only</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAssets ? (
              <>
                <div className="mb-4">
                  <select
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {Array.from(
                      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
                      (_, i) => constants.analysisStartYear + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="revenue" 
                        label={{ value: 'Revenue (Million $)', position: 'bottom' }}
                      />
                      <YAxis 
                        label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        formatter={(value, name, props) => [
                          `Count: ${value}`,
                          `Range: $${props.payload.binStart}M - $${props.payload.binEnd}M`
                        ]}
                      />
                      <Bar dataKey="frequency" fill="#8884d8" name="Scenarios" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : <EmptyState />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAssets ? (
              <div className="space-y-4">
                {/* Monte Carlo Metrics */}
                <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Base Case</div>
                <div className="text-base font-semibold">$371.5M</div>
                <div className="text-xs text-gray-400">P50: $370.5M</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Range</div>
                <div className="text-base font-semibold">$63.3M</div>
                <div className="text-xs text-gray-400">17% spread</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">P90</div>
              <div className="text-base font-semibold">$339.4M</div>
              <div className="text-xs text-red-500">-8.6%</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-xs text-gray-500">P10</div>
              <div className="text-base font-semibold">$402.7M</div>
              <div className="text-xs text-green-500">+8.4%</div>
            </div>
          </div>
                <StressTestAnalysis assets={assets} constants={constants} getMerchantPrice={getMerchantPrice} selectedYear={selectedYear} />
              </div>

            
            ) : <EmptyState />}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Revenue Range Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAssets ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterfallData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="p90" stroke="#ff7300" name="P90" dot={false} strokeWidth={2} />
                  <Line dataKey="baseCase" stroke="#8884d8" name="Base Case" dot={false} strokeWidth={2} />
                  <Line dataKey="p10" stroke="#82ca9d" name="P10" dot={false} strokeWidth={2} />
                  <Line dataKey="worstCase" stroke="#ff0000" name="Worst Case" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                  <Line dataKey="volumeStress" stroke="#FFA500" name="Volume Stress" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                  <Line dataKey="priceStress" stroke="#800080" name="Price Stress" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsRiskAnalysis;

