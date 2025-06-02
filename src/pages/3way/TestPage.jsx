import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

import { mockPortfolioData } from './components/PortfolioData';
import { calculateForecastData, formatCurrency, formatPercent } from './components/forecastCalculations';
import ProfitLossStatement from './components/ProfitLossStatement';
import BalanceSheet from './components/BalanceSheet';
import CashFlowStatement from './components/CashFlowStatement';

const Australian3WayForecast = () => {
  const [selectedScenario, setSelectedScenario] = useState('base');
  const [showQuarterly, setShowQuarterly] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2025);

  // Calculate comprehensive 3-way forecast data
  const forecastData = useMemo(() => {
    return calculateForecastData(mockPortfolioData, selectedScenario);
  }, [selectedScenario]);

  const years = forecastData.map(item => item.year);

  const handleExport = () => {
    // Create comprehensive export data
    const exportData = {
      portfolio: 'Australian Renewable Assets Portfolio',
      forecastPeriod: `${years[0]} - ${years[years.length - 1]}`,
      scenario: selectedScenario,
      exportDate: new Date().toISOString(),
      
      profitAndLoss: forecastData.map(item => ({
        year: item.year,
        revenue: item.grossRevenue,
        operatingExpenses: item.totalOperatingExpenses,
        ebitda: item.ebitda,
        depreciation: item.annualDepreciation,
        ebit: item.ebit,
        interestExpense: item.interestExpense,
        profitBeforeTax: item.profitBeforeTax,
        taxExpense: item.taxExpense,
        netProfitAfterTax: item.netProfitAfterTax
      })),
      
      balanceSheet: forecastData.map(item => ({
        year: item.year,
        totalCurrentAssets: item.totalCurrentAssets,
        totalNonCurrentAssets: item.totalNonCurrentAssets,
        totalAssets: item.totalAssets,
        totalCurrentLiabilities: item.totalCurrentLiabilities,
        totalNonCurrentLiabilities: item.totalNonCurrentLiabilities,
        totalLiabilities: item.totalLiabilities,
        totalEquity: item.totalEquity
      })),
      
      cashFlow: forecastData.map(item => ({
        year: item.year,
        operatingCashFlow: item.operatingCashFlow,
        investingCashFlow: item.investingCashFlow,
        financingCashFlow: item.financingCashFlow,
        netCashFlow: item.netCashFlow
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `3way_forecast_${selectedScenario}_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  return (
    <div className="w-full p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Australian Standard 3-Way Financial Forecast</h1>
          <p className="text-gray-600 mt-2">AASB compliant Profit & Loss, Balance Sheet, and Cash Flow projections</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select scenario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base Case</SelectItem>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="optimistic">Optimistic</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Forecast
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(forecastData[0]?.totalAssets || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Assets</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(forecastData.reduce((sum, item) => sum + item.netProfitAfterTax, 0))}
            </div>
            <p className="text-sm text-muted-foreground">10-Year Total NPAT</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {formatPercent(forecastData[0]?.ebitdaMargin || 0)}
            </div>
            <p className="text-sm text-muted-foreground">EBITDA Margin (Year 1)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {formatPercent(forecastData[0]?.returnOnAssets || 0)}
            </div>
            <p className="text-sm text-muted-foreground">Return on Assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Forecast Tables */}
      <Tabs defaultValue="profit-loss" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="profit-loss">
          <ProfitLossStatement forecastData={forecastData} years={years} />
        </TabsContent>

        <TabsContent value="balance-sheet">
          <BalanceSheet forecastData={forecastData} years={years} />
        </TabsContent>

        <TabsContent value="cash-flow">
          <CashFlowStatement forecastData={forecastData} years={years} />
        </TabsContent>
      </Tabs>

      {/* Financial Ratios & Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Key Financial Ratios & Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Liquidity Ratios */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Liquidity Ratios</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ratio</TableHead>
                    {years.slice(0, 5).map(year => (
                      <TableHead key={year} className="text-right">{year}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Current Ratio</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {item.currentRatio.toFixed(2)}x
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Cash Ratio</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {(item.cashAndBankBalances / item.totalCurrentLiabilities).toFixed(2)}x
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Profitability Ratios */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Profitability Ratios</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ratio</TableHead>
                    {years.slice(0, 5).map(year => (
                      <TableHead key={year} className="text-right">{year}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>EBITDA Margin</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {formatPercent(item.ebitdaMargin)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Return on Assets</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {formatPercent(item.returnOnAssets)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Return on Equity</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {formatPercent((item.netProfitAfterTax / item.totalEquity) * 100)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Leverage Ratios */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Leverage Ratios</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ratio</TableHead>
                    {years.slice(0, 5).map(year => (
                      <TableHead key={year} className="text-right">{year}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Debt-to-Equity</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {item.debtToEquity.toFixed(2)}x
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Debt-to-Assets</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {(item.totalLiabilities / item.totalAssets).toFixed(2)}x
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Interest Coverage</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {item.interestExpense > 0 ? (item.ebit / item.interestExpense).toFixed(2) : 'N/A'}x
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Activity Ratios */}
            <div>
              <h4 className="font-semibold text-lg mb-3">Activity Ratios</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ratio</TableHead>
                    {years.slice(0, 5).map(year => (
                      <TableHead key={year} className="text-right">{year}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Asset Turnover</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {(item.grossRevenue / item.totalAssets).toFixed(2)}x
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell>Receivables Turnover</TableCell>
                    {forecastData.slice(0, 5).map(item => (
                      <TableCell key={item.year} className="text-right">
                        {(item.grossRevenue / item.accountsReceivable).toFixed(1)}x
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Notes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Australian Accounting Standards Compliance</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <p><strong>AASB 101 - Presentation of Financial Statements:</strong> Structure and presentation of P&L and Balance Sheet follows prescribed format</p>
          <p><strong>AASB 107 - Statement of Cash Flows:</strong> Direct method used for operating activities classification</p>
          <p><strong>AASB 116 - Property, Plant and Equipment:</strong> Straight-line depreciation applied over useful life</p>
          <p><strong>AASB 112 - Income Taxes:</strong> Current tax liabilities recognised based on taxable income</p>
          <p><strong>AASB 132 - Financial Instruments:</strong> Debt and equity classification per substance over form</p>
          <p><strong>AASB 15 - Revenue from Contracts:</strong> Revenue recognition over time for energy generation contracts</p>
        </CardContent>
      </Card>

      {/* Notes to Financial Statements */}
      <Card>
        <CardHeader>
          <CardTitle>Notes to the Financial Statements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">1. Basis of Preparation</h4>
            <p className="text-sm text-gray-600">
              These financial statements have been prepared in accordance with Australian Accounting Standards (AASB) 
              and the Corporations Act 2001. The financial statements are presented in Australian dollars and all 
              values are rounded to the nearest million dollars unless otherwise noted.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold">2. Significant Accounting Policies</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Revenue Recognition:</strong> Revenue from energy sales is recognised over time as electricity is generated and delivered.</p>
              <p><strong>Property, Plant & Equipment:</strong> Renewable energy assets are carried at cost less accumulated depreciation.</p>
              <p><strong>Depreciation:</strong> Assets are depreciated on a straight-line basis over their useful economic lives.</p>
              <p><strong>Financial Instruments:</strong> Financial assets and liabilities are initially recognised at fair value.</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold">3. Critical Estimates and Judgments</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Useful Lives:</strong> Solar assets 30 years, Wind assets 25 years, Storage assets 20 years</p>
              <p><strong>Revenue Forecasts:</strong> Based on long-term power purchase agreements and merchant price projections</p>
              <p><strong>Impairment:</strong> Assets reviewed for impairment indicators at each reporting date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Australian3WayForecast;