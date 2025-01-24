import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AssetFormContract = ({ 
  contract, 
  updateContract, 
  removeContract, 
  isStorage = false, 
  capacity,
  capacityFactor = 0,
  volumeLossAdjustment = 95,
  volume
}) => {
  // Helper function to safely handle numeric inputs
  const handleNumericInput = (field, value) => {
    // Always pass through empty string to allow typing
    if (value === '') {
      updateContract(field, '');
      return;
    }
    
    // Only parse if it's a valid number
    const parsed = Number(value);
    if (!isNaN(parsed)) {
      updateContract(field, parsed);
    }
  };

  // Calculate contract duration in years
  const calculateTenor = () => {
    if (!contract.startDate || !contract.endDate) return null;
    
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const diffTime = Math.abs(end - start);
    const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    return diffYears;
  };

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={removeContract}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="pt-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Counterparty</label>
            <Input
              value={contract.counterparty || ''}
              onChange={(e) => updateContract('counterparty', e.target.value)}
              placeholder="Counterparty Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contract Type</label>
            <Select 
              value={contract.type || ''}
              onValueChange={(value) => {
                updateContract('type', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                {isStorage ? (
                  <>
                    <SelectItem value="cfd">CfD</SelectItem>
                    <SelectItem value="fixed">Fixed Revenue</SelectItem>
                    <SelectItem value="tolling">Tolling</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="bundled">Bundled PPA</SelectItem>
                    <SelectItem value="green">Green Only</SelectItem>
                    <SelectItem value="black">Black Only</SelectItem>
                    <SelectItem value="fixed">Fixed Revenue</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {contract.type === 'fixed'
                ? 'Annual Revenue ($M)'
                : isStorage 
                  ? contract.type === 'tolling'
                    ? 'Price ($/MW/hr)'
                    : contract.type === 'fixed'
                      ? 'Annual Revenue ($M)'
                      : 'Price Spread ($/MWh)'
                  : 'Strike Price ($)'}
            </label>
            <Input
              type="number"
              value={contract.strikePrice || ''}
              onChange={(e) => handleNumericInput('strikePrice', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            {contract.type !== 'fixed' ? (
              <>
                <label className="text-sm font-medium">Buyer's Percentage (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={isStorage && contract.type === 'tolling' ? 100 : (contract.buyersPercentage || '')}
                  onChange={(e) => handleNumericInput('buyersPercentage', e.target.value)}
                  disabled={isStorage && contract.type === 'tolling'}
                />
              </>
            ) : (
              <div className="invisible">
                <label className="text-sm font-medium">Placeholder</label>
                <Input type="number" disabled />
              </div>
            )}
          </div>

          {/* Revenue calculation displays for storage types */}
          {contract.strikePrice && isStorage && (
            <div className="col-span-2 bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium mb-2">Annual Revenue Calculation</h4>
              
              {/* Storage Tolling Contract */}
              {contract.type === 'tolling' && (
                <>
                  <div className="text-lg font-semibold">
                    ${((8760 * contract.strikePrice * capacity) / 1000000).toFixed(2)}M per year
                  </div>
                  <p className="text-xs text-gray-500">
                    Based on {capacity} MW × 8,760 hours × ${contract.strikePrice}/MW/hr
                  </p>
                </>
              )}

              {/* Storage CfD Contract */}
              {contract.type === 'cfd' && (
                <>
                  <div className="text-lg font-semibold">
                    ${((contract.strikePrice * volume * 365 * (volumeLossAdjustment/100) * (contract.buyersPercentage / 100)) / 1000000).toFixed(2)}M per year
                  </div>
                  <p className="text-xs text-gray-500">
                    Based on {volume} MWh × 365 days × ${contract.strikePrice} spread × {volumeLossAdjustment}% efficiency × {contract.buyersPercentage}% contracted
                  </p>
                </>
              )}
            </div>
          )}

          {!isStorage && contract.type === 'bundled' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Black Price ($)</label>
                <Input
                  type="number"
                  value={contract.blackPrice || ''}
                  onChange={(e) => handleNumericInput('blackPrice', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Green Price ($)</label>
                <Input
                  type="number"
                  value={contract.greenPrice || ''}
                  onChange={(e) => handleNumericInput('greenPrice', e.target.value)}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              {/* Renewable PPA Revenue Calculation */}
              {contract.strikePrice && contract.buyersPercentage && (
                <div className="col-span-2 bg-gray-50 p-4 rounded-md mt-4">
                  <h4 className="text-sm font-medium mb-2">Annual Revenue Calculation</h4>
                  
                  {/* Calculate black and green components */}
                  {(() => {
                    const baseRevenue = 8760 * capacity * (capacityFactor/100) * (contract.buyersPercentage/100);
                    const blackPrice = contract.blackPrice || 0;
                    const greenPrice = contract.greenPrice || 0;
                    const blackRevenue = (baseRevenue * blackPrice) / 1000000;
                    const greenRevenue = (baseRevenue * greenPrice) / 1000000;
                    const totalRevenue = blackRevenue + greenRevenue;
                    
                    return (
                      <>
                        <div className="text-lg font-semibold">
                          ${totalRevenue.toFixed(2)}M per year (Black = ${blackRevenue.toFixed(2)}M, Green = ${greenRevenue.toFixed(2)}M)
                        </div>
                        <p className="text-xs text-gray-500">
                          Based on {capacity} MW × {capacityFactor}% CF × 8,760 hours × ${contract.strikePrice}/MWh × {contract.buyersPercentage}% contracted
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* Modified date section */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={contract.startDate || ''}
                  onChange={(e) => updateContract('startDate', e.target.value)}
                />
                <p className="text-xs text-gray-500">Default as Asset Start</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={contract.endDate || ''}
                  onChange={(e) => updateContract('endDate', e.target.value)}
                />
                <p className="text-xs text-gray-500">Default +10 years</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contract Tenor</label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-gray-50">
                <span className="text-sm">{calculateTenor() ? `${calculateTenor()} years` : 'N/A'}</span>
              </div>
              <p className="text-xs text-gray-500">Calculated from dates</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Indexation (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={contract.indexation || ''}
                  onChange={(e) => handleNumericInput('indexation', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reference Year</label>
                <Input
                  type="number"
                  value={contract.indexationReferenceYear || ''}
                  onChange={(e) => handleNumericInput('indexationReferenceYear', e.target.value)}
                  min="2000"
                  max="2100"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetFormContract;