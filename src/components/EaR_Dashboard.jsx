import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Input } from '@/components/ui/input';
import StressTestAnalysis from './EaR_StressTestAnalysis';
import { createHistogramData } from './EaR_calculation';

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-72 text-gray-500">
    <p className="text-lg font-medium">No Assets Available</p>
    <p className="text-sm">Add assets to view risk analysis</p>
  </div>
);

const ParameterInput = ({ label, value, onChange, min = 0 }) => (
  <div>
    <label className="text-sm text-gray-500 block">
      {label}
    </label>
    <Input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="h-8 w-24"
    />
  </div>
);

const MetricCard = ({ label, value, subValue, subValueColor }) => (
  <div className="bg-gray-50 p-3 rounded">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-base font-semibold">${value.toFixed(1)}M</div>
    <div className={`text-xs ${subValueColor || 'text-gray-400'}`}>{subValue}</div>
  </div>
);

const YearSelector = ({ selectedYear, onChange, startYear, endYear }) => (
  <div className="mb-4 flex items-center gap-3">
    <label className="text-sm text-gray-500 whitespace-nowrap">Year</label>
    <select
      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      value={selectedYear}
      onChange={(e) => onChange(parseInt(e.target.value))}
    >
      {Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
      ).map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  </div>
);

const EarningsRiskAnalysis = () => {
  const { assets, constants, updateConstants, getMerchantPrice } = usePortfolio();
  const [selectedYear, setSelectedYear] = useState(constants.analysisStartYear);
  const hasAssets = Object.keys(assets || {}).length > 0;
  
  // Get all calculations from StressTestAnalysis
  const analysisResults = StressTestAnalysis({ 
    assets, 
    constants, 
    getMerchantPrice, 
    selectedYear 
  });

  if (!hasAssets) return <EmptyState />;
  if (!analysisResults) return null;

  const { metrics, histogramData, waterfallData, StressTestResults } = analysisResults;

  return (
    <div className="space-y-6 p-4">
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Analysis Input Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-start gap-6">
            <div className="flex gap-6">
              <ParameterInput
                label="Volume Sensitivity (±%)"
                value={constants.volumeVariation}
                onChange={(value) => updateConstants('volumeVariation', value)}
              />
              <ParameterInput
                label="Black Price Sensitivity (±%)"
                value={constants.blackPriceVariation}
                onChange={(value) => updateConstants('blackPriceVariation', value)}
              />
              <ParameterInput
                label="Green Price Sensitivity (±%)"
                value={constants.greenPriceVariation}
                onChange={(value) => updateConstants('greenPriceVariation', value)}
              />
            </div>
            <ul className="text-xs space-y-1 text-gray-600 min-w-64">
              <li>• Merchant revenue affected by both volume and price risks</li>
              <li>• Green and black prices vary independently</li>
              <li>• PPA revenue affected by volume risk only</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Output Risk Metrics ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Base Case"
                    value={metrics.baseCase}
                    subValue={`P50: $${metrics.p50.toFixed(1)}M`}
                  />
                  <MetricCard
                    label="P10"
                    value={metrics.p10}
                    subValue={`+${metrics.p10Percent}%`}
                    subValueColor="text-green-500"
                  />
                </div>
                <MetricCard
                  label="P90"
                  value={metrics.p90}
                  subValue={`${metrics.p90Percent}%`}
                  subValueColor="text-red-500"
                />
                <MetricCard
                  label="Range"
                  value={metrics.range}
                  subValue={`${metrics.rangePercent}% spread`}
                />
              </div>
              <StressTestResults />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <YearSelector
              selectedYear={selectedYear}
              onChange={setSelectedYear}
              startYear={constants.ForecastStartYear}
              endYear={constants.analysisEndYear}
            />
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData} margin={{ top: 5, right: 20, left: 20, bottom: 35 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="revenue" 
                    label={{ value: 'Revenue ($M) bin', position: 'bottom', offset: 20 }}
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Revenue Range Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => value.toFixed(1)}/>
                <Legend />
                <Line dataKey="p90" stroke="#ff7300" name="P90" dot={false} strokeWidth={2} />
                <Line dataKey="baseCase" stroke="#8884d8" name="Base Case" dot={false} strokeWidth={2} />
                <Line dataKey="p10" stroke="#82ca9d" name="P10" dot={false} strokeWidth={2} />
                <Line dataKey="worstCase" stroke="#ff0000" name="Worst Case" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                <Line dataKey="volumeStress" stroke="#FFA500" name="Volume Stress" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                <Line dataKey="priceStress" stroke="#800080" name="Price Stress" dot={false} strokeWidth={2} strokeDasharray="5 5" />
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

export default EarningsRiskAnalysis;