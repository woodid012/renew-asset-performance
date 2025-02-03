import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PriceChart = () => {
  const { constants, getMerchantPrice } = usePortfolio();
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedType, setSelectedType] = useState('Baseload');
  const [selectedDuration, setSelectedDuration] = useState('0.5');
  const [interval, setInterval] = useState('yearly');
  const [chartData, setChartData] = useState([]);
  const [yAxisDomain, setYAxisDomain] = useState([0, 100]);
  const [globalPriceRange, setGlobalPriceRange] = useState({ min: Infinity, max: -Infinity });

  const states = ['All Regions', 'NSW', 'QLD', 'SA', 'VIC'];
  const types = ['All', 'Baseload', 'Solar', 'Wind', 'Green', 'Storage'];
  const durations = ['0.5', '1', '2', '4'];
  

  const handleRegionSelection = (region) => {
    setSelectedRegion(region);
    setSelectedType(region === 'All Regions' ? 'Baseload' : 'All');
  };

  const typeColors = {
    baseloadEnergy: '#000000',
    solarEnergy: '#FFD700',
    windEnergy: '#0000FF',
    green: '#00FF00',
    storage: '#FF00FF'
  };

  const regionColors = {
    NSW: '#1f77b4',
    QLD: '#ff7f0e',
    SA: '#2ca02c',
    VIC: '#d62728'
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

  const getLineName = (dataKey) => {
    const [region, type] = dataKey.split('_');
    let name = '';
    
    if (type === 'baseloadEnergy') name = 'Baseload';
    if (type === 'solarEnergy') name = 'Solar';
    if (type === 'windEnergy') name = 'Wind';
    if (type === 'green') name = 'Green Certificate';
    if (type === 'storage') name = `${selectedDuration}hr Storage`;
    
    return selectedRegion === 'All Regions' ? `${region} ${name}` : name;
  };

  useEffect(() => {
    let globalMax = -Infinity;
    let globalMin = Infinity;
    
    const regionsToProcess = ['NSW', 'QLD', 'SA', 'VIC'];
    const timePeriods = getTimePeriods();
    
    regionsToProcess.forEach(region => {
      timePeriods.forEach(period => {
        const timeStr = selectedType === 'Storage' ? period.year : getTimeString(period);
        const priceTypes = [
          { profile: 'baseload', type: 'Energy' },
          { profile: 'solar', type: 'Energy' },
          { profile: 'wind', type: 'Energy' },
          { profile: 'solar', type: 'green' }
        ];
        
        priceTypes.forEach(({ profile, type }) => {
          const realPrice = getMerchantPrice(profile, type, region, timeStr);
          if (realPrice) {
            const nominalPrice = constants.referenceYear && constants.escalation
              ? realPrice * Math.pow(1 + constants.escalation / 100, period.year - constants.referenceYear)
              : realPrice;
            
            globalMax = Math.max(globalMax, nominalPrice);
            globalMin = Math.min(globalMin, nominalPrice);
          }
        });

        if (selectedType === 'Storage') {
          const storagePrice = getMerchantPrice('storage', parseFloat(selectedDuration), region, timeStr);
          if (storagePrice) {
            globalMax = Math.max(globalMax, storagePrice);
            globalMin = Math.min(globalMin, storagePrice);
          }
        }
      });
    });
    
    const roundedMax = Math.ceil(globalMax / 50) * 50;
    const roundedMin = Math.floor(globalMin / 50) * 50;
    
    setGlobalPriceRange({
      min: roundedMin,
      max: roundedMax
    });
    setYAxisDomain([roundedMin, roundedMax]);
  }, [getMerchantPrice, constants, selectedType, selectedDuration, interval]);

  const getTimePeriods = () => {
    const years = Array.from(
      { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
      (_, i) => constants.analysisStartYear + i
    );

    if (selectedType === 'Storage') {
      return years.map(year => ({ 
        year, 
        display: year.toString()
      }));
    } else if (interval === 'yearly') {
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

  useEffect(() => {
    const timePeriods = getTimePeriods();
    const regionsToProcess = selectedRegion === 'All Regions' ? ['NSW', 'QLD', 'SA', 'VIC'] : [selectedRegion];

    const data = timePeriods.map(period => {
      const dataPoint = { 
        period: period.display,
        year: period.year
      };
      
      regionsToProcess.forEach(region => {
        if (selectedType === 'Storage') {
          const storagePrice = getMerchantPrice('storage', parseFloat(selectedDuration), region, period.year);
          if (storagePrice) {
            dataPoint[`${region}_storage`] = storagePrice;
          }
        } else {
          const priceTypes = [
            { key: 'baseloadEnergy', profile: 'baseload', type: 'Energy' },
            { key: 'solarEnergy', profile: 'solar', type: 'Energy' },
            { key: 'windEnergy', profile: 'wind', type: 'Energy' },
            { key: 'green', profile: 'solar', type: 'green' }
          ];

          priceTypes.forEach(({ key, profile, type }) => {
            const realPrice = getMerchantPrice(profile, type, region, getTimeString(period));
            if (realPrice) {
              const nominalPrice = constants.referenceYear && constants.escalation
                ? realPrice * Math.pow(1 + constants.escalation / 100, period.year - constants.referenceYear)
                : realPrice;
              
              dataPoint[`${region}_${key}`] = nominalPrice;
            }
          });
        }
      });
      
      return dataPoint;
    });

    setChartData(data);
  }, [selectedRegion, selectedType, selectedDuration, interval, getMerchantPrice, constants]);

  const getVisibleLines = () => {
    const regions = selectedRegion === 'All Regions' ? ['NSW', 'QLD', 'SA', 'VIC'] : [selectedRegion];
    const lines = [];
    
    if (selectedRegion === 'All Regions') {
      switch (selectedType) {
        case 'Storage':
          regions.forEach(region => lines.push(`${region}_storage`));
          break;
        case 'Baseload':
          regions.forEach(region => lines.push(`${region}_baseloadEnergy`));
          break;
        case 'Solar':
          regions.forEach(region => lines.push(`${region}_solarEnergy`));
          break;
        case 'Wind':
          regions.forEach(region => lines.push(`${region}_windEnergy`));
          break;
        case 'Green':
          regions.forEach(region => lines.push(`${region}_green`));
          break;
      }
    } else {
      if (selectedType === 'All') {
        lines.push(
          `${selectedRegion}_baseloadEnergy`,
          `${selectedRegion}_solarEnergy`,
          `${selectedRegion}_windEnergy`,
          `${selectedRegion}_green`,
          `${selectedRegion}_storage`
        );
      } else if (selectedType === 'Storage') {
        lines.push(`${selectedRegion}_storage`);
      } else {
        switch (selectedType) {
          case 'Baseload':
            lines.push(`${selectedRegion}_baseloadEnergy`);
            break;
          case 'Solar':
            lines.push(`${selectedRegion}_solarEnergy`);
            break;
          case 'Wind':
            lines.push(`${selectedRegion}_windEnergy`);
            break;
          case 'Green':
            lines.push(`${selectedRegion}_green`);
            break;
        }
      }
    }
    
    return lines;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} style={{ color: entry.color }} className="mb-1">
              <p className="font-medium">
                {`${getLineName(entry.dataKey)}: $${entry.value?.toFixed(2)}/MWh`}
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
              {selectedType !== 'Storage' && (
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
              )}
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
            {selectedType === 'Storage' && (
              <div className="flex gap-2">
                {durations.map(duration => (
                  <Button
                    key={duration}
                    variant={selectedDuration === duration ? "default" : "outline"}
                    onClick={() => setSelectedDuration(duration)}
                    className="w-24"
                  >
                    {duration}hr
                  </Button>
                ))}
              </div>
            )}
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
                padding={{ left: 20, right: 20 }}
              />
              <YAxis 
                domain={yAxisDomain}
                tickFormatter={(value) => Math.round(value)}
                label={{ 
                  value: selectedType === 'Storage' ? 'Price Spread ($/MWh)' : 'Price (Nominal $/MWh)', 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: 0 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {getVisibleLines().map((line) => {
                const [region, type] = line.split('_');
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