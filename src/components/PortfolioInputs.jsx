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
        [state]: {
          ...constants.merchantPrices[state],
          [type]: newValue
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="font-medium">Technology</div>
            <div className="font-medium text-center">NSW</div>
            <div className="font-medium text-center">VIC</div>
            <div className="font-medium text-center">QLD</div>
            <div className="font-medium text-center">SA</div>
            
            {/* Solar Capacity Factors */}
            <div className="font-medium">Solar</div>
            {['NSW', 'VIC', 'QLD', 'SA'].map(state => (
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
            {['NSW', 'VIC', 'QLD', 'SA'].map(state => (
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
          <div className="grid grid-cols-4 gap-4">
            <div className="font-medium">State</div>
            <div className="font-medium text-center">Black Energy ($/MWh)</div>
            <div className="font-medium text-center">Green Certificates ($/MWh)</div>
            <div className="font-medium text-center">Annual Escalation (%)</div>

            {Object.entries(constants.merchantPrices).map(([state, prices]) => (
              <React.Fragment key={state}>
                <div className="font-medium">{state}</div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={prices.black}
                    onChange={(e) => handleMerchantPriceChange(state, 'black', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={prices.green}
                    onChange={(e) => handleMerchantPriceChange(state, 'green', e.target.value)}
                    className="text-center"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={prices.escalation}
                    onChange={(e) => handleMerchantPriceChange(state, 'escalation', e.target.value)}
                    className="text-center"
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioInputs;