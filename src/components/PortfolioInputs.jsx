import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioInputs = () => {
  const { constants, updateConstants } = usePortfolio();

  const handleCapacityFactorChange = (technology, state, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0 && newValue <= 1) {
      updateConstants('capacityFactors', {
        ...constants.capacityFactors,
        [technology]: {
          ...constants.capacityFactors[technology],
          [state]: newValue
        }
      });
    }
  };

  const handleMerchantPriceChange = (state, type, year, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0) {
      if (type === 'green') {
        // Update green price for all states
        const updatedStates = {};
        ['NSW', 'VIC', 'QLD', 'SA'].forEach(stateKey => {
          updatedStates[stateKey] = {
            ...constants.merchantPrices.states[stateKey],
            green: {
              ...constants.merchantPrices.states[stateKey].green,
              [year]: newValue
            }
          };
        });

        updateConstants('merchantPrices', {
          ...constants.merchantPrices,
          states: {
            ...constants.merchantPrices.states,
            ...updatedStates
          }
        });
      } else {
        updateConstants('merchantPrices', {
          ...constants.merchantPrices,
          states: {
            ...constants.merchantPrices.states,
            [state]: {
              ...constants.merchantPrices.states[state],
              [type]: {
                ...constants.merchantPrices.states[state][type],
                [year]: newValue
              }
            }
          }
        });
      }
    }
  };

  const states = ['NSW', 'QLD', 'SA', 'VIC'];
  const years = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => constants.analysisStartYear + i
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="font-medium">Technology</div>
            {states.map(state => (
              <div key={`header-${state}`} className="font-medium text-center">{state}</div>
            ))}
            
            {/* Solar Capacity Factors */}
            <div className="font-medium">Solar</div>
            {states.map(state => (
              <div key={`solar-${state}`}>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={constants.capacityFactors.solar[state]}
                  onChange={(e) => handleCapacityFactorChange('solar', state, e.target.value)}
                  className="text-center"
                />
              </div>
            ))}

            {/* Wind Capacity Factors */}
            <div className="font-medium">Wind</div>
            {states.map(state => (
              <div key={`wind-${state}`}>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={constants.capacityFactors.wind[state]}
                  onChange={(e) => handleCapacityFactorChange('wind', state, e.target.value)}
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merchant Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Black Energy Prices Table */}
          <div>
            <h3 className="font-medium text-lg mb-4">Black Energy Price ($/MWh)</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
                <div className="font-medium">Year</div>
                {years.map(year => (
                  <div key={year} className="text-center font-medium">{year}</div>
                ))}
              </div>
              
              {states.map(state => (
                <div key={state} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
                  <div className="font-medium">{state}</div>
                  {years.map(year => (
                    <Input
                      key={`${state}-black-${year}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={constants.merchantPrices.states[state].black[year]}
                      onChange={(e) => handleMerchantPriceChange(state, 'black', year, e.target.value)}
                      className="text-center"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Green Certificate Prices Table */}
          <div>
            <h3 className="font-medium text-lg mb-4">Green Certificate Price ($/MWh)</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
                <div className="font-medium">Year</div>
                {years.map(year => (
                  <div key={year} className="text-center font-medium">{year}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
                <div className="font-medium">All States</div>
                {years.map(year => (
                  <Input
                    key={`green-${year}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={constants.merchantPrices.states.NSW.green[year]}
                    onChange={(e) => handleMerchantPriceChange('NSW', 'green', year, e.target.value)}
                    className="text-center"
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioInputs;