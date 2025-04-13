import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortfolio } from '@/contexts/PortfolioContext';

import PlatformPL from './PlatformPL';
import PlatformBalanceSheet from './PlatformBalanceSheet';
import { 
  calculatePlatformPL, 
  calculateCashFlow, 
  generateYears
} from './PlatformPL_Calculations';

const PlatformFinancials = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [activeTab, setActiveTab] = useState('pl');
  const [usePortfolioDebt, setUsePortfolioDebt] = useState(true);
  const [platformOpex, setPlatformOpex] = useState(4.2);
  const [platformOpexEscalation, setPlatformOpexEscalation] = useState(2.5);
  const [timeView, setTimeView] = useState('annual');
  const [dividendPolicy, setDividendPolicy] = useState(85);
  const [minimumCashBalance, setMinimumCashBalance] = useState(5.0);
  const [years, setYears] = useState([]);

  // Initialize years array based on constants
  useEffect(() => {
    const startYear = constants.analysisStartYear || new Date().getFullYear();
    const endYear = constants.analysisEndYear || startYear + 30;
    setYears(generateYears(startYear, endYear));
  }, [constants.analysisStartYear, constants.analysisEndYear]);

  // Check if Project Finance has already calculated debt service schedules
  useEffect(() => {
    const hasDebtService = Object.values(assets).some(asset => 
      constants.assetCosts[asset.name]?.debtService !== undefined
    );
    
    // If not, and if debt calculations are needed, show a notification to the user
    if (!hasDebtService && Object.keys(assets).length > 0) {
      console.warn("Debt service schedules not found. Visit the Project Finance tab and click 'Solve Gearing' to generate them.");
      // You could also set a state variable to show a notification in the UI
    }
  }, [assets, constants.assetCosts]);

  // Calculate P&L data
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
    usePortfolioDebt, 
    platformOpex, 
    platformOpexEscalation,
    selectedRevenueCase,
    getMerchantPrice
  ]);

  // Calculate cash flow data
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
  
  // Handle shared settings changes
  const handleSettingsChange = (settings) => {
    if (settings.platformOpex !== undefined) setPlatformOpex(settings.platformOpex);
    if (settings.platformOpexEscalation !== undefined) setPlatformOpexEscalation(settings.platformOpexEscalation);
    if (settings.dividendPolicy !== undefined) setDividendPolicy(settings.dividendPolicy);
    if (settings.minimumCashBalance !== undefined) setMinimumCashBalance(settings.minimumCashBalance);
    if (settings.usePortfolioDebt !== undefined) setUsePortfolioDebt(settings.usePortfolioDebt);
    if (settings.timeView !== undefined) setTimeView(settings.timeView);
    if (settings.selectedRevenueCase !== undefined) setSelectedRevenueCase(settings.selectedRevenueCase);
  };

  return (
    <div className="w-full p-4 space-y-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Platform Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note:</span> All debt calculations are directly linked to Project Finance tab calculations. 
              Any changes in debt structure, gearing, or debt service in Project Finance will automatically update the financial statements.
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
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
              
              <Select 
                value={timeView} 
                onValueChange={setTimeView}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Time view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pl">
          <PlatformPL 
            selectedRevenueCase={selectedRevenueCase}
            setSelectedRevenueCase={setSelectedRevenueCase}
            usePortfolioDebt={usePortfolioDebt}
            setUsePortfolioDebt={setUsePortfolioDebt}
            platformOpex={platformOpex}
            setPlatformOpex={setPlatformOpex}
            platformOpexEscalation={platformOpexEscalation}
            setPlatformOpexEscalation={setPlatformOpexEscalation}
            timeView={timeView}
            setTimeView={setTimeView}
            dividendPolicy={dividendPolicy}
            setDividendPolicy={setDividendPolicy}
            minimumCashBalance={minimumCashBalance}
            setMinimumCashBalance={setMinimumCashBalance}
          />
        </TabsContent>
        
        <TabsContent value="bs">
          <PlatformBalanceSheet
            plData={plData}
            cashFlowData={cashFlowData}
            selectedRevenueCase={selectedRevenueCase}
            timeView={timeView}
          />
        </TabsContent>
        
        <TabsContent value="cf">
          {/* Here we just show the Cash Flow section from PlatformPL */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-500 italic mb-6 text-center">
                Cash flow data is synchronized with P&L and Balance Sheet calculations
              </div>
              
              <PlatformPL 
                selectedRevenueCase={selectedRevenueCase}
                setSelectedRevenueCase={setSelectedRevenueCase}
                usePortfolioDebt={usePortfolioDebt}
                setUsePortfolioDebt={setUsePortfolioDebt}
                platformOpex={platformOpex}
                setPlatformOpex={setPlatformOpex}
                platformOpexEscalation={platformOpexEscalation}
                setPlatformOpexEscalation={setPlatformOpexEscalation}
                timeView={timeView}
                setTimeView={setTimeView}
                dividendPolicy={dividendPolicy}
                setDividendPolicy={setDividendPolicy}
                minimumCashBalance={minimumCashBalance}
                setMinimumCashBalance={setMinimumCashBalance}
                initialTab="cf"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformFinancials;