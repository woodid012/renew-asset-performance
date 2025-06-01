import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolio } from '@/contexts/PortfolioContext';

// Default values from the codebase
const DEFAULT_CAPEX_RATES = {
  solar: 1.2,   // $M per MW
  wind: 2.5,    // $M per MW
  storage: 1.6, // $M per MW
  default: 2.0  // $M per MW
};

const DEFAULT_OPEX_RATES = {
  solar: 0.014,    // $M per MW per annum
  wind: 0.040,     // $M per MW per annum
  storage: 0.015,  // $M per MW per annum
  default: 0.030   // $M per MW per annum
};

const DEFAULT_PROJECT_FINANCE = {
  maxGearing: 70,              // %
  targetDSCRContract: 1.35,    // x
  targetDSCRMerchant: 2.00,    // x
  interestRate: 6.0,           // %
  opexEscalation: 2.5,         // %
  tenorYears: {
    solar: 22,
    wind: 22,
    storage: 18,
    default: 20
  }
};

const DEFAULT_PLATFORM_COSTS = {
  platformOpex: 4.2,           // $M per annum
  otherOpex: 1.0,              // $M per annum
  platformOpexEscalation: 2.5, // %
  dividendPolicy: 85,          // %
  minimumCashBalance: 5.0      // $M
};

const DEFAULT_TAX_DEPRECIATION = {
  corporateTaxRate: 0,         // %
  deprecationPeriods: {
    solar: 30,                 // years
    wind: 30,                  // years
    storage: 20                // years
  }
};

const DEFAULT_DISCOUNT_RATES = {
  contract: 8.0,               // %
  merchant: 10.0               // %
};

const DEFAULT_RISK_PARAMETERS = {
  volumeVariation: 20,         // ±%
  EnergyPriceVariation: 20,    // ±%
  greenPriceVariation: 20      // ±%
};

const DEFAULT_PRICE_SETTINGS = {
  escalation: 2.5,             // %
  referenceYear: new Date().getFullYear()
};

