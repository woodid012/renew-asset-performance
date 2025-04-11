import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortfolio } from '@/contexts/PortfolioContext';

/**
 * TaxationDepreciationInputs component
 * Contains inputs for tax rate and depreciation periods by asset type
 * Moved from Valuation tab to Asset Definition tab
 */
const TaxationDepreciationInputs = () => {
  const { constants, updateConstants } = usePortfolio();
  
  // Ensure these values exist with defaults if not set
  const corporateTaxRate = constants.corporateTaxRate !== undefined ? constants.corporateTaxRate : 0;
  const deprecationPeriods = constants.deprecationPeriods || {
    solar: 30,
    wind: 30,
    storage: 20
  };
  
  // Initialize values if they don't exist
  useEffect(() => {
    if (constants.corporateTaxRate === undefined) {
      updateConstants('corporateTaxRate', 0);
    }
    
    if (!constants.deprecationPeriods) {
      updateConstants('deprecationPeriods', {
        solar: 30,
        wind: 30,
        storage: 20
      });
    }
  }, [constants, updateConstants]);

  // Handle tax rate change
  const handleTaxRateChange = (value) => {
    updateConstants('corporateTaxRate', parseFloat(value) || 0);
  };

  // Handle depreciation period change
  const handleDepreciationChange = (assetType, value) => {
    const updatedPeriods = {
      ...deprecationPeriods,
      [assetType]: parseInt(value) || 0
    };
    
    updateConstants('deprecationPeriods', updatedPeriods);
  };

  return (
    <Card className="w-full mb-4">
      <CardHeader>
        <CardTitle>Taxation & Depreciation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="corporate-tax-rate">Corporate Tax Rate (%)</Label>
              <Input 
                id="corporate-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={corporateTaxRate}
                onChange={(e) => handleTaxRateChange(e.target.value)}
                className="w-full max-w-xs"
              />
              <p className="text-sm text-gray-500">
                Corporate tax rate applied to taxable income
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="font-medium block mb-2">Depreciation Periods (Years)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="solar-depreciation">Solar</Label>
                <Input 
                  id="solar-depreciation"
                  type="number"
                  min="1"
                  max="40"
                  value={deprecationPeriods.solar}
                  onChange={(e) => handleDepreciationChange('solar', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wind-depreciation">Wind</Label>
                <Input 
                  id="wind-depreciation"
                  type="number"
                  min="1"
                  max="40"
                  value={deprecationPeriods.wind}
                  onChange={(e) => handleDepreciationChange('wind', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage-depreciation">Storage</Label>
                <Input 
                  id="storage-depreciation"
                  type="number"
                  min="1"
                  max="40"
                  value={deprecationPeriods.storage}
                  onChange={(e) => handleDepreciationChange('storage', e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Asset depreciation periods for tax and accounting purposes
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxationDepreciationInputs;