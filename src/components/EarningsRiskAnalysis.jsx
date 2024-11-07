import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';

const EarningsRiskAnalysis = () => {
  const { assets, constants, updateConstants } = usePortfolio();
  const hasAssets = useMemo(() => Object.keys(assets || {}).length > 0, [assets]);

  const calculateBaseRevenue = (asset, year) => {
    const annualGeneration = asset.capacity * asset.volumeLossAdjustment / 100 * constants.HOURS_IN_YEAR * 
      constants.capacityFactors[asset.type][asset.state];

    // Calculate PPA Revenue
    const ppaRevenue = asset.contracts.reduce((total, ppa) => {
      const startYear = new Date(ppa.startDate).getFullYear();
      const endYear = new Date(ppa.endDate).getFullYear();
      
      if (year >= startYear && year <= endYear) {
        const yearsSinceStart = year - startYear;
        const indexationFactor = Math.pow(1 + ppa.indexation / 100, yearsSinceStart);
        const ppaVolume = annualGeneration * (ppa.buyersPercentage / 100);
        let ppaPrice;
        
        if (ppa.type === 'bundled') {
          ppaPrice = (parseFloat(ppa.greenPrice) + parseFloat(ppa.blackPrice)) * indexationFactor;
        } else {
          ppaPrice = parseFloat(ppa.strikePrice) * indexationFactor;
        }
        
        return total + (ppaVolume * ppaPrice);
      }
      return total;
    }, 0);

    // Calculate Merchant Revenue
    const contractedPercentage = asset.contracts.reduce((sum, contract) => {
      const startYear = new Date(contract.startDate).getFullYear();
      const endYear = new Date(contract.endDate).getFullYear();
      if (year >= startYear && year <= endYear) {
        return sum + parseFloat(contract.buyersPercentage);
      }
      return sum;
    }, 0);

    const merchantPercentage = (100 - contractedPercentage) / 100;
    const merchantVolume = annualGeneration * merchantPercentage;
    const yearsSinceStart = year - constants.analysisStartYear;
    const merchantPricing = constants.merchantPrices[asset.state];
    const escalatedPrice = (merchantPricing.black + merchantPricing.green) * 
      Math.pow(1 + merchantPricing.escalation / 100, yearsSinceStart);
    const merchantRevenue = merchantVolume * escalatedPrice;

    return {
      ppaRevenue,
      merchantRevenue,
      totalRevenue: ppaRevenue + merchantRevenue
    };
  };

  const generateScenarios = () => {
    if (!hasAssets) return [];
    
    const numScenarios = 1000;
    const scenarios = [];

    for (let i = 0; i < numScenarios; i++) {
      const volumeChange = (Math.random() * 2 - 1) * constants.volumeVariation;
      const priceChange = (Math.random() * 2 - 1) * constants.priceVariation;
      
      Object.values(assets).forEach(asset => {
        for (let year = constants.analysisStartYear; year <= constants.analysisEndYear; year++) {
          const base = calculateBaseRevenue(asset, year);
          
          const adjustedPPARevenue = base.ppaRevenue * (1 + volumeChange/100);
          const adjustedMerchantRevenue = base.merchantRevenue * 
            (1 + volumeChange/100) * (1 + priceChange/100);
          
          const scenarioRevenue = adjustedPPARevenue + adjustedMerchantRevenue;

          scenarios.push({
            asset: asset.name,
            year,
            volumeChange,
            priceChange,
            revenue: scenarioRevenue / 1000000
          });
        }
      });
    }

    return scenarios;
  };

  const scenarios = useMemo(() => generateScenarios(), [assets, constants, hasAssets]);

  const createHistogramData = (data, year) => {
    if (!data.length) return [];
    
    const yearData = data.filter(s => s.year === year);
    const revenues = yearData.map(s => s.revenue);
    const min = Math.min(...revenues);
    const max = Math.max(...revenues);
    const binCount = 20;
    const binWidth = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0);
    revenues.forEach(rev => {
      const binIndex = Math.min(Math.floor((rev - min) / binWidth), binCount - 1);
      bins[binIndex]++;
    });

    return Array(binCount).fill(0).map((_, index) => ({
      revenue: (min + (index + 0.5) * binWidth).toFixed(1),
      frequency: bins[index],
      binStart: (min + index * binWidth).toFixed(1),
      binEnd: (min + (index + 1) * binWidth).toFixed(1)
    }));
  };

  const calculateStatistics = (data, year) => {
    if (!data.length) {
      return {
        baseCase: 0,
        p90: 0,
        p50: 0,
        p10: 0,
        min: 0,
        max: 0
      };
    }

    const yearData = data.filter(s => s.year === year);
    const revenues = yearData.map(s => s.revenue).sort((a, b) => a - b);
    const baseCase = Object.values(assets).reduce((sum, asset) => {
      const baseRev = calculateBaseRevenue(asset, year);
      return sum + baseRev.totalRevenue / 1000000;
    }, 0);

    return {
      baseCase: baseCase,
      p90: revenues[Math.floor(revenues.length * 0.1)] || 0,
      p50: revenues[Math.floor(revenues.length * 0.5)] || 0,
      p10: revenues[Math.floor(revenues.length * 0.9)] || 0,
      min: revenues[0] || 0,
      max: revenues[revenues.length - 1] || 0
    };
  };

  const histogramData = useMemo(() => 
    createHistogramData(scenarios, constants.analysisStartYear),
    [scenarios, constants.analysisStartYear]
  );

  const stats = useMemo(() => 
    calculateStatistics(scenarios, constants.analysisStartYear),
    [scenarios, constants.analysisStartYear]
  );

  const waterfallData = useMemo(() => {
    const years = Array.from(
      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
      (_, i) => constants.analysisStartYear + i
    );

    return years.map(year => ({
      year,
      ...calculateStatistics(scenarios, year)
    }));
  }, [scenarios]);

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
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAssets ? (
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
            ) : <EmptyState />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAssets ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Base Case Revenue</p>
                    <p className="text-2xl font-bold">${stats.baseCase.toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">P50 Revenue</p>
                    <p className="text-2xl font-bold">${stats.p50.toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">P90 Revenue</p>
                    <p className="text-2xl font-bold">${stats.p90.toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">P10 Revenue</p>
                    <p className="text-2xl font-bold">${stats.p10.toFixed(1)}M</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Assumptions</p>
                  <ul className="text-sm space-y-1">
                    <li>Volume Sensitivity: ±{constants.volumeVariation}%</li>
                    <li>Price Sensitivity: ±{constants.priceVariation}%</li>
                    <li>Merchant revenue affected by both volume and price risk</li>
                    <li>PPA revenue affected by volume risk only</li>
                  </ul>
                </div>
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
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Risk Analysis Period
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Start Year</div>
                  <Input
                    type="number"
                    value={constants.analysisStartYear || 2024}
                    onChange={(e) => updateConstants('analysisStartYear', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">End Year</div>
                  <Input
                    type="number"
                    value={constants.analysisEndYear || 2030}
                    onChange={(e) => updateConstants('analysisEndYear', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Monte Carlo Simulation
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Volume Variation (%)</div>
                  <Input
                    type="number"
                    value={constants.volumeVariation || 20}
                    onChange={(e) => updateConstants('volumeVariation', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Price Variation (%)</div>
                  <Input
                    type="number"
                    value={constants.priceVariation || 30}
                    onChange={(e) => updateConstants('priceVariation', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsRiskAnalysis;