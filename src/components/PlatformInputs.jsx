import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  DEFAULT_PLATFORM_COSTS,
  DEFAULT_TAX_DEPRECIATION,
  UI_CONSTANTS
} from '@/lib/default_constants';

const PlatformInputs = () => {
  const { assets, constants, updateConstants } = usePortfolio();
  
  // Platform operating parameters with defaults
  const [platformOpex, setPlatformOpex] = useState(constants.platformOpex ?? DEFAULT_PLATFORM_COSTS.platformOpex);
  const [platformOpexEscalation, setPlatformOpexEscalation] = useState(constants.platformOpexEscalation ?? DEFAULT_PLATFORM_COSTS.platformOpexEscalation);
  const [otherOpex, setOtherOpex] = useState(constants.otherOpex ?? DEFAULT_PLATFORM_COSTS.otherOpex);
  
  // Cash management parameters with defaults
  const [dividendPolicy, setDividendPolicy] = useState(constants.dividendPolicy ?? DEFAULT_PLATFORM_COSTS.dividendPolicy);
  const [minimumCashBalance, setMinimumCashBalance] = useState(constants.minimumCashBalance ?? DEFAULT_PLATFORM_COSTS.minimumCashBalance);
  
  // Tax parameters with defaults
  const [corporateTaxRate, setCorporateTaxRate] = useState(constants.corporateTaxRate ?? DEFAULT_TAX_DEPRECIATION.corporateTaxRate);
  const [deprecationPeriods, setDeprecationPeriods] = useState(constants.deprecationPeriods ?? DEFAULT_TAX_DEPRECIATION.deprecationPeriods);

  // Helper function to determine if a value is default (blue) or user-defined (black)
  const getValueStyle = (currentValue, defaultValue) => {
    const isDefault = currentValue === undefined || currentValue === null || currentValue === defaultValue;
    return isDefault ? UI_CONSTANTS.colors.defaultValue : UI_CONSTANTS.colors.userValue;
  };

  // Save values to constants when they change
  useEffect(() => {
    updateConstants('platformOpex', platformOpex);
    updateConstants('platformOpexEscalation', platformOpexEscalation);
    updateConstants('otherOpex', otherOpex);
    updateConstants('dividendPolicy', dividendPolicy);
    updateConstants('minimumCashBalance', minimumCashBalance);
    updateConstants('corporateTaxRate', corporateTaxRate);
    updateConstants('deprecationPeriods', deprecationPeriods);
  }, [
    platformOpex, 
    platformOpexEscalation,
    otherOpex,
    dividendPolicy, 
    minimumCashBalance,
    corporateTaxRate,
    deprecationPeriods,
    updateConstants
  ]);

  // Handle depreciation period changes
  const handleDepreciationChange = (assetType, value) => {
    setDeprecationPeriods(prev => ({
      ...prev,
      [assetType]: parseInt(value) || 0
    }));
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Platform Management Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Management Costs</CardTitle>
          <CardDescription>Settings for managing the overall portfolio platform costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Platform Management Opex</Label>
                <Input 
                  type="number"
                  value={platformOpex}
                  onChange={(e) => setPlatformOpex(parseFloat(e.target.value) || 0)}
                  placeholder="Annual cost in $M"
                  className={getValueStyle(platformOpex, DEFAULT_PLATFORM_COSTS.platformOpex)}
                />
                <p className="text-sm text-gray-500">Annual platform management cost ($M)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Platform Opex Escalation</Label>
                <Input 
                  type="number"
                  value={platformOpexEscalation}
                  onChange={(e) => setPlatformOpexEscalation(parseFloat(e.target.value) || 0)}
                  placeholder="Annual escalation %"
                  className={getValueStyle(platformOpexEscalation, DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}
                />
                <p className="text-sm text-gray-500">Annual increase in platform costs (%)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Other Opex</Label>
                <Input 
                  type="number"
                  value={otherOpex}
                  onChange={(e) => setOtherOpex(parseFloat(e.target.value) || 0)}
                  placeholder="Other annual costs in $M"
                  className={getValueStyle(otherOpex, DEFAULT_PLATFORM_COSTS.otherOpex)}
                />
                <p className="text-sm text-gray-500">Other annual operational costs ($M)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Management Settings</CardTitle>
          <CardDescription>Configure portfolio dividend policy and minimum cash balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Dividend Payout Ratio</Label>
                <Input 
                  type="number"
                  value={dividendPolicy}
                  onChange={(e) => setDividendPolicy(parseFloat(e.target.value) || 0)}
                  placeholder="Dividend payout ratio %"
                  className={getValueStyle(dividendPolicy, DEFAULT_PLATFORM_COSTS.dividendPolicy)}
                />
                <p className="text-sm text-gray-500">Percentage of NPAT distributed as dividends</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label>Minimum Cash Balance</Label>
                <Input 
                  type="number"
                  value={minimumCashBalance}
                  onChange={(e) => setMinimumCashBalance(parseFloat(e.target.value) || 0)}
                  placeholder="Minimum cash balance ($M)"
                  className={getValueStyle(minimumCashBalance, DEFAULT_PLATFORM_COSTS.minimumCashBalance)}
                />
                <p className="text-sm text-gray-500">Minimum cash balance to maintain before paying dividends ($M)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax & Depreciation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax & Depreciation Settings</CardTitle>
          <CardDescription>Configure corporate tax rate and asset depreciation periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Corporate Tax Rate (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={corporateTaxRate}
                  onChange={(e) => setCorporateTaxRate(parseFloat(e.target.value) || 0)}
                  className={`w-full max-w-xs ${getValueStyle(corporateTaxRate, DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}`}
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
                  <Label>Solar</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="40"
                    value={deprecationPeriods.solar}
                    onChange={(e) => handleDepreciationChange('solar', e.target.value)}
                    className={`max-w-xs ${getValueStyle(deprecationPeriods.solar, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar)}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wind</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="40"
                    value={deprecationPeriods.wind}
                    onChange={(e) => handleDepreciationChange('wind', e.target.value)}
                    className={`max-w-xs ${getValueStyle(deprecationPeriods.wind, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind)}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Storage</Label>
                  <Input 
                    type="number"
                    min="1"
                    max="40"
                    value={deprecationPeriods.storage}
                    onChange={(e) => handleDepreciationChange('storage', e.target.value)}
                    className={`max-w-xs ${getValueStyle(deprecationPeriods.storage, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage)}`}
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

      {/* Assets Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets Summary</CardTitle>
          <CardDescription>Overview of all assets in the portfolio with key parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity (MW)</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Capex ($M)</TableHead>
                <TableHead>Opex ($M/pa)</TableHead>
                <TableHead>Terminal Value ($M)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(assets).length > 0 ? (
                Object.values(assets).map((asset) => {
                  const assetCost = constants.assetCosts?.[asset.name] || {};
                  return (
                    <TableRow key={asset.name}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.type ? (asset.type.charAt(0).toUpperCase() + asset.type.slice(1)) : "-"}</TableCell>
                      <TableCell>{asset.capacity || "-"}</TableCell>
                      <TableCell>{asset.state || "-"}</TableCell>
                      <TableCell>{asset.assetStartDate ? new Date(asset.assetStartDate).toLocaleDateString('en-GB') : "-"}</TableCell>
                      <TableCell>{assetCost.capex ? `$${assetCost.capex.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>{assetCost.operatingCosts ? `$${assetCost.operatingCosts.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>{assetCost.terminalValue ? `$${assetCost.terminalValue.toLocaleString()}` : "-"}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                    No assets in portfolio
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformInputs;