import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PriceChart = () => {
  const { constants } = usePortfolio();
  const [selectedRegion, setSelectedRegion] = useState('NSW');
  const [chartData, setChartData] = useState([]);

  const states = ['NSW', 'QLD', 'SA', 'VIC'];
  const years = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => constants.analysisStartYear + i
  );

  useEffect(() => {
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