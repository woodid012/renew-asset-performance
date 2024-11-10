import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PriceChart = () => {
  const { constants } = usePortfolio();
  const [selectedRegion, setSelectedRegion] = useState('NSW');
  const [chartData, setChartData] = useState([]);
  const [yAxisDomain, setYAxisDomain] = useState([0, 100]);

  const states = ['NSW', 'QLD', 'SA', 'VIC'];
  const years = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => constants.analysisStartYear + i
  );

  useEffect(() => {
    // Find the maximum price across all regions and profiles
    let maxPrice = 0;
    states.forEach(region => {
      years.forEach(year => {
        // Check baseload black prices
        const baseloadPrice = constants.merchantPrices?.baseload?.black?.[region]?.[year];
        if (baseloadPrice) maxPrice = Math.max(maxPrice, baseloadPrice);
        
        // Check solar black prices
        const solarPrice = constants.merchantPrices?.solar?.black?.[region]?.[year];
        if (solarPrice) maxPrice = Math.max(maxPrice, solarPrice);
        
        // Check wind black prices
        const windPrice = constants.merchantPrices?.wind?.black?.[region]?.[year];
        if (windPrice) maxPrice = Math.max(maxPrice, windPrice);
        
        // Check green certificate prices
        const greenPrice = constants.merchantPrices?.solar?.green?.[region]?.[year];
        if (greenPrice) maxPrice = Math.max(maxPrice, greenPrice);
      });
    });

    // Round up to nearest 50 for a clean max value
    const roundedMax = Math.ceil(maxPrice / 50) * 50;
    setYAxisDomain([0, roundedMax]);

    // Create chart data for selected region
    const data = years.map(year => {
      const dataPoint = { year };
      
      // Add black energy prices for each profile
      if (constants.merchantPrices?.baseload?.black?.[selectedRegion]?.[year]) {
        dataPoint.baseloadBlack = constants.merchantPrices.baseload.black[selectedRegion][year];
      }
      if (constants.merchantPrices?.solar?.black?.[selectedRegion]?.[year]) {
        dataPoint.solarBlack = constants.merchantPrices.solar.black[selectedRegion][year];
      }
      if (constants.merchantPrices?.wind?.black?.[selectedRegion]?.[year]) {
        dataPoint.windBlack = constants.merchantPrices.wind.black[selectedRegion][year];
      }
      
      // Add green certificate price (same for all profiles, so just take one)
      if (constants.merchantPrices?.solar?.green?.[selectedRegion]?.[year]) {
        dataPoint.green = constants.merchantPrices.solar.green[selectedRegion][year];
      }
      
      return dataPoint;
    });
    
    setChartData(data);
  }, [selectedRegion, constants.merchantPrices, years]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{`Year: ${label}`}</p>
          {payload.map((entry, index) => {
            let name = entry.dataKey;
            if (name === 'baseloadBlack') name = 'Baseload';
            if (name === 'solarBlack') name = 'Solar';
            if (name === 'windBlack') name = 'Wind';
            if (name === 'green') name = 'Green Certificate';
            
            return (
              <p key={index} style={{ color: entry.color }}>
                {`${name}: $${entry.value?.toFixed(2)}/MWh`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Price Chart</CardTitle>
        <div className="flex gap-2 mt-4">
          {states.map(state => (
            <Button
              key={state}
              variant={selectedRegion === state ? "default" : "outline"}
              onClick={() => setSelectedRegion(state)}
              className="min-w-16"
            >
              {state}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year"
                type="number"
                domain={[constants.analysisStartYear, constants.analysisEndYear]}
                tickCount={years.length}
              />
              <YAxis 
                domain={yAxisDomain}
                label={{ value: 'Price ($/MWh)', angle: -90, position: 'insideLeft', offset: 0 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="baseloadBlack" 
                name="Baseload"
                stroke="#000000" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="solarBlack" 
                name="Solar"
                stroke="#FFD700" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="windBlack" 
                name="Wind"
                stroke="#0000FF" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="green" 
                name="Green Certificate"
                stroke="#00FF00" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;