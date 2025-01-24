import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMerchantPrices } from '../contexts/MerchantPriceProvider';
import { calculateStorageRevenue } from '@/components/StorageRevCalculations';

const TestDashboard = () => {
  const { getMerchantPrice } = useMerchantPrices();
  const [selectedRegion, setSelectedRegion] = useState('NSW');
  const [selectedDuration, setSelectedDuration] = useState('2');
  const [spreadData, setSpreadData] = useState([]);
  const [revenueExample, setRevenueExample] = useState(null);
  const [currentSpread, setCurrentSpread] = useState(0);

  const getExampleAsset = (duration) => ({
    volume: (parseFloat(duration) * 100).toString(),
    capacity: "100",
    volumeLossAdjustment: "95",
    annualDegradation: "0.5",
    region: selectedRegion,
    assetStartDate: '2025-01-01',
    contracts: []
  });

  useEffect(() => {
    const currentSpreadValue = getMerchantPrice('storage', parseFloat(selectedDuration), selectedRegion, 2025);
    setCurrentSpread(currentSpreadValue);

    const years = Array.from({length: 21}, (_, i) => 2025 + i);
    const asset = getExampleAsset(selectedDuration);
    
    const newSpreadData = years.map(year => {
      const spread = getMerchantPrice('storage', parseFloat(selectedDuration), selectedRegion, year);
      const revenue = calculateStorageRevenue(
        asset,
        year.toString(),
        year,
        2025,
        (profile, type, region, y) => getMerchantPrice('storage', parseFloat(selectedDuration), region, y)
      );
      return {
        year,
        spread,
        revenue: revenue.total,
        generation: revenue.annualGeneration
      };
    });
    setSpreadData(newSpreadData);

    const revenue = calculateStorageRevenue(
      asset,
      '2025',
      2025,
      2025,
      (profile, type, region, year) => getMerchantPrice('storage', parseFloat(selectedDuration), region, year)
    );
    setRevenueExample(revenue);
  }, [selectedRegion, selectedDuration, getMerchantPrice]);

  const currentAsset = getExampleAsset(selectedDuration);
  const volumeMWh = parseInt(currentAsset.capacity) * parseFloat(selectedDuration);
  const cycles = 365;
  const theoreticalRevenue = revenueExample ? (volumeMWh * cycles * currentSpread * (parseInt(currentAsset.volumeLossAdjustment)/100)) / 1000000 : 0;

  if (!revenueExample) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Battery Storage Merchant Spread Analysis - {selectedRegion}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="w-48">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {['NSW', 'VIC', 'QLD', 'SA'].map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Duration" />
                </SelectTrigger>
                <SelectContent>
                  {[0.5, 1, 2, 4].map(hours => (
                    <SelectItem key={hours} value={hours.toString()}>{hours} Hour</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spreadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Spread ($/MWh)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="spread" 
                  stroke="#8884d8" 
                  name={`${selectedDuration}hr Battery Spread`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Calculation for {selectedDuration}hr Battery in {selectedRegion} (2025)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Asset Parameters:</h3>
              <p>Power Capacity: {currentAsset.capacity} MW</p>
              <p>Duration: {selectedDuration} hours</p>
              <p>Energy Volume: {volumeMWh} MWh</p>
              <p>Annual Cycles: {cycles}</p>
              <p>Volume Loss: {currentAsset.volumeLossAdjustment}%</p>
              <p>Annual Degradation: {currentAsset.annualDegradation}%</p>
              <p>Current Spread: ${currentSpread}/MWh</p>
              <div className="mt-4">
                <h4 className="font-semibold">Merchant Revenue Over Time:</h4>
                {spreadData.slice(0, 5).map(yearData => (
                  <p key={yearData.year} className="text-sm">
                    {yearData.year}: ${yearData.revenue.toFixed(2)}M @ ${yearData.spread}/MWh ({(yearData.generation/1000).toFixed(1)}k MWh)
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Calculated Revenue:</h3>
              <p>Simple Revenue: ${theoreticalRevenue.toFixed(2)}M</p>
              <p className="text-sm text-gray-500">
                {volumeMWh} MWh × {cycles} cycles × ${currentSpread}/MWh × {currentAsset.volumeLossAdjustment}% ÷ 1,000,000
              </p>
              <div className="mt-4">
                <p>Model Revenue: ${revenueExample.total.toFixed(2)}M</p>
                <p>Annual Generation: {revenueExample.annualGeneration.toFixed(2)} MWh</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projected Annual Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spreadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Revenue ($M)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}M`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#82ca9d" 
                  name={`${selectedDuration}hr Battery Revenue`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDashboard;