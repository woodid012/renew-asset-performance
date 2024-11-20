// InputsChart.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Download } from 'lucide-react';
import { useInputsData } from './InputsData';

const InputsChart = () => {
  const [selectedRegion, setSelectedRegion] = useState('NSW');
  const {
    constants,
    getProcessedData,
    calculateYAxisDomain,
    dataProcessor
  } = useInputsData();

  // Add some debug logging to track data flow
  const chartData = useMemo(() => {
    const data = getProcessedData(selectedRegion);
    console.log('Chart data for region:', selectedRegion);
    console.log('Aggregation level:', constants.aggregationLevel);
    console.log('Sample data:', data.slice(0, 2));
    return data;
  }, [getProcessedData, selectedRegion, constants.aggregationLevel]);

  // Memoize Y-axis domain
  const yAxisDomain = useMemo(() => 
    calculateYAxisDomain(chartData),
    [calculateYAxisDomain, chartData]
  );

  const formatXAxisTick = (value) => {
    if (!value) return '';
    
    if (constants.aggregationLevel === 'none') {
      const date = new Date(value);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } 
    
    // For quarterly data (format: "2024-Q1")
    if (constants.aggregationLevel === 'quarterly') {
      return value; // Already in YYYY-Q# format
    }
    
    // For monthly data (format: "2024-01")
    if (constants.aggregationLevel === 'monthly') {
      return value; // Already in YYYY-MM format
    }
    
    // For yearly data
    return value;
  };



  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const priceFormat = (value) => value?.toFixed(2);
      
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{`Period: ${formatXAxisTick(label)}`}</p>
          {payload.map((entry, index) => {
            const name = dataProcessor.getPriceTypeName(entry.dataKey);
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
          <div className="flex gap-2 mt-4">
            {dataProcessor.states.map(state => (
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time"
                tickFormatter={formatXAxisTick}
                angle={-45}
                textAnchor="end"
                height={60}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={yAxisDomain}
                label={{ value: 'Price (Nominal $/MWh)', angle: -90, position: 'insideLeft', offset: 0 }}
                tickFormatter={(value) => Math.round(value)}
                type="number"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="baseloadBlack"
                name={dataProcessor.getPriceTypeName('baseloadBlack')}
                stroke="#000000"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="solarBlack"
                name={dataProcessor.getPriceTypeName('solarBlack')}
                stroke="#FFD700"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="windBlack"
                name={dataProcessor.getPriceTypeName('windBlack')}
                stroke="#0000FF"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="green"
                name={dataProcessor.getPriceTypeName('green')}
                stroke="#00FF00"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              
              {constants.ForecastStartYear && (
                <ReferenceArea 
                  x1={chartData[0]?.time} 
                  x2={constants.ForecastStartYear - 1}
                  fillOpacity={0.3}
                  fill="#808080"
                  strokeOpacity={0.3}
                  label={{
                    value: "Actuals",
                    position: "center",
                    fontSize: 12,
                    fontWeight: "bold",
                    fill: "#000000"
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InputsChart;