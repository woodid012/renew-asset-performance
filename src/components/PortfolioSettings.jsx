import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_CAPEX_RATES,
  DEFAULT_OPEX_RATES,
  DEFAULT_PROJECT_FINANCE,
  DEFAULT_PLATFORM_COSTS,
  DEFAULT_TAX_DEPRECIATION,
  DEFAULT_DISCOUNT_RATES,
  DEFAULT_RISK_PARAMETERS,
  DEFAULT_PRICE_SETTINGS,
  DEFAULT_DATA_SOURCES,
  formatPercent,
  formatCurrency,
  formatRate,
  formatMultiplier,
  formatYears,
  UI_CONSTANTS
} from '@/lib/default_constants';

const PortfolioSettings = () => {

  const getDefaultPriceCurveDisplayName = () => {
    const sourceItem = DEFAULT_DATA_SOURCES.availableSources.find(s => s.value === DEFAULT_DATA_SOURCES.defaultSource);
    return sourceItem ? sourceItem.label : DEFAULT_DATA_SOURCES.defaultSource;
  };

  return (
    <div className={UI_CONSTANTS.spacing.cardGap + ' ' + UI_CONSTANTS.spacing.contentPadding}>
      {/* Price Curve Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Default price curve data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price Curve Source</label>
            <div className="w-64 p-2 border rounded-md bg-gray-100 text-sm">
              {getDefaultPriceCurveDisplayName()}
            </div>
            <p className="text-sm text-gray-500">The default source for price curves.</p>
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
                <TableCell className={UI_CONSTANTS.colors.tableHeader}>Solar</TableCell>
                <TableCell>{formatRate(DEFAULT_CAPEX_RATES.solar)}</TableCell>
                <TableCell>{formatRate(DEFAULT_OPEX_RATES.solar)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={UI_CONSTANTS.colors.tableHeader}>Wind</TableCell>
                <TableCell>{formatRate(DEFAULT_CAPEX_RATES.wind)}</TableCell>
                <TableCell>{formatRate(DEFAULT_OPEX_RATES.wind)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={UI_CONSTANTS.colors.tableHeader}>Storage</TableCell>
                <TableCell>{formatRate(DEFAULT_CAPEX_RATES.storage)}</TableCell>
                <TableCell>{formatRate(DEFAULT_OPEX_RATES.storage)}</TableCell>
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
          <div className={`grid grid-cols-2 ${UI_CONSTANTS.spacing.gridGap}`}>
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
                    <TableCell>{formatPercent(DEFAULT_PROJECT_FINANCE.maxGearing)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Target DSCR (Contract)</TableCell>
                    <TableCell>{formatMultiplier(DEFAULT_PROJECT_FINANCE.targetDSCRContract)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Target DSCR (Merchant)</TableCell>
                    <TableCell>{formatMultiplier(DEFAULT_PROJECT_FINANCE.targetDSCRMerchant)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Interest Rate</TableCell>
                    <TableCell>{formatPercent(DEFAULT_PROJECT_FINANCE.interestRate)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Opex Escalation</TableCell>
                    <TableCell>{formatPercent(DEFAULT_PROJECT_FINANCE.opexEscalation)}</TableCell>
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
                    <TableCell>{DEFAULT_PROJECT_FINANCE.tenorYears.solar}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Wind</TableCell>
                    <TableCell>{DEFAULT_PROJECT_FINANCE.tenorYears.wind}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Storage</TableCell>
                    <TableCell>{DEFAULT_PROJECT_FINANCE.tenorYears.storage}</TableCell>
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
            Default platform-level cost and cash management parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Platform Management Opex</TableCell>
                <TableCell>{formatCurrency(DEFAULT_PLATFORM_COSTS.platformOpex)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Other Opex</TableCell>
                <TableCell>{formatCurrency(DEFAULT_PLATFORM_COSTS.otherOpex)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Platform Opex Escalation</TableCell>
                <TableCell>{formatPercent(DEFAULT_PLATFORM_COSTS.platformOpexEscalation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Dividend Payout Ratio</TableCell>
                <TableCell>{formatPercent(DEFAULT_PLATFORM_COSTS.dividendPolicy)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Minimum Cash Balance</TableCell>
                <TableCell>{formatCurrency(DEFAULT_PLATFORM_COSTS.minimumCashBalance)}</TableCell>
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
            Default tax rate and asset depreciation parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-2 ${UI_CONSTANTS.spacing.gridGap}`}>
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
                    <TableCell>Corporate Tax Rate</TableCell>
                    <TableCell>{formatPercent(DEFAULT_TAX_DEPRECIATION.corporateTaxRate)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Type</TableHead>
                    <TableHead>Default Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Solar</TableCell>
                    <TableCell>{formatYears(DEFAULT_TAX_DEPRECIATION.deprecationPeriods.solar)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Wind</TableCell>
                    <TableCell>{formatYears(DEFAULT_TAX_DEPRECIATION.deprecationPeriods.wind)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Storage</TableCell>
                    <TableCell>{formatYears(DEFAULT_TAX_DEPRECIATION.deprecationPeriods.storage)}</TableCell>
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
            Default discount rates used for NPV calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rate Type</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Contracted Revenue</TableCell>
                <TableCell>{formatPercent(DEFAULT_DISCOUNT_RATES.contract)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Merchant Revenue</TableCell>
                <TableCell>{formatPercent(DEFAULT_DISCOUNT_RATES.merchant)}</TableCell>
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
            Default sensitivity analysis parameters for Monte Carlo simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Volume Variation</TableCell>
                <TableCell>±{formatPercent(DEFAULT_RISK_PARAMETERS.volumeVariation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Energy Price Variation</TableCell>
                <TableCell>±{formatPercent(DEFAULT_RISK_PARAMETERS.EnergyPriceVariation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Green Price Variation</TableCell>
                <TableCell>±{formatPercent(DEFAULT_RISK_PARAMETERS.greenPriceVariation)}</TableCell>
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
            Default real-to-nominal price conversion parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Default Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Escalation Rate</TableCell>
                <TableCell>{formatPercent(DEFAULT_PRICE_SETTINGS.escalation)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Reference Year</TableCell>
                <TableCell>{DEFAULT_PRICE_SETTINGS.referenceYear}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;