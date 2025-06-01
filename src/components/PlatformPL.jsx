import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from '@/components/ui/button';

// Import calculation functions from separate file
import { 
  calculatePlatformPL, 
  calculateCashFlow, 
  generateYears, 
  formatCurrency 
} from './PlatformPL_Calculations';

// Import default constants
import { 
  DEFAULT_PLATFORM_COSTS 
} from '@/lib/default_constants';

const PlatformPL = ({
  // Allow props to be passed from parent component for integration
  selectedRevenueCase: externalSelectedRevenueCase,
  setSelectedRevenueCase: externalSetSelectedRevenueCase,
  usePortfolioDebt: externalUsePortfolioDebt,
  setUsePortfolioDebt: externalSetUsePortfolioDebt,
  platformOpex: externalPlatformOpex,
  setPlatformOpex: externalSetPlatformOpex,
  platformOpexEscalation: externalPlatformOpexEscalation,
  setPlatformOpexEscalation: externalSetPlatformOpexEscalation,
  timeView: externalTimeView,
  setTimeView: externalSetTimeView,
  dividendPolicy: externalDividendPolicy,
  setDividendPolicy: externalSetDividendPolicy,
  minimumCashBalance: externalMinimumCashBalance,
  setMinimumCashBalance: externalSetMinimumCashBalance,
  initialTab = 'pl' // Default to profit & loss tab
}) => {
  const { assets, constants, getMerchantPrice, updateConstants } = usePortfolio();
  
  // Use either passed values or local state with proper defaults
  const [selectedRevenueCase, setSelectedRevenueCase] = useState(externalSelectedRevenueCase || 'base');
  const [selectedAsset, setSelectedAsset] = useState('Total');
  const [usePortfolioDebt, setUsePortfolioDebt] = useState(externalUsePortfolioDebt !== undefined ? externalUsePortfolioDebt : true);
  const [platformOpex, setPlatformOpex] = useState(externalPlatformOpex ?? DEFAULT_PLATFORM_COSTS.platformOpex);
  const [platformOpexEscalation, setPlatformOpexEscalation] = useState(externalPlatformOpexEscalation ?? DEFAULT_PLATFORM_COSTS.platformOpexEscalation);
  const [years, setYears] = useState([]);
  const [timeView, setTimeView] = useState(externalTimeView || 'annual'); // 'annual' or 'quarterly'
  const [dividendPolicy, setDividendPolicy] = useState(externalDividendPolicy ?? DEFAULT_PLATFORM_COSTS.dividendPolicy);
  const [minimumCashBalance, setMinimumCashBalance] = useState(externalMinimumCashBalance ?? DEFAULT_PLATFORM_COSTS.minimumCashBalance);
  const [activeTab, setActiveTab] = useState(initialTab); // 'pl', 'cf', or 'chart'
  
  // Sync external values if they change
  useEffect(() => {
    if (externalSelectedRevenueCase !== undefined) setSelectedRevenueCase(externalSelectedRevenueCase);
    if (externalUsePortfolioDebt !== undefined) setUsePortfolioDebt(externalUsePortfolioDebt);
    if (externalPlatformOpex !== undefined) setPlatformOpex(externalPlatformOpex);
    if (externalPlatformOpexEscalation !== undefined) setPlatformOpexEscalation(externalPlatformOpexEscalation);
    if (externalTimeView !== undefined) setTimeView(externalTimeView);
    if (externalDividendPolicy !== undefined) setDividendPolicy(externalDividendPolicy);
    if (externalMinimumCashBalance !== undefined) setMinimumCashBalance(externalMinimumCashBalance);
  }, [
    externalSelectedRevenueCase,
    externalUsePortfolioDebt,
    externalPlatformOpex,
    externalPlatformOpexEscalation,
    externalTimeView,
    externalDividendPolicy,
    externalMinimumCashBalance
  ]);

  // Propagate local changes to external state
  useEffect(() => {
    if (externalSetSelectedRevenueCase) externalSetSelectedRevenueCase(selectedRevenueCase);
    if (externalSetUsePortfolioDebt) externalSetUsePortfolioDebt(usePortfolioDebt);
    if (externalSetPlatformOpex) externalSetPlatformOpex(platformOpex);
    if (externalSetPlatformOpexEscalation) externalSetPlatformOpexEscalation(platformOpexEscalation);
    if (externalSetTimeView) externalSetTimeView(timeView);
    if (externalSetDividendPolicy) externalSetDividendPolicy(dividendPolicy);
    if (externalSetMinimumCashBalance) externalSetMinimumCashBalance(minimumCashBalance);
  }, [
    selectedRevenueCase,
    usePortfolioDebt,
    platformOpex,
    platformOpexEscalation,
    timeView,
    dividendPolicy,
    minimumCashBalance
  ]);

  // Initialize years array based on constants
  useEffect(() => {
    const startYear = constants.analysisStartYear || new Date().getFullYear();
    const endYear = constants.analysisEndYear || startYear + 30;
    setYears(generateYears(startYear, endYear));
  }, [constants.analysisStartYear, constants.analysisEndYear]);

  // Save platform opex settings to constants
  useEffect(() => {
    updateConstants('platformOpex', platformOpex);
    updateConstants('platformOpexEscalation', platformOpexEscalation);
    updateConstants('dividendPolicy', dividendPolicy);
    updateConstants('minimumCashBalance', minimumCashBalance);
  }, [platformOpex, platformOpexEscalation, dividendPolicy, minimumCashBalance, updateConstants]);

  // Load saved values from constants with proper defaults
  useEffect(() => {
    if (constants.platformOpex !== undefined && externalPlatformOpex === undefined) {
      setPlatformOpex(constants.platformOpex);
    } else if (constants.platformOpex === undefined && externalPlatformOpex === undefined) {
      setPlatformOpex(DEFAULT_PLATFORM_COSTS.platformOpex);
    }
    
    if (constants.platformOpexEscalation !== undefined && externalPlatformOpexEscalation === undefined) {
      setPlatformOpexEscalation(constants.platformOpexEscalation);
    } else if (constants.platformOpexEscalation === undefined && externalPlatformOpexEscalation === undefined) {
      setPlatformOpexEscalation(DEFAULT_PLATFORM_COSTS.platformOpexEscalation);
    }
    
    if (constants.dividendPolicy !== undefined && externalDividendPolicy === undefined) {
      setDividendPolicy(constants.dividendPolicy);
    } else if (constants.dividendPolicy === undefined && externalDividendPolicy === undefined) {
      setDividendPolicy(DEFAULT_PLATFORM_COSTS.dividendPolicy);
    }
    
    if (constants.minimumCashBalance !== undefined && externalMinimumCashBalance === undefined) {
      setMinimumCashBalance(constants.minimumCashBalance);
    } else if (constants.minimumCashBalance === undefined && externalMinimumCashBalance === undefined) {
      setMinimumCashBalance(DEFAULT_PLATFORM_COSTS.minimumCashBalance);
    }
  }, [
    constants, 
    externalPlatformOpex, 
    externalPlatformOpexEscalation,
    externalDividendPolicy,
    externalMinimumCashBalance
  ]);

  // Calculate P&L data using the calculation function
  const plData = useMemo(() => {
    return calculatePlatformPL(
      assets,
      constants,
      years,
      getMerchantPrice,
      selectedRevenueCase,
      usePortfolioDebt,
      platformOpex,
      platformOpexEscalation
    );
  }, [
    assets, 
    years, 
    constants, 
    constants.assetCosts, 
    constants.deprecationPeriods,
    constants.corporateTaxRate,
    usePortfolioDebt, 
    platformOpex, 
    platformOpexEscalation,
    selectedRevenueCase,
    getMerchantPrice
  ]);

  // Calculate cash flow data with cash balance and dividends
  const cashFlowData = useMemo(() => {
    if (!plData.platformPL || plData.platformPL.length === 0) {
      return { annual: [], quarterly: [] };
    }
    
    return calculateCashFlow(
      plData.platformPL,
      plData.quarters,
      dividendPolicy,
      minimumCashBalance
    );
  }, [plData.platformPL, plData.quarters, dividendPolicy, minimumCashBalance]);

  // Get the data to display based on selected asset
  const displayData = useMemo(() => {
    if (selectedAsset === 'Total') {
      return plData.platformPL;
    }
    return plData.assetPL[selectedAsset] || [];
  }, [selectedAsset, plData]);

  // Get the current display data based on time view
  const getCurrentData = (type) => {
    if (type === 'pl') {
      if (timeView === 'quarterly') {
        return plData.quarters;
      }
      return displayData;
    } else if (type === 'cf') {
      if (timeView === 'quarterly') {
        return cashFlowData.quarterly;
      }
      return cashFlowData.annual;
    }
  };

  // Settings panel
  const SettingsPanel = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>P&L Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Platform Management Opex</Label>
              <Input 
                type="number"
                value={platformOpex}
                onChange={(e) => setPlatformOpex(parseFloat(e.target.value) || 0)}
                placeholder="Annual cost in $M"
              />
              <p className="text-sm text-gray-500">Annual platform management cost ($M)</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Label>Platform Opex Escalation</Label>
              <Input 
                type="number"
                value={platformOpexEscalation}
                onChange={(e) => setPlatformOpexEscalation(parseFloat(e.target.value) || 0)}
                placeholder="Annual escalation %"
              />
              <p className="text-sm text-gray-500">Annual increase in platform costs (%)</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Dividend Payout Ratio</Label>
              <Input 
                type="number"
                value={dividendPolicy}
                onChange={(e) => setDividendPolicy(parseFloat(e.target.value) || 0)}
                placeholder="Dividend payout ratio %"
              />
              <p className="text-sm text-gray-500">Percentage of NPAT distributed as dividends</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Label>Minimum Cash Balance</Label>
              <Input 
                type="number"
                value={minimumCashBalance}
                onChange={(e) => setMinimumCashBalance(parseFloat(e.target.value) || 0)}
                placeholder="Minimum cash balance ($M)"
              />
              <p className="text-sm text-gray-500">Minimum cash balance to maintain before paying dividends ($M)</p>
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                checked={usePortfolioDebt}
                onCheckedChange={setUsePortfolioDebt}
                id="portfolio-debt"
              />
              <Label htmlFor="portfolio-debt">Use Portfolio Debt Structure</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  // Render Profit & Loss Section
  const renderProfitLoss = () => (
    <Card>
      <CardHeader>
        <CardTitle>Platform Profit & Loss</CardTitle>
      </CardHeader>
      <CardContent>
        {/* P&L Chart */}
        <div className="h-96 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getCurrentData('pl')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period"
                padding={{ left: 20, right: 20 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `${timeView === 'quarterly' ? 'Quarter' : 'Year'}: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#4CAF50" strokeWidth={2} />
              {selectedAsset === 'Total' && (
                <Line type="monotone" dataKey="assetOpex" name="Asset Opex" stroke="#FF9800" strokeWidth={2} />
              )}
              {selectedAsset === 'Total' && (
                <Line type="monotone" dataKey="platformOpex" name="Platform Opex" stroke="#F44336" strokeWidth={2} />
              )}
              {selectedAsset !== 'Total' && (
                <Line type="monotone" dataKey="opex" name="Opex" stroke="#F44336" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#2196F3" strokeWidth={2} />
              <Line type="monotone" dataKey="npat" name="NPAT" stroke="#9C27B0" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* P&L Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{timeView === 'quarterly' ? 'Period' : 'Year'}</TableHead>
                <TableHead>Revenue</TableHead>
                {selectedAsset === 'Total' ? (
                  <>
                    <TableHead>Asset Opex</TableHead>
                    <TableHead>Platform Opex</TableHead>
                  </>
                ) : (
                  <TableHead>Opex</TableHead>
                )}
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
              {getCurrentData('pl').map((row, index) => (
                <TableRow key={row.period} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  {selectedAsset === 'Total' ? (
                    <>
                      <TableCell>{formatCurrency(row.assetOpex)}</TableCell>
                      <TableCell>{formatCurrency(row.platformOpex)}</TableCell>
                    </>
                  ) : (
                    <TableCell>{formatCurrency(row.opex)}</TableCell>
                  )}
                  <TableCell className="font-medium">{formatCurrency(row.ebitda)}</TableCell>
                  <TableCell>{formatCurrency(row.depreciation)}</TableCell>
                  <TableCell>{formatCurrency(row.interest)}</TableCell>
                  <TableCell>{formatCurrency(row.principalRepayment)}</TableCell>
                  <TableCell>{formatCurrency(row.ebt)}</TableCell>
                  <TableCell>{formatCurrency(row.tax)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(row.npat)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  // Render Cash Flow Section
  const renderCashFlow = () => (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Statement</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Cash Flow Chart */}
        <div className="h-96 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getCurrentData('cf')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period"
                padding={{ left: 20, right: 20 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `${timeView === 'quarterly' ? 'Quarter' : 'Year'}: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="operatingCashFlow" name="Operating Cash Flow" stroke="#4CAF50" strokeWidth={2} />
              <Line type="monotone" dataKey="tax" name="Tax" stroke="#d32f2f" strokeWidth={2} />
              <Line type="monotone" dataKey="debtService" name="Debt Service" stroke="#FF9800" strokeWidth={2} />
              <Line type="monotone" dataKey="fcfe" name="FCFE" stroke="#9C27B0" strokeWidth={2} />
              <Line type="monotone" dataKey="dividend" name="Dividends" stroke="#F44336" strokeWidth={2} />
              <Line type="monotone" dataKey="netCashFlow" name="Net Cash Flow" stroke="#2196F3" strokeWidth={2} />
              <Line type="monotone" dataKey="cashBalance" name="Cash Balance" stroke="#673AB7" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Cash Flow Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{timeView === 'quarterly' ? 'Period' : 'Year'}</TableHead>
                <TableHead>Operating Cash Flow</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Principal Repayment</TableHead>
                <TableHead>Total Debt Service</TableHead>
                <TableHead className="font-medium bg-purple-50">FCFE</TableHead>
                <TableHead>Dividends</TableHead>
                <TableHead>Net Cash Flow</TableHead>
                <TableHead>Cash Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getCurrentData('cf').map((row, index) => (
                <TableRow key={row.period} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{formatCurrency(row.operatingCashFlow)}</TableCell>
                  <TableCell>{formatCurrency(row.tax)}</TableCell>
                  <TableCell>{formatCurrency(row.interest)}</TableCell>
                  <TableCell>{formatCurrency(row.principalRepayment)}</TableCell>
                  <TableCell>{formatCurrency(row.debtService)}</TableCell>
                  <TableCell className="font-medium bg-purple-50">{formatCurrency(row.fcfe)}</TableCell>
                  <TableCell>{formatCurrency(row.dividend)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(row.netCashFlow)}</TableCell>
                  <TableCell>{formatCurrency(row.cashBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  // Render Cash Flow Breakdown Chart
  const renderCashFlowChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getCurrentData('cf')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period"
                padding={{ left: 20, right: 20 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => `${timeView === 'quarterly' ? 'Quarter' : 'Year'}: ${label}`}
              />
              <Legend />
              <Bar dataKey="operatingCashFlow" name="Operating Cash Flow" fill="#4CAF50" stackId="a" />
              <Bar dataKey="tax" name="Tax" fill="#d32f2f" stackId="a" />
              <Bar dataKey="debtService" name="Debt Service" fill="#FF9800" stackId="a" />
              <Bar dataKey="dividend" name="Dividends" fill="#F44336" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Determine which content to render based on activeTab or external mode
  const renderTabContent = () => {
    if (activeTab === 'pl') {
      return renderProfitLoss();
    } else if (activeTab === 'cf') {
      return (
        <>
          {renderCashFlow()}
          <div className="mt-6">
            {renderCashFlowChart()}
          </div>
        </>
      );
    } else if (activeTab === 'chart') {
      return renderCashFlowChart();
    }
  };

  // If only cash flow is requested from parent (for Cash Flow tab)
  if (initialTab === 'cf' && initialTab !== activeTab) {
    return (
      <>
        {renderCashFlow()}
        {renderCashFlowChart()}
      </>
    );
  }

  return (
    <div className="w-full space-y-4">
      <SettingsPanel />
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <Select 
            value={selectedAsset} 
            onValueChange={setSelectedAsset}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Total">Total Platform</SelectItem>
              {Object.values(assets).map(asset => (
                <SelectItem key={asset.name} value={asset.name}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {externalSetSelectedRevenueCase === undefined && (
            <Select 
              value={selectedRevenueCase} 
              onValueChange={setSelectedRevenueCase}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base Case</SelectItem>
                <SelectItem value="worst">Downside Case</SelectItem>
                <SelectItem value="volume">Volume Stress</SelectItem>
                <SelectItem value="price">Price Stress</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {externalSetTimeView === undefined && (
          <Select 
            value={timeView} 
            onValueChange={setTimeView}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {/* Add tab selection if not controlled by parent */}
        {!externalSelectedRevenueCase && (
          <div className="flex space-x-2">
            <Button 
              variant={activeTab === 'pl' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('pl')}
            >
              P&L
            </Button>
            <Button 
              variant={activeTab === 'cf' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('cf')}
            >
              Cash Flow
            </Button>
            <Button 
              variant={activeTab === 'chart' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('chart')}
            >
              Charts
            </Button>
          </div>
        )}
      </div>
      
      {renderTabContent()}
    </div>
  );
};

export default PlatformPL;