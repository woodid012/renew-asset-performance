import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Download } from 'lucide-react';

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

  // Function to apply escalation and convert from real to nominal dollars
  const applyEscalation = (realPrice, year) => {
    if (!realPrice || !constants.referenceYear || !constants.escalation) return realPrice;
    const yearDiff = year - constants.referenceYear;
    return realPrice * Math.pow(1 + constants.escalation / 100, yearDiff);
  };

  useEffect(() => {
    let maxPrice = 0;
    let minPrice = Infinity;

    // Create chart data for selected region with escalation
    const data = years.map(year => {
      const dataPoint = { year };
      
      // Process each price type
      const priceTypes = [
        { key: 'baseloadBlack', profile: 'baseload', type: 'black' },
        { key: 'solarBlack', profile: 'solar', type: 'black' },
        { key: 'windBlack', profile: 'wind', type: 'black' },
        { key: 'green', profile: 'solar', type: 'green' }
      ];

      priceTypes.forEach(({ key, profile, type }) => {
        const realPrice = constants.merchantPrices?.[profile]?.[type]?.[selectedRegion]?.[year];
        if (realPrice) {
          // Apply escalation to convert to nominal
          const nominalPrice = applyEscalation(realPrice, year);
          
          // Store price value
          dataPoint[key] = nominalPrice;

          // Update max/min tracking
          maxPrice = Math.max(maxPrice, nominalPrice);
          minPrice = Math.min(minPrice, nominalPrice || minPrice);
        }
      });
      
      return dataPoint;
    });

    // Round up max and down min to nearest 50 for clean bounds
    const roundedMax = Math.ceil(maxPrice / 50) * 50;
    const roundedMin = Math.max(0, Math.floor(minPrice / 50) * 50);
    setYAxisDomain([roundedMin, roundedMax]);
    
    setChartData(data);
  }, [selectedRegion, constants.merchantPrices, constants.escalation, constants.referenceYear, years]);

  const handleExportCSV = () => {
    // Create headers with all states
    const headers = [
      'Year',
      'NSW Baseload ($/MWh)', 'NSW Solar ($/MWh)', 'NSW Wind ($/MWh)', 'NSW Green Certificate ($/MWh)',
      'QLD Baseload ($/MWh)', 'QLD Solar ($/MWh)', 'QLD Wind ($/MWh)', 'QLD Green Certificate ($/MWh)',
      'SA Baseload ($/MWh)', 'SA Solar ($/MWh)', 'SA Wind ($/MWh)', 'SA Green Certificate ($/MWh)',
      'VIC Baseload ($/MWh)', 'VIC Solar ($/MWh)', 'VIC Wind ($/MWh)', 'VIC Green Certificate ($/MWh)'
    ];

    // Generate data for all states
    const allData = years.map(year => {
      const row = { year };
      
      // Process each state
      states.forEach(state => {
        const priceTypes = [
          { key: 'baseloadBlack', profile: 'baseload', type: 'black' },
          { key: 'solarBlack', profile: 'solar', type: 'black' },
          { key: 'windBlack', profile: 'wind', type: 'black' },
          { key: 'green', profile: 'solar', type: 'green' }
        ];

        priceTypes.forEach(({ key, profile, type }) => {
          const realPrice = constants.merchantPrices?.[profile]?.[type]?.[state]?.[year];
          if (realPrice) {
            row[`${state}_${key}`] = applyEscalation(realPrice, year);
          }
        });
      });
      
      return row;
    });

    // Convert data to CSV format
    const csvData = allData.map(row => [
      row.year,
      // NSW
      (row['NSW_baseloadBlack'] || '').toFixed(2),
      (row['NSW_solarBlack'] || '').toFixed(2),
      (row['NSW_windBlack'] || '').toFixed(2),
      (row['NSW_green'] || '').toFixed(2),
      // QLD
      (row['QLD_baseloadBlack'] || '').toFixed(2),
      (row['QLD_solarBlack'] || '').toFixed(2),
      (row['QLD_windBlack'] || '').toFixed(2),
      (row['QLD_green'] || '').toFixed(2),
      // SA
      (row['SA_baseloadBlack'] || '').toFixed(2),
      (row['SA_solarBlack'] || '').toFixed(2),
      (row['SA_windBlack'] || '').toFixed(2),
      (row['SA_green'] || '').toFixed(2),
      // VIC
      (row['VIC_baseloadBlack'] || '').toFixed(2),
      (row['VIC_solarBlack'] || '').toFixed(2),
      (row['VIC_windBlack'] || '').toFixed(2),
      (row['VIC_green'] || '').toFixed(2)
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nominal_prices_all_states.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const priceFormat = (value) => value?.toFixed(2);
      
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
              <div key={index} style={{ color: entry.color }} className="mb-1">
                <p className="font-medium">{`${name}: $${priceFormat(entry.value)}/MWh`}</p>
              </div>
            );
          })}
          <p className="text-xs text-gray-500 mt-2">
            Base Year: {constants.referenceYear}, Escalation: {constants.escalation}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Price Chart (Nominal Dollars)</span>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Nominal $ CSV
            </Button>
          </div>
        </CardTitle>
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
                label={{ value: 'Price (Nominal $/MWh)', angle: -90, position: 'insideLeft', offset: 0 }}
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