const PortfolioSettings = () => {
  const { 
    constants,
    priceCurveSource,
    setPriceCurveSource
  } = usePortfolio();

  const getPriceCurveDisplayName = (source) => {
    switch(source) {
      case 'merchant_price_monthly.csv':
        return 'Monthly Merchant Prices';
      case 'imported':
        return 'Imported Prices';
      default:
        return source;
    }
  };

  // Helper function to determine if a value is default (blue) or user-defined (black)
  const getValueStyle = (currentValue, defaultValue) => {
    const isDefault = currentValue === undefined || currentValue === defaultValue;
    return isDefault ? 'text-blue-600' : 'text-black';
  };

  const formatPercent = (value) => `${value}%`;
  const formatCurrency = (value) => `$${value}M`;
  const formatRate = (value) => `$${value}M/MW`;

  return (
    <div className="space-y-6 p-4">
      {/* Price Curve Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Configure price curve data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Curve Source</label>
              <Select 
                value={priceCurveSource}
                onValueChange={setPriceCurveSource}
              >
                <SelectTrigger className="w-64">
                  <SelectValue>
                    {getPriceCurveDisplayName(priceCurveSource)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant_price_monthly.csv">Monthly Merchant Prices</SelectItem>
                  <SelectItem value="imported">Imported Prices</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">Select the source for price curves</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Asset Cost Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Default Asset Cost Parameters</CardTitle>
          <CardDescription>
            Default values used when creating new assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Type</TableHead>
                <TableHead>Default Capex Rate</TableHead>
                <TableHead>Default Opex Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Solar</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_CAPEX_RATES.solar)}</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_OPEX_RATES.solar)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Wind</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_CAPEX_RATES.wind)}</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_OPEX_RATES.wind)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Storage</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_CAPEX_RATES.storage)}</TableCell>
                <TableCell className="text-blue-600">{formatRate(DEFAULT_OPEX_RATES.storage)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Default Project Finance Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Default Project Finance Parameters</CardTitle>
          <CardDescription>
            Default debt and financing assumptions for new assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Default Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Maximum Gearing</TableCell>
                    <TableCell className="text-blue-600">{formatPercent(DEFAULT_PROJECT_FINANCE.maxGearing)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Target DSCR (Contract)</TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_PROJECT_FINANCE.targetDSCRContract}x</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Target DSCR (Merchant)</TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_PROJECT_FINANCE.targetDSCRMerchant}x</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Interest Rate</TableCell>
                    <TableCell className="text-blue-600">{formatPercent(DEFAULT_PROJECT_FINANCE.interestRate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Opex Escalation</TableCell>
                    <TableCell className="text-blue-600">{formatPercent(DEFAULT_PROJECT_FINANCE.opexEscalation)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Type</TableHead>
                    <TableHead>Default Tenor (Years)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Solar</TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_PROJECT_FINANCE.tenorYears.solar}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Wind</TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_PROJECT_FINANCE.tenorYears.wind}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Storage</TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_PROJECT_FINANCE.tenorYears.storage}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Management Settings</CardTitle>
          <CardDescription>
            Current platform-level cost and cash management parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Platform Management Opex</TableCell>
                <TableCell className={getValueStyle(constants.platformOpex, DEFAULT_PLATFORM_COSTS.platformOpex)}>
                  {formatCurrency(constants.platformOpex || DEFAULT_PLATFORM_COSTS.platformOpex)}
                </TableCell>
                <TableCell className="text-blue-600">{formatCurrency(DEFAULT_PLATFORM_COSTS.platformOpex)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Other Opex</TableCell>
                <TableCell className={getValueStyle(constants.otherOpex, DEFAULT_PLATFORM_COSTS.otherOpex)}>
                  {formatCurrency(constants.otherOpex || DEFAULT_PLATFORM_COSTS.otherOpex)}
                </TableCell>
                <TableCell className="text-blue-600">{formatCurrency(DEFAULT_PLATFORM_COSTS.otherOpex)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Platform Opex Escalation</TableCell>
                <TableCell className={getValueStyle(constants.platformOpexEscalation, DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}>
                  {formatPercent(constants.platformOpexEscalation || DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}
                </TableCell>
                <TableCell className="text-blue-600">{formatPercent(DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Dividend Payout Ratio</TableCell>
                <TableCell className={getValueStyle(constants.dividendPolicy, DEFAULT_PLATFORM_COSTS.dividendPolicy)}>
                  {formatPercent(constants.dividendPolicy || DEFAULT_PLATFORM_COSTS.dividendPolicy)}
                </TableCell>
                <TableCell className="text-blue-600">{formatPercent(DEFAULT_PLATFORM_COSTS.dividendPolicy)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Minimum Cash Balance</TableCell>
                <TableCell className={getValueStyle(constants.minimumCashBalance, DEFAULT_PLATFORM_COSTS.minimumCashBalance)}>
                  {formatCurrency(constants.minimumCashBalance || DEFAULT_PLATFORM_COSTS.minimumCashBalance)}
                </TableCell>
                <TableCell className="text-blue-600">{formatCurrency(DEFAULT_PLATFORM_COSTS.minimumCashBalance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax & Depreciation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax & Depreciation Settings</CardTitle>
          <CardDescription>
            Current tax rate and asset depreciation parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Default Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Corporate Tax Rate</TableCell>
                    <TableCell className={getValueStyle(constants.corporateTaxRate, DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}>
                      {formatPercent(constants.corporateTaxRate || DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}
                    </TableCell>
                    <TableCell className="text-blue-600">{formatPercent(DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Type</TableHead>
                    <TableHead>Current Period</TableHead>
                    <TableHead>Default Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Solar</TableCell>
                    <TableCell className={getValueStyle(constants.deprecationPeriods?.solar, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar)}>
                      {constants.deprecationPeriods?.solar || DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar} years
                    </TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar} years</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Wind</TableCell>
                    <TableCell className={getValueStyle(constants.deprecationPeriods?.wind, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind)}>
                      {constants.deprecationPeriods?.wind || DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind} years
                    </TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind} years</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Storage</TableCell>
                    <TableCell className={getValueStyle(constants.deprecationPeriods?.storage, DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage)}>
                      {constants.deprecationPeriods?.storage || DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage} years
                    </TableCell>
                    <TableCell className="text-blue-600">{DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage} years</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Discount Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Discount Rates</CardTitle>
          <CardDescription>
            Current discount rates used for NPV calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rate Type</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Contracted Revenue</TableCell>
                <TableCell className={getValueStyle(constants.discountRates?.contract, DEFAULT_DISCOUNT_RATES.contract / 100)}>
                  {formatPercent((constants.discountRates?.contract || DEFAULT_DISCOUNT_RATES.contract / 100) * 100)}
                </TableCell>
                <TableCell className="text-blue-600">{formatPercent(DEFAULT_DISCOUNT_RATES.contract)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Merchant Revenue</TableCell>
                <TableCell className={getValueStyle(constants.discountRates?.merchant, DEFAULT_DISCOUNT_RATES.merchant / 100)}>
                  {formatPercent((constants.discountRates?.merchant || DEFAULT_DISCOUNT_RATES.merchant / 100) * 100)}
                </TableCell>
                <TableCell className="text-blue-600">{formatPercent(DEFAULT_DISCOUNT_RATES.merchant)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Risk Analysis Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis Parameters</CardTitle>
          <CardDescription>
            Current sensitivity analysis parameters for Monte Carlo simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Volume Variation</TableCell>
                <TableCell className={getValueStyle(constants.volumeVariation, DEFAULT_RISK_PARAMETERS.volumeVariation)}>
                  ±{formatPercent(constants.volumeVariation || DEFAULT_RISK_PARAMETERS.volumeVariation)}
                </TableCell>
                <TableCell className="text-blue-600">±{formatPercent(DEFAULT_RISK_PARAMETERS.volumeVariation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Energy Price Variation</TableCell>
                <TableCell className={getValueStyle(constants.EnergyPriceVariation, DEFAULT_RISK_PARAMETERS.EnergyPriceVariation)}>
                  ±{formatPercent(constants.EnergyPriceVariation || DEFAULT_RISK_PARAMETERS.EnergyPriceVariation)}
                </TableCell>
                <TableCell className="text-blue-600">±{formatPercent(DEFAULT_RISK_PARAMETERS.EnergyPriceVariation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Green Price Variation</TableCell>
                <TableCell className={getValueStyle(constants.greenPriceVariation, DEFAULT_RISK_PARAMETERS.greenPriceVariation)}>
                  ±{formatPercent(constants.greenPriceVariation || DEFAULT_RISK_PARAMETERS.greenPriceVariation)}
                </TableCell>
                <TableCell className="text-blue-600">±{formatPercent(DEFAULT_RISK_PARAMETERS.greenPriceVariation)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Price Escalation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Price Escalation Settings</CardTitle>
          <CardDescription>
            Current real-to-nominal price conversion parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Escalation Rate</TableCell>
                <TableCell className={getValueStyle(constants.escalation, DEFAULT_PRICE_SETTINGS.escalation)}>
                  {formatPercent(constants.escalation || DEFAULT_PRICE_SETTINGS.escalation)}
                </TableCell>
                <TableCell className="text-blue-600">{formatPercent(DEFAULT_PRICE_SETTINGS.escalation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Reference Year</TableCell>
                <TableCell className={getValueStyle(constants.referenceYear, DEFAULT_PRICE_SETTINGS.referenceYear)}>
                  {constants.referenceYear || DEFAULT_PRICE_SETTINGS.referenceYear}
                </TableCell>
                <TableCell className="text-blue-600">{DEFAULT_PRICE_SETTINGS.referenceYear}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Guide</CardTitle>
          <CardDescription>
            Understanding the default values and color coding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Color Coding</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-sm text-blue-600">Blue text indicates default values</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-black rounded"></div>
                  <span className="text-sm text-black">Black text indicates user-defined values</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">How to Modify Settings</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Asset costs and project finance parameters can be modified in the Asset Definition tab</li>
                <li>• Platform management settings are available in the Platform Valuation > Platform Inputs tab</li>
                <li>• Risk analysis parameters can be adjusted in the Risk Analysis tab</li>
                <li>• Discount rates for valuation are set in the Platform Valuation > Platform Inputs tab</li>
                <li>• Price escalation settings are available in the Price Inputs tab</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;