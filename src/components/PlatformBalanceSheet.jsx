import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from './PlatformPL_Calculations';

const PlatformBalanceSheet = ({ plData, cashFlowData, selectedRevenueCase, timeView = 'annual' }) => {
  const { assets, constants } = usePortfolio();
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [initialEquity, setInitialEquity] = useState({
    newInvestors: 150, // Default $150M from new investors
    zenContribution: 100, // Default $100M from ZEN
    assetCoRepayment: -50 // Default $50M repayment to AssetCo
  });

  // Balance sheet data calculation
  const balanceSheetData = useMemo(() => {
    if (!plData || !plData.platformPL || !cashFlowData) return [];

    // Use annual or quarterly data as appropriate
    const pnlData = timeView === 'annual' ? plData.platformPL : plData.quarters;
    const cfData = timeView === 'annual' ? cashFlowData.annual : cashFlowData.quarterly;
    
    if (!pnlData || !cfData || pnlData.length === 0 || cfData.length === 0) return [];

    // Get total initial capex from all assets
    const totalCapex = Object.values(assets).reduce((sum, asset) => {
      const assetCosts = constants.assetCosts[asset.name] || {};
      return sum + (assetCosts.capex || 0);
    }, 0);

    // Acquisition premium (goodwill) - difference between total investment and capex
    const totalInvestment = initialEquity.newInvestors + initialEquity.zenContribution + 
                          Math.abs(initialEquity.assetCoRepayment);
    const acquisitionPremium = Math.max(0, totalInvestment - totalCapex);

    // Calculate running balance sheet for each period
    const results = [];
    
    for (let index = 0; index < pnlData.length; index++) {
      const period = pnlData[index];
      
      // Match with corresponding cash flow period
      const cfPeriod = cfData.find(cf => cf.period === period.period) || {
        cashBalance: 0,
        interest: 0,
        tax: 0,
        dividend: 0,
        principalRepayment: 0
      };

      // Construct balance sheet
      const balanceSheet = {
        period: period.period,
        // ASSETS
        // Current assets
        cash: cfPeriod.cashBalance || 0,
        acquisitionPremium: acquisitionPremium,
        totalCurrentAssets: (cfPeriod.cashBalance || 0) + acquisitionPremium,
        
        // Non-current assets
        equityInvestments: totalCapex,
        deferredTaxAssets: index > 0 ? 
          Math.max(0, -period.tax + (pnlData[index-1].tax || 0)) : 
          Math.max(0, -period.tax),
        totalNonCurrentAssets: totalCapex + (index > 0 ? 
          Math.max(0, -period.tax + (pnlData[index-1].tax || 0)) : 
          Math.max(0, -period.tax)),
        
        // LIABILITIES
        // Current liabilities
        tradePayables: -(period.assetOpex + period.platformOpex) * 0.08, // Assume 1 month of opex
        interestPayables: cfPeriod.interest * -0.25, // Assume one quarter of interest
        taxPayables: period.tax < 0 ? period.tax * -0.25 : 0, // One quarter of tax if tax is payable
        dividendPayables: cfPeriod.dividend < 0 ? cfPeriod.dividend * -0.25 : 0, // One quarter of declared dividends
        
        // Non-current liabilities
        portfolioFinancing: index === 0 ? 
          // Initial debt
          -Object.values(assets).reduce((sum, asset) => {
            const assetCosts = constants.assetCosts[asset.name] || {};
            const gearing = assetCosts.calculatedGearing || assetCosts.maxGearing || 0.7;
            return sum + ((assetCosts.capex || 0) * gearing);
          }, 0) : 
          // Running debt balance: previous balance + principal repayments
          (results[index-1]?.portfolioFinancing || 0) + 
          (cfPeriod.principalRepayment || 0),
        
        deferredTaxLiabilities: index > 0 ?
          Math.max(0, period.tax - (pnlData[index-1]?.tax || 0)) :
          Math.max(0, period.tax),
      };
      
      // Calculate totals
      balanceSheet.totalCurrentLiabilities = balanceSheet.tradePayables + 
                                           balanceSheet.interestPayables + 
                                           balanceSheet.taxPayables + 
                                           balanceSheet.dividendPayables;
      
      balanceSheet.totalNonCurrentLiabilities = balanceSheet.portfolioFinancing + 
                                              balanceSheet.deferredTaxLiabilities;
      
      balanceSheet.totalLiabilities = balanceSheet.totalCurrentLiabilities + 
                                    balanceSheet.totalNonCurrentLiabilities;
      
      balanceSheet.totalAssets = balanceSheet.totalCurrentAssets + 
                               balanceSheet.totalNonCurrentAssets;
      
      balanceSheet.netAssets = balanceSheet.totalAssets + balanceSheet.totalLiabilities;
      
      // EQUITY section
      // For initial period, use the provided equity structure
      if (index === 0) {
        balanceSheet.newInvestorsCapital = initialEquity.newInvestors;
        balanceSheet.zenContribution = initialEquity.zenContribution;
        balanceSheet.assetCoRepayment = initialEquity.assetCoRepayment;
        balanceSheet.retainedEarnings = 0;
      } else {
        // For subsequent periods, carry forward equity components and update retained earnings
        balanceSheet.newInvestorsCapital = results[index-1].newInvestorsCapital;
        balanceSheet.zenContribution = results[index-1].zenContribution;
        balanceSheet.assetCoRepayment = results[index-1].assetCoRepayment;
        
        // Update retained earnings: previous + NPAT - dividends
        balanceSheet.retainedEarnings = results[index-1].retainedEarnings + 
                                      period.npat + 
                                      (cfPeriod.dividend || 0); // Note: dividend is negative in CF
      }
      
      // Total equity
      balanceSheet.totalEquity = balanceSheet.newInvestorsCapital + 
                               balanceSheet.zenContribution + 
                               balanceSheet.assetCoRepayment + 
                               balanceSheet.retainedEarnings;
      
      // Verify balance sheet equation: Assets = Liabilities + Equity
      balanceSheet.balanceCheck = Math.abs(
        balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity)
      ) < 0.01; // Allow small rounding errors
      
      results.push(balanceSheet);
    }
    
    return results;
  }, [plData, cashFlowData, assets, constants, initialEquity, timeView]);

  // Set initial selected period when data changes
  useEffect(() => {
    if (balanceSheetData && balanceSheetData.length > 0 && !selectedPeriod) {
      setSelectedPeriod(balanceSheetData[0].period);
    }
  }, [balanceSheetData, selectedPeriod]);

  // Get the selected balance sheet period data
  const selectedBalanceSheet = useMemo(() => {
    if (!balanceSheetData || balanceSheetData.length === 0 || !selectedPeriod) return null;
    return balanceSheetData.find(bs => bs.period === selectedPeriod);
  }, [balanceSheetData, selectedPeriod]);

  // Handle data set on equity split
  const handleEquityChange = (field, value) => {
    setInitialEquity(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  if (!selectedBalanceSheet) {
    return (
      <div className="w-full p-4 space-y-4">
        <Card>
          <CardContent className="flex justify-center items-center h-32">
            <p className="text-gray-500">No balance sheet data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Balance Sheet</CardTitle>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={`Select ${timeView === 'quarterly' ? 'Quarter' : 'Year'}`} />
                </SelectTrigger>
                <SelectContent>
                  {balanceSheetData.map(period => (
                    <SelectItem key={period.period} value={period.period}>
                      {timeView === 'quarterly' ? `Quarter: ${period.period}` : `Year: ${period.period}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm bg-blue-50 border border-blue-200 px-3 py-1 rounded">
                {selectedRevenueCase.charAt(0).toUpperCase() + selectedRevenueCase.slice(1)} Case
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Equity Structure Inputs */}
          <div className="mb-8 bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-4">Initial Equity Structure</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>New Investors ($M)</Label>
                <Input
                  type="number"
                  value={initialEquity.newInvestors}
                  onChange={(e) => handleEquityChange('newInvestors', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ZEN Contribution ($M)</Label>
                <Input
                  type="number"
                  value={initialEquity.zenContribution}
                  onChange={(e) => handleEquityChange('zenContribution', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>AssetCo Repayment ($M)</Label>
                <Input
                  type="number"
                  value={initialEquity.assetCoRepayment}
                  onChange={(e) => handleEquityChange('assetCoRepayment', e.target.value)}
                />
                <p className="text-xs text-gray-500">Enter as negative number</p>
              </div>
            </div>
          </div>
          
          {/* Balance Sheet Table */}
          <div className="grid grid-cols-2 gap-6">
            {/* Assets */}
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg">Assets</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {/* Current Assets */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={2} className="font-medium">Current Assets</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Cash and Cash Equivalents</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.cash)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Acquisition Premium</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.acquisitionPremium)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium pl-4">Total Current Assets</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(selectedBalanceSheet.totalCurrentAssets)}</TableCell>
                    </TableRow>
                    
                    {/* Non-Current Assets */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={2} className="font-medium">Non-Current Assets</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Equity Investments</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.equityInvestments)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Deferred Tax Assets</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.deferredTaxAssets)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium pl-4">Total Non-Current Assets</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(selectedBalanceSheet.totalNonCurrentAssets)}</TableCell>
                    </TableRow>
                    
                    {/* Total Assets */}
                    <TableRow className="bg-blue-50 border-t-2 border-b-2">
                      <TableCell className="font-bold">TOTAL ASSETS</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(selectedBalanceSheet.totalAssets)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {/* Liabilities and Equity */}
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg">Liabilities and Equity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {/* Current Liabilities */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={2} className="font-medium">Current Liabilities</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Trade Payables</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.tradePayables)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Interest Payables</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.interestPayables)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Tax Payables</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.taxPayables)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Dividend Payables</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.dividendPayables)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium pl-4">Total Current Liabilities</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(selectedBalanceSheet.totalCurrentLiabilities)}</TableCell>
                    </TableRow>
                    
                    {/* Non-Current Liabilities */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={2} className="font-medium">Non-Current Liabilities</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Portfolio Financing Balance</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.portfolioFinancing)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Deferred Tax Liabilities</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.deferredTaxLiabilities)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-medium pl-4">Total Non-Current Liabilities</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(selectedBalanceSheet.totalNonCurrentLiabilities)}</TableCell>
                    </TableRow>
                    
                    {/* Total Liabilities */}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold pl-4">TOTAL LIABILITIES</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(selectedBalanceSheet.totalLiabilities)}</TableCell>
                    </TableRow>
                    
                    {/* Net Assets */}
                    <TableRow className="bg-purple-50 border-t-2 border-b-2">
                      <TableCell className="font-bold">NET ASSETS</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(selectedBalanceSheet.netAssets)}</TableCell>
                    </TableRow>
                    
                    {/* Equity */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={2} className="font-medium">Equity</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Contributed Capital - New Investors</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.newInvestorsCapital)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Contributed Capital - ZEN</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.zenContribution)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Repayment of Contributed Capital - AssetCo</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.assetCoRepayment)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8">Retained Earnings</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedBalanceSheet.retainedEarnings)}</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-blue-50">
                      <TableCell className="font-bold">TOTAL EQUITY</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(selectedBalanceSheet.totalEquity)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          {/* Balance Check */}
          <div className={`mt-4 p-2 text-center rounded ${selectedBalanceSheet.balanceCheck ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {selectedBalanceSheet.balanceCheck 
              ? 'Balance Sheet Balanced: Assets = Liabilities + Equity' 
              : 'Warning: Balance Sheet Unbalanced!'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformBalanceSheet;