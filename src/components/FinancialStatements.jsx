import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeftRight } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  calculatePlatformPL, 
  calculateCashFlow,
  formatCurrency,
  generateYears,
  generateBalanceSheet
} from './PlatformPL_Calculations';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Helper function for formatting percentages
const formatPercent = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

const yearRange = (startYear, endYear, step = 1) => {
  const years = [];
  for (let year = startYear; year <= endYear; year += step) {
    years.push(year);
  }
  return years;
};

const FinancialStatements = ({ selectedRevenueCase = 'base' }) => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [activeTab, setActiveTab] = useState('income');
  const [yearsRange, setYearsRange] = useState('all');
  const [years, setYears] = useState([]);
  const [platformOpex] = useState(constants.platformOpex || 4.2);
  const [otherOpex] = useState(constants.otherOpex || 1.0); // Include otherOpex from constants
  const [platformOpexEscalation] = useState(constants.platformOpexEscalation || 2.5);
  const [dividendPolicy] = useState(constants.dividendPolicy || 85);
  const [minimumCashBalance] = useState(constants.minimumCashBalance || 5.0);

  // Capital contribution percentages
  const [newInvestorsPercentage] = useState(80); // 80% for new investors
  const [zenPercentage] = useState(20); // 20% for ZEN

  // Initialize years array based on constants
  useEffect(() => {
    const startYear = constants.analysisStartYear || new Date().getFullYear();
    const endYear = constants.analysisEndYear || startYear + 30;
    
    // Set years based on selected range
    if (yearsRange === 'all') {
      setYears(yearRange(startYear, endYear));
    } else if (yearsRange === 'first10') {
      setYears(yearRange(startYear, Math.min(startYear + 9, endYear)));
    } else if (yearsRange === 'next10') {
      const midYear = startYear + 10;
      setYears(yearRange(midYear, Math.min(midYear + 9, endYear)));
    } else if (yearsRange === 'last10') {
      const startPoint = Math.max(startYear, endYear - 9);
      setYears(yearRange(startPoint, endYear));
    }
  }, [constants.analysisStartYear, constants.analysisEndYear, yearsRange]);

  // Calculate financial data
  const financialData = useMemo(() => {
    if (Object.keys(assets).length === 0) return null;
    
    const yearsList = generateYears(constants.analysisStartYear, constants.analysisEndYear);
    
    // Calculate P&L data - include otherOpex in calculation
    const plData = calculatePlatformPL(
      assets,
      constants,
      yearsList,
      getMerchantPrice,
      selectedRevenueCase,
      true, // use portfolio debt
      platformOpex + otherOpex, // combine platform opex and other opex
      platformOpexEscalation
    );

    // Calculate cash flow data
    const cashFlowData = calculateCashFlow(
      plData.platformPL,
      plData.quarters,
      dividendPolicy,
      minimumCashBalance
    );
    
    // Generate balance sheet data using the centralized function
    const balanceSheetData = generateBalanceSheet(
      plData.platformPL, 
      cashFlowData.annual,
      assets,
      constants,
      newInvestorsPercentage,
      zenPercentage
    );
    
    return {
      incomeStatement: plData.platformPL,
      cashFlow: cashFlowData.annual,
      balanceSheet: balanceSheetData
    };
  }, [
    assets, 
    constants, 
    getMerchantPrice, 
    selectedRevenueCase, 
    platformOpex, 
    otherOpex, 
    platformOpexEscalation,
    dividendPolicy,
    minimumCashBalance,
    newInvestorsPercentage,
    zenPercentage
  ]);

  // Filter to show only selected years
  const filteredData = useMemo(() => {
    if (!financialData) return { incomeStatement: [], balanceSheet: [], cashFlow: [] };
    
    return {
      incomeStatement: financialData.incomeStatement.filter(item => 
        years.includes(typeof item.year === 'number' ? item.year : parseInt(item.period))
      ),
      balanceSheet: financialData.balanceSheet.filter(item => 
        years.includes(typeof item.year === 'number' ? item.year : parseInt(item.period))
      ),
      cashFlow: financialData.cashFlow.filter(item => 
        years.includes(typeof item.year === 'number' ? item.year : parseInt(item.period))
      )
    };
  }, [financialData, years]);

  // Renders the horizontal table with years as columns
  const renderHorizontalTable = (data, categoryMap) => {
    if (!data || data.length === 0) return <div>No data available</div>;
    
    const categories = Object.keys(categoryMap);
    
    return (
      <div className="overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-48">Category</TableHead>
              {years.map(year => (
                <TableHead key={year} className="min-w-[100px] text-right">{year}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const isHeader = categoryMap[category].isHeader;
              const format = categoryMap[category].format || formatCurrency;
              const extraClass = categoryMap[category].className || "";
              
              return (
                <TableRow key={category} className={`${isHeader ? "font-semibold bg-muted/30" : ""} ${extraClass}`}>
                  <TableCell className={`${isHeader ? "font-semibold" : ""}`}>
                    {categoryMap[category].label}
                  </TableCell>
                  {years.map(year => {
                    const yearData = data.find(d => 
                      d.year === year || parseInt(d.period) === year
                    );
                    const value = yearData ? yearData[category] : null;
                    return (
                      <TableCell key={year} className="text-right">
                        {value !== null && value !== undefined 
                          ? (typeof categoryMap[category].className === 'function'
                              ? format(value, categoryMap[category].className(value))
                              : format(value))
                          : '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Define the categories and labels for each financial statement
  const incomeStatementMap = {
    revenue: { label: 'Revenue', isHeader: false },
    assetOpex: { label: 'Asset Operating Expenses', isHeader: false },
    platformOpex: { label: 'Platform Operating Expenses', isHeader: false },
    ebitda: { label: 'EBITDA', isHeader: true },
    ebitdaMargin: { 
      label: 'EBITDA Margin (%)', 
      isHeader: false, 
      format: (val) => val ? formatPercent(val, 1) : '-',
      // Ensure EBITDA margin is correctly calculated as EBITDA / Revenue
      calculate: (row) => row.ebitda / row.revenue
    },
    depreciation: { label: 'Depreciation & Amortization', isHeader: false },
    ebit: { label: 'EBIT', isHeader: true },
    interest: { label: 'Interest Expense', isHeader: false },
    ebt: { label: 'Profit Before Tax', isHeader: true },
    tax: { label: 'Income Tax Expense', isHeader: false },
    npat: { label: 'Net Income', isHeader: true },
  };

  const balanceSheetMap = {
    // Assets
    cash: { label: 'Cash and Cash Equivalents', isHeader: false },
    receivables: { label: 'Receivables', isHeader: false },
    acquisitionPremium: { label: 'Acquisition Premium', isHeader: false },
    fixedAssets: { label: 'Fixed Assets', isHeader: false },
    goodwill: { label: 'Goodwill', isHeader: false },
    otherAssets: { label: 'Other Assets', isHeader: false },
    deferredTaxAssets: { label: 'Deferred Tax Assets', isHeader: false },
    totalAssets: { label: 'TOTAL ASSETS', isHeader: true, className: "bg-blue-50" },
    
    // Liabilities
    payables: { label: 'Payables', isHeader: false },
    interestPayables: { label: 'Interest Payables', isHeader: false },
    taxPayables: { label: 'Tax Payables', isHeader: false },
    dividendPayables: { label: 'Dividend Payables', isHeader: false },
    seniorDebt: { label: 'Senior Debt - AssetCo', isHeader: false },
    portfolioFinancing: { label: 'Portfolio Financing Balance', isHeader: false },
    deferredTaxLiabilities: { label: 'Deferred Tax Liabilities', isHeader: false },
    totalLiabilities: { label: 'TOTAL LIABILITIES', isHeader: true },
    
    // Equity
    newInvestorsCapital: { label: 'Contributed Capital - HDRE + New Investors (80%)', isHeader: false },
    zenContribution: { label: 'Contributed Capital - ZEN (20%)', isHeader: false },
    assetCoRepayment: { label: 'Repayment of Contributed Capital - AssetCo', isHeader: false },
    retainedEarnings: { label: 'Retained Earnings', isHeader: false },
    totalEquity: { label: 'TOTAL EQUITY', isHeader: true, className: "bg-blue-50" },
    
    balanceCheck: { 
      label: 'Balance Sheet Check', 
      isHeader: false, 
      format: (val) => val ? '✓' : '✗',
      className: (val) => val ? "bg-green-50" : "bg-red-50"
    }
  };

  const cashFlowMap = {
    operatingCashFlow: { label: 'Operating Cash Flow', isHeader: false },
    tax: { label: 'Tax Paid', isHeader: false },
    interest: { label: 'Interest Paid', isHeader: false },
    principalRepayment: { label: 'Principal Repayment', isHeader: false },
    debtService: { label: 'Total Debt Service', isHeader: false },
    fcfe: { label: 'Free Cash Flow to Equity', isHeader: true, className: "bg-purple-50" },
    dividend: { label: 'Dividends Paid', isHeader: false },
    netCashFlow: { label: 'Net Cash Flow', isHeader: true },
    cashBalance: { label: 'Cash Balance', isHeader: true },
  };

  // Process financial data for display
  const processedIncomeStatement = useMemo(() => {
    if (!filteredData.incomeStatement || filteredData.incomeStatement.length === 0) {
      return [];
    }

    return filteredData.incomeStatement.map(row => {
      // Calculate EBIT as EBITDA - Depreciation
      const ebit = row.ebitda + row.depreciation; // Since depreciation is already negative
      
      // Ensure EBITDA margin is correctly calculated 
      const ebitdaMargin = row.revenue !== 0 ? row.ebitda / row.revenue : 0;

      return {
        ...row,
        ebit,
        ebitdaMargin
      };
    });
  }, [filteredData.incomeStatement]);

  // If no data is available
  if (!financialData || Object.keys(assets).length === 0) {
    return (
      <div className="w-full p-4">
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <p className="text-center text-muted-foreground">
              No financial data available. Please ensure assets are configured properly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col space-y-1.5">
            <CardTitle>Financial Statements</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={yearsRange} onValueChange={setYearsRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Year Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="first10">First 10 Years</SelectItem>
                <SelectItem value="next10">Middle 10 Years</SelectItem>
                <SelectItem value="last10">Last 10 Years</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => alert("Export functionality would go here")}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="income">Income Statement</TabsTrigger>
              <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
              <TabsTrigger value="cash">Cash Flow</TabsTrigger>
            </TabsList>
            
            <TabsContent value="income">
              {renderHorizontalTable(processedIncomeStatement, incomeStatementMap)}
              
              {/* Income Statement Chart */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Income Statement Visualization</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processedIncomeStatement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="year" 
                        label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: 'Amount ($M)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Margin (%)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}M` : value} />
                      <Legend />
                      <Bar 
                        yAxisId="left"
                        dataKey="revenue" 
                        name="Revenue" 
                        fill="#8884d8"
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="ebitda" 
                        name="EBITDA" 
                        fill="#82ca9d"
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="npat" 
                        name="Net Income" 
                        fill="#ffc658"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="ebitdaMargin" 
                        name="EBITDA Margin" 
                        stroke="#ff7300"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="balance">
              {renderHorizontalTable(filteredData.balanceSheet, balanceSheetMap)}
              
              {/* Balance Sheet Chart */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Balance Sheet Visualization</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData.balanceSheet}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}M` : value} />
                      <Legend />
                      <Bar dataKey="totalAssets" stackId="a" fill="#8884d8" name="Total Assets" />
                      <Bar dataKey="totalLiabilities" stackId="b" fill="#ff8042" name="Total Liabilities" />
                      <Bar dataKey="totalEquity" stackId="b" fill="#82ca9d" name="Total Equity" />
                      <Line 
                        type="monotone" 
                        dataKey="seniorDebt" 
                        name="Senior Debt" 
                        stroke="#9C27B0" 
                        strokeWidth={1.5}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="fixedAssets" 
                        name="Fixed Assets" 
                        stroke="#2196F3" 
                        strokeWidth={1.5}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="cash">
              {renderHorizontalTable(filteredData.cashFlow, cashFlowMap)}
              
              {/* Cash Flow Chart */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Cash Flow Visualization</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData.cashFlow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}M` : value} />
                      <Legend />
                      <Bar dataKey="operatingCashFlow" stackId="a" fill="#8884d8" name="Operating Cash Flow" />
                      <Bar dataKey="fcfe" stackId="a" fill="#82ca9d" name="FCFE" />
                      <Line 
                        type="monotone" 
                        dataKey="cashBalance" 
                        name="Cash Balance" 
                        stroke="#ff7300"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netCashFlow" 
                        name="Net Cash Flow" 
                        stroke="#0088fe"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Cash Waterfall Chart */}
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Cash Flow Waterfall</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={filteredData.cashFlow}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}M` : value} />
                        <Legend />
                        <Bar dataKey="operatingCashFlow" name="Operating CF" fill="#82ca9d" />
                        <Bar dataKey="tax" name="Tax" fill="#f44336" />
                        <Bar dataKey="interest" name="Interest" fill="#ff9800" />
                        <Bar dataKey="principalRepayment" name="Principal" fill="#9c27b0" />
                        <Bar dataKey="dividend" name="Dividends" fill="#2196f3" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialStatements;