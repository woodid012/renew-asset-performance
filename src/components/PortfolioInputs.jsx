import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  DEFAULT_PLATFORM_COSTS,
  DEFAULT_TAX_DEPRECIATION,
  DEFAULT_RISK_PARAMETERS,
  DEFAULT_PROJECT_FINANCE,
  UI_CONSTANTS,
  getDefaultValue
} from '@/lib/default_constants';

const PortfolioInputs = () => {
  const { assets, constants, updateConstants } = usePortfolio();
  
  // Platform operating parameters
  const [platformOpex, setPlatformOpex] = useState(constants.platformOpex ?? DEFAULT_PLATFORM_COSTS.platformOpex);
  const [platformOpexEscalation, setPlatformOpexEscalation] = useState(constants.platformOpexEscalation ?? DEFAULT_PLATFORM_COSTS.platformOpexEscalation);
  const [otherOpex, setOtherOpex] = useState(constants.otherOpex ?? DEFAULT_PLATFORM_COSTS.otherOpex);
  
  // Cash management parameters
  const [dividendPolicy, setDividendPolicy] = useState(constants.dividendPolicy ?? DEFAULT_PLATFORM_COSTS.dividendPolicy);
  const [minimumCashBalance, setMinimumCashBalance] = useState(constants.minimumCashBalance ?? DEFAULT_PLATFORM_COSTS.minimumCashBalance);
  
  // Tax parameters
  const [corporateTaxRate, setCorporateTaxRate] = useState(constants.corporateTaxRate ?? DEFAULT_TAX_DEPRECIATION.corporateTaxRate);
  const [deprecationPeriods, setDeprecationPeriods] = useState(constants.deprecationPeriods ?? DEFAULT_TAX_DEPRECIATION.deprecationPeriods);

  // Risk parameters
  const [volumeVariation, setVolumeVariation] = useState(constants.volumeVariation ?? DEFAULT_RISK_PARAMETERS.volumeVariation);
  const [greenPriceVariation, setGreenPriceVariation] = useState(constants.greenPriceVariation ?? DEFAULT_RISK_PARAMETERS.greenPriceVariation);
  const [energyPriceVariation, setEnergyPriceVariation] = useState(constants.EnergyPriceVariation ?? DEFAULT_RISK_PARAMETERS.EnergyPriceVariation);

  // Helper function to determine if a value is default (blue) or user-defined (black)
  const getValueStyle = (currentValue, defaultValue) => {
    const isDefault = currentValue === undefined || currentValue === null || currentValue === defaultValue;
    return isDefault ? UI_CONSTANTS.colors.defaultValue : UI_CONSTANTS.colors.userValue;
  };

  // Auto-save to constants when values change
  useEffect(() => {
    updateConstants('platformOpex', platformOpex);
    updateConstants('platformOpexEscalation', platformOpexEscalation);
    updateConstants('otherOpex', otherOpex);
    updateConstants('dividendPolicy', dividendPolicy);
    updateConstants('minimumCashBalance', minimumCashBalance);
    updateConstants('corporateTaxRate', corporateTaxRate);
    updateConstants('deprecationPeriods', deprecationPeriods);
    updateConstants('volumeVariation', volumeVariation);
    updateConstants('greenPriceVariation', greenPriceVariation);
    updateConstants('EnergyPriceVariation', energyPriceVariation);
  }, [
    platformOpex, platformOpexEscalation, otherOpex,
    dividendPolicy, minimumCashBalance,
    corporateTaxRate, deprecationPeriods,
    volumeVariation, greenPriceVariation, energyPriceVariation,
    updateConstants
  ]);

  // Handle asset cost changes
  const handleAssetCostChange = (assetName, field, value) => {
    const asset = Object.values(assets).find(a => a.name === assetName);
    if (!asset) return;

    // Process the value based on field type
    let processedValue;
    if (field === 'maxGearing' || field === 'interestRate') {
      processedValue = value === '' ? '' : parseFloat(value) / 100;
    } else {
      processedValue = value === '' ? '' : parseFloat(value);
    }
    
    const updatedAssetCosts = {
      ...constants.assetCosts,
      [assetName]: {
        ...constants.assetCosts[assetName],
        [field]: isNaN(processedValue) ? '' : processedValue
      }
    };
    
    updateConstants('assetCosts', updatedAssetCosts);
  };

  // Handle depreciation period changes
  const handleDepreciationChange = (assetType, value) => {
    setDeprecationPeriods(prev => ({
      ...prev,
      [assetType]: parseInt(value) || 0
    }));
  };

  // Get default value for asset cost field
  const getAssetCostDefault = (field, assetType, capacity) => {
    const parsedCapacity = parseFloat(capacity) || 100;
    
    switch(field) {
      case 'capex':
        return getDefaultValue('capex', 'default', assetType) * parsedCapacity;
      case 'operatingCosts':
        return getDefaultValue('opex', 'default', assetType) * parsedCapacity;
      case 'operatingCostEscalation':
        return DEFAULT_PROJECT_FINANCE.opexEscalation;
      case 'terminalValue':
        return getDefaultValue('terminal', 'default', assetType) * parsedCapacity;
      case 'maxGearing':
        return DEFAULT_PROJECT_FINANCE.maxGearing;
      case 'targetDSCRContract':
        return DEFAULT_PROJECT_FINANCE.targetDSCRContract;
      case 'targetDSCRMerchant':
        return DEFAULT_PROJECT_FINANCE.targetDSCRMerchant;
      case 'interestRate':
        return DEFAULT_PROJECT_FINANCE.interestRate;
      case 'tenorYears':
        return getDefaultValue('finance', 'tenorYears', assetType);
      default:
        return 0;
    }
  };

  return (
    <div className="w-full p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Portfolio Configuration</h1>
        <div className="text-sm text-gray-500">
          All settings auto-save and trigger recalculation
        </div>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="assets">Asset Costs</TabsTrigger>

        </TabsList>

        {/* Platform Management Settings */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Management Costs</CardTitle>
              <CardDescription>Corporate-level operational costs and cash management policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Platform Management Opex ($M/year)</Label>
                    <Input 
                      type="number"
                      value={platformOpex}
                      onChange={(e) => setPlatformOpex(parseFloat(e.target.value) || 0)}
                      placeholder="Annual cost in $M"
                      className={getValueStyle(platformOpex, DEFAULT_PLATFORM_COSTS.platformOpex)}
                    />
                    <p className="text-sm text-gray-500">Annual platform management cost</p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label>Platform Opex Escalation (%/year)</Label>
                    <Input 
                      type="number"
                      value={platformOpexEscalation}
                      onChange={(e) => setPlatformOpexEscalation(parseFloat(e.target.value) || 0)}
                      placeholder="Annual escalation %"
                      className={getValueStyle(platformOpexEscalation, DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}
                    />
                    <p className="text-sm text-gray-500">Annual increase in platform costs</p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label>Other Opex ($M/year)</Label>
                    <Input 
                      type="number"
                      value={otherOpex}
                      onChange={(e) => setOtherOpex(parseFloat(e.target.value) || 0)}
                      placeholder="Other annual costs in $M"
                      className={getValueStyle(otherOpex, DEFAULT_PLATFORM_COSTS.otherOpex)}
                    />
                    <p className="text-sm text-gray-500">Other annual operational costs</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Dividend Payout Ratio (%)</Label>
                    <Input 
                      type="number"
                      value={dividendPolicy}
                      onChange={(e) => setDividendPolicy(parseFloat(e.target.value) || 0)}
                      placeholder="Dividend payout ratio %"
                      className={getValueStyle(dividendPolicy, DEFAULT_PLATFORM_COSTS.dividendPolicy)}
                    />
                    <p className="text-sm text-gray-500">Percentage of NPAT distributed as dividends</p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label>Minimum Cash Balance ($M)</Label>
                    <Input 
                      type="number"
                      value={minimumCashBalance}
                      onChange={(e) => setMinimumCashBalance(parseFloat(e.target.value) || 0)}
                      placeholder="Minimum cash balance ($M)"
                      className={getValueStyle(minimumCashBalance, DEFAULT_PLATFORM_COSTS.minimumCashBalance)}
                    />
                    <p className="text-sm text-gray-500">Minimum cash balance before paying dividends</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Costs & Project Finance */}
        <TabsContent value="assets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Costs & Project Finance</CardTitle>
              <CardDescription>Capital costs, operating costs, and debt parameters for each asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity (MW)</TableHead>
                      <TableHead>CAPEX ($M)</TableHead>
                      <TableHead>Opex ($M/year)</TableHead>
                      <TableHead>Opex Escalation (%)</TableHead>
                      <TableHead>Terminal Value ($M)</TableHead>
                      <TableHead>Max Gearing (%)</TableHead>
                      <TableHead>DSCR Contract</TableHead>
                      <TableHead>DSCR Merchant</TableHead>
                      <TableHead>Interest Rate (%)</TableHead>
                      <TableHead>Tenor (years)</TableHead>
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
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.capex || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'capex', e.target.value)}
                                className="w-24"
                                placeholder={getAssetCostDefault('capex', asset.type, asset.capacity).toFixed(1)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.operatingCosts || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                                className="w-24"
                                placeholder={getAssetCostDefault('operatingCosts', asset.type, asset.capacity).toFixed(2)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.operatingCostEscalation || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('operatingCostEscalation', asset.type, asset.capacity)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.terminalValue || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'terminalValue', e.target.value)}
                                className="w-24"
                                placeholder={getAssetCostDefault('terminalValue', asset.type, asset.capacity).toFixed(1)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.maxGearing ? (assetCost.maxGearing * 100).toFixed(1) : ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'maxGearing', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('maxGearing', asset.type, asset.capacity)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.targetDSCRContract || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRContract', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('targetDSCRContract', asset.type, asset.capacity)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.targetDSCRMerchant || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('targetDSCRMerchant', asset.type, asset.capacity)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.interestRate ? (assetCost.interestRate * 100).toFixed(1) : ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'interestRate', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('interestRate', asset.type, asset.capacity)}
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Input
                                type="number"
                                value={assetCost.tenorYears || ''}
                                onChange={(e) => handleAssetCostChange(asset.name, 'tenorYears', e.target.value)}
                                className="w-20"
                                placeholder={getAssetCostDefault('tenorYears', asset.type, asset.capacity)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">
                          No assets in portfolio
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


  
      </Tabs>
    </div>
  );
};

export default PortfolioInputs;