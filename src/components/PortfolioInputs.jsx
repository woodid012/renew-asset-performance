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

  const handleMerchantPriceChange = (state, type, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0) {
      updateConstants('merchantPrices', {
        ...constants.merchantPrices,
        states: {
          ...constants.merchantPrices.states,
          [state]: {
            ...constants.merchantPrices.states[state],
            [type]: newValue
          }
        }
      });
    }
  };

  const handleEscalationChange = (value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0) {
      updateConstants('merchantPrices', {
        ...constants.merchantPrices,
        escalation: newValue
      });
    }
  };

  // Define states array for consistent use throughout the component
  const states = ['NSW', 'VIC', 'QLD', 'SA'];
  
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
        <CardContent>
          <div className="space-y-6">
            {/* Common Escalation Rate */}
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="font-medium">Annual Escalation (%)</div>
              <div>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={constants.merchantPrices.escalation}
                  onChange={(e) => handleEscalationChange(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>

            {/* State-specific prices */}
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">State</div>
              <div className="font-medium text-center">Black Energy ($/MWh)</div>
              <div className="font-medium text-center">Green Certificates ($/MWh)</div>

              {states.map(state => (
                <React.Fragment key={state}>
                  <div className="font-medium">{state}</div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={constants.merchantPrices.states[state]?.black}
                      onChange={(e) => handleMerchantPriceChange(state, 'black', e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={constants.merchantPrices.states[state]?.green}
                      onChange={(e) => handleMerchantPriceChange(state, 'green', e.target.value)}
                      className="text-center"
                    />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioInputs;