import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  calculatePlatformPL, 
  calculateCashFlow, 
  generateYears, 
  formatCurrency 
} from '@/components/PlatformPL_Calculations';
import { 
  calculateProjectMetrics, 
  calculateIRR
} from '@/components/ProjectFinance_Calcs';

const SummaryFinancialsLanding = () => {
  const { assets, constants, getMerchantPrice, portfolioName } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [includeTerminalValue, setIncludeTerminalValue] = useState(true);
  
  // State for expandable tables
  const [showPLTable, setShowPLTable] = useState(false);
  const [expandedPLYears, setExpandedPLYears] = useState(new Set());

  // Get current user from session storage
  const currentUser = sessionStorage.getItem('currentUser') || portfolioName || 'Portfolio';

  // Generate years for analysis
  const years = useMemo(() => {
    const startYear = constants.analysisStartYear || new Date().getFullYear();
    const endYear = constants.analysisEndYear || startYear + 30;
    return generateYears(startYear, endYear);
  }, [constants.analysisStartYear, constants.analysisEndYear]);

  // Calculate platform P&L data
  const plData = useMemo(() => {
    if (Object.keys(assets).length === 0) return { platformPL: [], quarters: [] };
    
    return calculatePlatformPL(
      assets,
      constants,
      years,
      getMerchantPrice,
      selectedRevenueCase,
      true, // Use portfolio debt
      constants.platformOpex || 4.2,
      constants.platformOpexEscalation || 2.5
    );
  }, [assets, constants, years, getMerchantPrice, selectedRevenueCase]);

  // Calculate cash flow data
  const cashFlowData = useMemo(() => {
    if (!plData.platformPL || plData.platformPL.length === 0) {
      return { annual: [] };
    }
    
    return calculateCashFlow(
      plData.platformPL,
      plData.quarters,
      constants.dividendPolicy || 85,
      constants.minimumCashBalance || 5.0
    );
  }, [plData.platformPL, plData.quarters, constants.dividendPolicy, constants.minimumCashBalance]);

  // Calculate project metrics
  const projectMetrics = useMemo(() => {
    if (Object.keys(assets).length === 0) return {};
    
    try {
      return calculateProjectMetrics(
        assets,
        constants.assetCosts,
        constants,
        getMerchantPrice,
        selectedRevenueCase,
        false,
        includeTerminalValue
      );
    } catch (error) {
      console.error("Error calculating project metrics:", error);
      return {};
    }
  }, [assets, constants.assetCosts, constants, getMerchantPrice, selectedRevenueCase, includeTerminalValue]);

  // Helper functions for expandable tables
  const groupDataByYears = (data, yearsPerGroup = 5) => {
    const groups = [];
    for (let i = 0; i < data.length; i += yearsPerGroup) {
      const groupData = data.slice(i, i + yearsPerGroup);
      if (groupData.length > 0) {
        const startYear = groupData[0].period;
        const endYear = groupData[groupData.length - 1].period;
        groups.push({
          id: `years-${startYear}-${endYear}`,
          label: `Years ${startYear} - ${endYear}`,
          data: groupData
        });
      }
    }
    return groups;
  };

  const togglePLYearGroup = (groupId) => {
    const newExpanded = new Set(expandedPLYears);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedPLYears(newExpanded);
  };

  const expandAllPL = () => {
    const plGroups = groupDataByYears(plData.platformPL);
    setExpandedPLYears(new Set(plGroups.map(g => g.id)));
  };

  const collapseAllPL = () => {
    setExpandedPLYears(new Set());
  };
  const formatPercent = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value, digits = 1) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString(undefined, { maximumFractionDigits: digits });
  };

  const formatDSCR = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(2) + 'x';
  };

  // Calculate portfolio totals
  const getPortfolioTotals = () => {
    const individualAssets = Object.entries(projectMetrics)
      .filter(([assetName]) => assetName !== 'portfolio');
    
    if (individualAssets.length === 0) return null;
    
    const totals = {
      capex: 0,
      debtAmount: 0,
      annualDebtService: 0,
      terminalValue: 0,
    };
    
    const allEquityCashFlows = [];
    const allDSCRs = [];
    
    individualAssets.forEach(([_, metrics]) => {
      totals.capex += metrics.capex || 0;
      totals.debtAmount += metrics.debtAmount || 0;
      totals.annualDebtService += metrics.annualDebtService || 0;
      totals.terminalValue += metrics.terminalValue || 0;
      
      if (metrics.minDSCR) {
        allDSCRs.push(metrics.minDSCR);
      }
      
      if (metrics.equityCashFlows && metrics.equityCashFlows.length > 0) {
        if (allEquityCashFlows.length === 0) {
          allEquityCashFlows.push(...metrics.equityCashFlows.map(cf => cf));
        } else {
          metrics.equityCashFlows.forEach((cf, index) => {
            if (index < allEquityCashFlows.length) {
              allEquityCashFlows[index] += cf;
            }
          });
        }
      }
    });
    
    totals.calculatedGearing = totals.capex > 0 ? totals.debtAmount / totals.capex : 0;
    totals.minDSCR = allDSCRs.length > 0 ? Math.min(...allDSCRs) : null;
    totals.equityCashFlows = allEquityCashFlows;
    
    return totals;
  };

  // Prepare cash flow waterfall data - removed since using exact format
  // const waterfallData = useMemo(() => {
  //   if (!cashFlowData.annual || cashFlowData.annual.length === 0) return [];
  //   
  //   return cashFlowData.annual.slice(0, 10).map(cf => ({
  //     year: cf.period,
  //     operatingCashFlow: cf.operatingCashFlow,
  //     tax: -Math.abs(cf.tax),
  //     debtService: -Math.abs(cf.debtService),
  //     dividends: -Math.abs(cf.dividend),
  //     netCashFlow: cf.netCashFlow
  //   }));
  // }, [cashFlowData.annual]);

  if (!assets || Object.keys(assets).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-gray-500">
        <p className="text-lg font-medium">No Portfolio Data Available</p>
        <p className="text-sm">Please load a portfolio or add assets to view financial summary</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with scenario selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Portfolio Financial Summary</h1>
        <Select value={selectedRevenueCase} onValueChange={setSelectedRevenueCase}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select scenario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="base">Base Case</SelectItem>
            <SelectItem value="worst">Downside Volume & Price</SelectItem>
            <SelectItem value="volume">Volume Stress</SelectItem>
            <SelectItem value="price">Price Stress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Income Statement Chart - Exact Format */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Profit & Loss</CardTitle>
        </CardHeader>
        <CardContent>
          {/* P&L Chart */}
          <div className="h-96 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plData.platformPL}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period"
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#4CAF50" strokeWidth={2} />
                <Line type="monotone" dataKey="assetOpex" name="Asset Opex" stroke="#FF9800" strokeWidth={2} />
                <Line type="monotone" dataKey="platformOpex" name="Platform Opex" stroke="#F44336" strokeWidth={2} />
                <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#2196F3" strokeWidth={2} />
                <Line type="monotone" dataKey="npat" name="NPAT" stroke="#9C27B0" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* P&L Table - Expandable */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setShowPLTable(!showPLTable)}
                className="flex items-center gap-2"
              >
                {showPLTable ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {showPLTable ? 'Hide' : 'Show'} Detailed P&L Table
              </Button>
              {showPLTable && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={expandAllPL}>
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAllPL}>
                    Collapse All
                  </Button>
                </div>
              )}
            </div>
            
            {showPLTable && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Asset Opex</TableHead>
                      <TableHead>Platform Opex</TableHead>
                      <TableHead>EBITDA</TableHead>
                      <TableHead>Depreciation</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>EBT</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>NPAT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupDataByYears(plData.platformPL).map((group) => (
                      <React.Fragment key={group.id}>
                        <TableRow className="bg-gray-100 hover:bg-gray-200 cursor-pointer" onClick={() => togglePLYearGroup(group.id)}>
                          <TableCell colSpan={11} className="font-medium">
                            <div className="flex items-center gap-2">
                              {expandedPLYears.has(group.id) ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                              }
                              {group.label}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedPLYears.has(group.id) && group.data.map((row, index) => (
                          <TableRow key={row.period} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                            <TableCell className="pl-8">{row.period}</TableCell>
                            <TableCell>{formatCurrency(row.revenue)}</TableCell>
                            <TableCell>{formatCurrency(row.assetOpex)}</TableCell>
                            <TableCell>{formatCurrency(row.platformOpex)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(row.ebitda)}</TableCell>
                            <TableCell>{formatCurrency(row.depreciation)}</TableCell>
                            <TableCell>{formatCurrency(row.interest)}</TableCell>
                            <TableCell>{formatCurrency(row.principalRepayment)}</TableCell>
                            <TableCell>{formatCurrency(row.ebt)}</TableCell>
                            <TableCell>{formatCurrency(row.tax)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(row.npat)}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators - Updated Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">
              {getPortfolioTotals()?.equityCashFlows && calculateIRR(getPortfolioTotals()?.equityCashFlows) 
                ? formatPercent(calculateIRR(getPortfolioTotals()?.equityCashFlows)) 
                : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Portfolio Equity IRR</p>
            <p className="text-xs text-gray-500">Return on equity investment</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              ${formatNumber(getPortfolioTotals()?.capex || 0)}M
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Total Portfolio CAPEX</p>
            <p className="text-xs text-gray-500">Total capital investment</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">
              {formatPercent(getPortfolioTotals()?.calculatedGearing || 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">Portfolio Gearing</p>
            <div className="text-xs text-gray-600 mt-1 space-y-1">
              <div>Debt: ${formatNumber(getPortfolioTotals()?.debtAmount || 0)}M</div>
              <div>Equity: ${formatNumber((getPortfolioTotals()?.capex || 0) - (getPortfolioTotals()?.debtAmount || 0))}M</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Total CAPEX ($M)</TableHead>
                <TableHead>Calculated Gearing (%)</TableHead>
                <TableHead>Debt Amount ($M)</TableHead>
                <TableHead>Annual Debt Service ($M)</TableHead>
                <TableHead>Min DSCR</TableHead>
                <TableHead>Terminal Value ($M)</TableHead>
                <TableHead>Equity IRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectMetrics)
                .filter(([assetName]) => assetName !== 'portfolio')
                .map(([assetName, metrics]) => (
                <TableRow key={assetName}>
                  <TableCell>{assetName}</TableCell>
                  <TableCell>${formatNumber(metrics.capex)}</TableCell>
                  <TableCell>{formatPercent(metrics.calculatedGearing)}</TableCell>
                  <TableCell>${formatNumber(metrics.debtAmount)}</TableCell>
                  <TableCell>${formatNumber(metrics.annualDebtService)}</TableCell>
                  <TableCell>{formatDSCR(metrics.minDSCR)}</TableCell>
                  <TableCell>${formatNumber(includeTerminalValue ? metrics.terminalValue : 0)}</TableCell>
                  <TableCell>
                    {calculateIRR(metrics.equityCashFlows) 
                      ? formatPercent(calculateIRR(metrics.equityCashFlows)) 
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              
              {Object.keys(assets).length >= 2 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Portfolio Total</TableCell>
                  <TableCell>${formatNumber(getPortfolioTotals()?.capex)}</TableCell>
                  <TableCell>{formatPercent(getPortfolioTotals()?.calculatedGearing)}</TableCell>
                  <TableCell>${formatNumber(getPortfolioTotals()?.debtAmount)}</TableCell>
                  <TableCell>${formatNumber(getPortfolioTotals()?.annualDebtService)}</TableCell>
                  <TableCell>{formatDSCR(getPortfolioTotals()?.minDSCR)}</TableCell>
                  <TableCell>${formatNumber(includeTerminalValue ? getPortfolioTotals()?.terminalValue : 0)}</TableCell>
                  <TableCell>
                    {getPortfolioTotals()?.equityCashFlows && calculateIRR(getPortfolioTotals()?.equityCashFlows) 
                      ? formatPercent(calculateIRR(getPortfolioTotals()?.equityCashFlows)) 
                      : 'N/A'}
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

export default SummaryFinancialsLanding;