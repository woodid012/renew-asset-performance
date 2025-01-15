import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PriceChart = () => {
  const { constants, getMerchantPrice } = usePortfolio();
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedType, setSelectedType] = useState('Baseload');
  const [chartData, setChartData] = useState([]);
  const [yAxisDomain, setYAxisDomain] = useState([0, 100]);
  const [interval, setInterval] = useState('quarterly');
  const [globalPriceRange, setGlobalPriceRange] = useState({ min: Infinity, max: -Infinity });

  const states = ['All Regions', 'NSW', 'QLD', 'SA', 'VIC'];
  const types = ['All', 'Baseload', 'Solar', 'Wind', 'Green'];

  // Handle region selection with type defaults
  const handleRegionSelection = (region) => {
    setSelectedRegion(region);
    setSelectedType(region === 'All Regions' ? 'Baseload' : 'All');
  };
  const typeColors = {
    baseloadBlack: '#000000',  // Black
    solarBlack: '#FFD700',     // Yellow
    windBlack: '#0000FF',      // Blue
    green: '#00FF00'           // Green
  };
  const regionColors = {
    NSW: '#1f77b4',
    QLD: '#ff7f0e',
    SA: '#2ca02c',
    VIC: '#d62728'
  };
  
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
    
    const regionsToProcess = ['NSW', 'QLD', 'SA', 'VIC'];
    
    regionsToProcess.forEach(region => {
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
    const regionsToProcess = selectedRegion === 'All Regions' ? ['NSW', 'QLD', 'SA', 'VIC'] : [selectedRegion];

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

      regionsToProcess.forEach(region => {
        priceTypes.forEach(({ key, profile, type }) => {
          const timeStr = getTimeString(period);
          const realPrice = getMerchantPrice(profile, type, region, timeStr);
          if (realPrice) {
            const nominalPrice = constants.referenceYear && constants.escalation && period.year >= constants.ForecastStartYear
              ? realPrice * Math.pow(1 + constants.escalation / 100, period.year - constants.referenceYear)
              : realPrice;
            
            // Create separate keys for each region and price type
            dataPoint[`${region}_${key}`] = nominalPrice;
          }
        });
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

  const getVisibleLines = () => {
    const regions = selectedRegion === 'All Regions' ? ['NSW', 'QLD', 'SA', 'VIC'] : [selectedRegion];
    const lines = [];
    
    if (selectedRegion === 'All Regions') {
      // When All Regions is selected, show the selected type for all regions
      switch (selectedType) {
        case 'Baseload':
          regions.forEach(region => lines.push(`${region}_baseloadBlack`));
          break;
        case 'Solar':
          regions.forEach(region => lines.push(`${region}_solarBlack`));
          break;
        case 'Wind':
          regions.forEach(region => lines.push(`${region}_windBlack`));
          break;
        case 'Green':
          regions.forEach(region => lines.push(`${region}_green`));
          break;
      }
    } else {
      // For individual states, show all types if 'All' is selected, otherwise show selected type
      if (selectedType === 'All') {
        lines.push(
          `${selectedRegion}_baseloadBlack`,
          `${selectedRegion}_solarBlack`,
          `${selectedRegion}_windBlack`,
          `${selectedRegion}_green`
        );
      } else {
        switch (selectedType) {
          case 'Baseload':
            lines.push(`${selectedRegion}_baseloadBlack`);
            break;
          case 'Solar':
            lines.push(`${selectedRegion}_solarBlack`);
            break;
          case 'Wind':
            lines.push(`${selectedRegion}_windBlack`);
            break;
          case 'Green':
            lines.push(`${selectedRegion}_green`);
            break;
        }
      }
    }
    
    return lines;
  };

  const getLineName = (dataKey) => {
    const [region, ...rest] = dataKey.split('_');
    const type = rest.join('_');
    let name = '';
    
    if (type === 'baseloadBlack') name = 'Baseload';
    if (type === 'solarBlack') name = 'Solar';
    if (type === 'windBlack') name = 'Wind';
    if (type === 'green') name = 'Green Certificate';
    
    return selectedRegion === 'All Regions' ? `${region} ${name}` : name;
  };

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
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color }} className="mb-1">
              <p className="font-medium">
                {`${getLineName(entry.dataKey)}: $${priceFormat(entry.value)}/MWh`}
              </p>
            </div>
          ))}
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
      <CardHeader className="space-y-4">
        <CardTitle>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {states.map(state => (
                  <Button
                    key={state}
                    variant={selectedRegion === state ? "default" : "outline"}
                    onClick={() => handleRegionSelection(state)}
                    className="w-24"
                  >
                    {state}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant={interval === 'monthly' ? "default" : "outline"}
                  onClick={() => setInterval('monthly')}
                  className="w-24"
                >
                  Monthly
                </Button>
                <Button
                  variant={interval === 'quarterly' ? "default" : "outline"}
                  onClick={() => setInterval('quarterly')}
                  className="w-24"
                >
                  Quarterly
                </Button>
                <Button
                  variant={interval === 'yearly' ? "default" : "outline"}
                  onClick={() => setInterval('yearly')}
                  className="w-24"
                >
                  Yearly
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {types.map(type => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  onClick={() => setSelectedType(type)}
                  className="w-24"
                  disabled={selectedRegion === 'All Regions' && type === 'All'}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardTitle>
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
              {getVisibleLines().map((line) => {
                const [region, ...rest] = line.split('_');
                const type = rest.join('_');
                const color = selectedRegion === 'All Regions' ? regionColors[region] : typeColors[type];
                return (
                  <Line 
                    key={line}
                    type="monotone" 
                    dataKey={line}
                    name={getLineName(line)}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;