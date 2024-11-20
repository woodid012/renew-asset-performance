import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PriceChart = () => {
  const { constants, getMerchantPrice } = usePortfolio();
  const [selectedRegion, setSelectedRegion] = useState('NSW');
  const [chartData, setChartData] = useState([]);
  const [yAxisDomain, setYAxisDomain] = useState([0, 100]);
  const [interval, setInterval] = useState('quarterly');
  const [globalPriceRange, setGlobalPriceRange] = useState({ min: Infinity, max: -Infinity });

  const states = ['NSW', 'QLD', 'SA', 'VIC'];
  
  const getTimePeriods = () => {
    const years = Array.from(
      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
      (_, i) => constants.analysisStartYear + i
    );

    if (interval === 'yearly') {
      return years.map(year => ({ 
        year, 
        display: year.toString()
      }));
    } else if (interval === 'quarterly') {
      return years.flatMap(year => 
        [1, 2, 3, 4].map(quarter => ({
          year,
          quarter,
          display: `${year.toString().slice(-2)}-Q${quarter}`
        }))
      );
    } else { // monthly
      return years.flatMap(year => 
        Array.from({ length: 12 }, (_, i) => ({
          year,
          month: i + 1,
          display: `${year.toString().slice(-2)}-${(i + 1).toString().padStart(2, '0')}`
        }))
      );
    }
  };

  const getTimeString = (period) => {
    if (interval === 'yearly') {
      return period.year.toString();
    } else if (interval === 'quarterly') {
      return `${period.year}-Q${period.quarter}`;
    } else { // monthly
      return `1/${period.month.toString().padStart(2, '0')}/${period.year}`;
    }
  };

  const calculateInterval = () => 0;

  const formatXAxisTick = (props) => {
    const { x, y, payload } = props;
    const year = interval === 'yearly' 
      ? payload.value 
      : payload.value.split('-')[0];
    
    if (!payload.index || chartData[payload.index]?.year !== chartData[payload.index - 1]?.year) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={10}>
            {interval === 'yearly' ? year : `20${year}`}
          </text>
        </g>
      );
    }
    return null;
  };

  // Calculate global price range across all regions
  useEffect(() => {
    let globalMax = -Infinity;
    let globalMin = Infinity;
    
    states.forEach(region => {
      const timePeriods = getTimePeriods();
      
      timePeriods.forEach(period => {
        const timeStr = getTimeString(period);
        const priceTypes = [
          { profile: 'baseload', type: 'black' },
          { profile: 'solar', type: 'black' },
          { profile: 'wind', type: 'black' },
          { profile: 'solar', type: 'green' }
        ];
        
        priceTypes.forEach(({ profile, type }) => {
          const realPrice = getMerchantPrice(profile, type, region, timeStr);
          if (realPrice) {
            const nominalPrice = constants.referenceYear && constants.escalation && period.year >= constants.ForecastStartYear
              ? realPrice * Math.pow(1 + constants.escalation / 100, period.year - constants.referenceYear)
              : realPrice;
            
            globalMax = Math.max(globalMax, nominalPrice);
            globalMin = Math.min(globalMin, nominalPrice);
          }
        });
      });
    });
    
    // Round to nearest 50 for min and max
    const roundedMax = Math.ceil(globalMax / 50) * 50;
    const roundedMin = Math.floor(globalMin / 50) * 50;
    
    setGlobalPriceRange({
      min: roundedMin,
      max: roundedMax
    });
    setYAxisDomain([roundedMin, roundedMax]);
  }, [
    getMerchantPrice,
    constants.escalation,
    constants.referenceYear,
    interval,
    constants.analysisStartYear,
    constants.analysisEndYear,
    constants.ForecastStartYear
  ]);

  useEffect(() => {
    const timePeriods = getTimePeriods();

    const data = timePeriods.map(period => {
      const dataPoint = { 
        period: period.display,
        year: period.year
      };
      
      const priceTypes = [
        { key: 'baseloadBlack', profile: 'baseload', type: 'black' },
        { key: 'solarBlack', profile: 'solar', type: 'black' },
        { key: 'windBlack', profile: 'wind', type: 'black' },
        { key: 'green', profile: 'solar', type: 'green' }
      ];

      priceTypes.forEach(({ key, profile, type }) => {
        const timeStr = getTimeString(period);
        const realPrice = getMerchantPrice(profile, type, selectedRegion, timeStr);
        if (realPrice) {
          const nominalPrice = constants.referenceYear && constants.escalation && period.year >= constants.ForecastStartYear
            ? realPrice * Math.pow(1 + constants.escalation / 100, period.year - constants.referenceYear)
            : realPrice;
          
          dataPoint[key] = nominalPrice;
        }
      });
      
      return dataPoint;
    });

    setChartData(data);
  }, [
    selectedRegion, 
    getMerchantPrice, 
    constants.escalation, 
    constants.referenceYear, 
    interval,
    constants.analysisStartYear,
    constants.analysisEndYear,
    constants.ForecastStartYear
  ]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const priceFormat = (value) => value?.toFixed(2);
      
      let periodDisplay = label;
      if (interval === 'monthly') {
        const [year, month] = label.split('-');
        const date = new Date(parseInt('20' + year), parseInt(month) - 1);
        periodDisplay = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else if (interval === 'quarterly') {
        const [year, quarter] = label.split('-');
        periodDisplay = `20${year} ${quarter}`;
      }

      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{periodDisplay}</p>
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
            Range across all regions: ${globalPriceRange.min} - ${globalPriceRange.max}/MWh
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={interval === 'monthly' ? "default" : "outline"}
                onClick={() => setInterval('monthly')}
                className="min-w-20"
              >
                Monthly
              </Button>
              <Button
                variant={interval === 'quarterly' ? "default" : "outline"}
                onClick={() => setInterval('quarterly')}
                className="min-w-20"
              >
                Quarterly
              </Button>
              <Button
                variant={interval === 'yearly' ? "default" : "outline"}
                onClick={() => setInterval('yearly')}
                className="min-w-20"
              >
                Yearly
              </Button>
            </div>
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
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period"
                interval={calculateInterval()}
                tick={formatXAxisTick}
                height={40}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis 
                domain={yAxisDomain}
                tickFormatter={(value) => Math.round(value)}
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