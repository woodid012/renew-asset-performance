import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAssetRevenue } from './RevCalculations';
import { calculateStressRevenue } from './ValuationAnalysis_Calcs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

const PlatformPL = () => {
  const { assets, constants, getMerchantPrice, updateConstants } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [selectedAsset, setSelectedAsset] = useState('Total');
  const [usePortfolioDebt, setUsePortfolioDebt] = useState(true);
  const [platformOpex, setPlatformOpex] = useState(4.2); // Default $4.2M
  const [platformOpexEscalation, setPlatformOpexEscalation] = useState(2.5); // Default 2.5%
  const [corporateTaxRate, setCorporateTaxRate] = useState(0); // Default 0%
  const [years, setYears] = useState([]);
  
  // Default depreciation periods
  const [deprecationPeriods, setDeprecationPeriods] = useState({
    solar: 30,
    wind: 30,
    storage: 20
  });

  // Initialize years array based on constants
  useEffect(() => {
    const startYear = constants.analysisStartYear || new Date().getFullYear();
    const endYear = constants.analysisEndYear || startYear + 30;
    setYears(Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i));
  }, [constants.analysisStartYear, constants.analysisEndYear]);

  // Save depreciation settings to constants
  useEffect(() => {
    updateConstants('deprecationPeriods', deprecationPeriods);
  }, [deprecationPeriods, updateConstants]);

  // Save tax rate to constants
  useEffect(() => {
    updateConstants('corporateTaxRate', corporateTaxRate);
  }, [corporateTaxRate, updateConstants]);

  // Save platform opex settings to constants
  useEffect(() => {
    updateConstants('platformOpex', platformOpex);
    updateConstants('platformOpexEscalation', platformOpexEscalation);
  }, [platformOpex, platformOpexEscalation, updateConstants]);

  // Load saved values from constants
  useEffect(() => {
    if (constants.deprecationPeriods) {
      setDeprecationPeriods(constants.deprecationPeriods);
    }
    if (constants.corporateTaxRate !== undefined) {
      setCorporateTaxRate(constants.corporateTaxRate);
    }
    if (constants.platformOpex !== undefined) {
      setPlatformOpex(constants.platformOpex);
    }
    if (constants.platformOpexEscalation !== undefined) {
      setPlatformOpexEscalation(constants.platformOpexEscalation);
    }
  }, [constants]);

  // Calculate P&L data
  const plData = useMemo(() => {
    if (!assets || Object.keys(assets).length === 0 || years.length === 0) {
      return { assetPL: {}, platformPL: [] };
    }

    const assetPL = {};
    const platformPL = years.map(year => ({
      year,
      revenue: 0,
      assetOpex: 0,
      platformOpex: 0,
      ebitda: 0,
      depreciation: 0,
      interest: 0,
      ebt: 0,
      tax: 0,
      npat: 0
    }));

    // Calculate P&L for each asset
    Object.values(assets).forEach(asset => {
      const assetStartYear = new Date(asset.assetStartDate).getFullYear();
      const assetLife = parseInt(asset.assetLife) || 30; // Default to 30 years if not specified
      const assetEndYear = assetStartYear + assetLife;
      
      // Get asset costs
      const assetCosts = constants.assetCosts[asset.name] || {};
      const capex = assetCosts.capex || 0;
      const opexBase = assetCosts.operatingCosts || 0;
      const opexEscalation = assetCosts.operatingCostEscalation || 2.5;
      
      // Determine depreciation period based on asset type
      const depreciationPeriod = deprecationPeriods[asset.type] || 30;
      const annualDepreciation = capex / depreciationPeriod;

      // Debt parameters - either from individual asset or portfolio based on toggle
      const useDebtParams = usePortfolioDebt && constants.assetCosts.portfolio ? 
        constants.assetCosts.portfolio : assetCosts;
      
      const interestRate = useDebtParams.interestRate || 0.06;
      const calculatedGearing = useDebtParams.calculatedGearing || 0.7;
      const debtAmount = capex * calculatedGearing;
      const tenorYears = useDebtParams.tenorYears || 15;
      
      // Initialize asset P&L array
      assetPL[asset.name] = years.map(year => {
        // Skip years before asset starts or after asset end of life
        if (year < assetStartYear || year >= assetEndYear) {
          return {
            year,
            revenue: 0,
            opex: 0,
            ebitda: 0,
            depreciation: 0,
            interest: 0,
            ebt: 0,
            tax: 0,
            npat: 0
          };
        }

        // Calculate yearly revenue
        const yearIndex = year - assetStartYear;
        
        // Calculate asset revenue for this year and scenario
        let revenue = 0;
        try {
          // Use the same calculation methods as in other components
          const baseRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
          
          // Apply stress scenario adjustments if needed
          let stressedRevenue = baseRevenue;
          if (selectedRevenueCase !== 'base') {
            stressedRevenue = calculateStressRevenue(baseRevenue, selectedRevenueCase, constants);
          }
          
          // Sum all revenue components
          revenue = stressedRevenue.contractedGreen + 
                   stressedRevenue.contractedEnergy + 
                   stressedRevenue.merchantGreen + 
                   stressedRevenue.merchantEnergy;
        } catch (err) {
          console.error(`Error calculating revenue for ${asset.name} in ${year}:`, err);
          revenue = 0;
        }

        // Calculate opex with escalation
        const opexFactor = Math.pow(1 + opexEscalation / 100, yearIndex);
        const opex = -(opexBase * opexFactor);
        
        // Calculate EBITDA
        const ebitda = revenue + opex;
        
        // Calculate depreciation (only if within depreciation period)
        const depreciation = year < (assetStartYear + depreciationPeriod) ? -annualDepreciation : 0;
        
        // Calculate interest expense (only if within loan tenor)
        let interest = 0;
        if (year < (assetStartYear + tenorYears)) {
          // Simple interest calculation - in real model would use amortization schedule
          const remainingYears = assetStartYear + tenorYears - year;
          const remainingPrincipal = debtAmount * (remainingYears / tenorYears);
          interest = -(remainingPrincipal * interestRate);
        }
        
        // Calculate EBT
        const ebt = ebitda + depreciation + interest;
        
        // Calculate tax
        const tax = ebt < 0 ? 0 : -(ebt * corporateTaxRate / 100);
        
        // Calculate NPAT
        const npat = ebt + tax;

        // Add to platform totals
        const platformYearIndex = year - years[0];
        platformPL[platformYearIndex].revenue += revenue;
        platformPL[platformYearIndex].assetOpex += opex;
        platformPL[platformYearIndex].ebitda += ebitda;
        platformPL[platformYearIndex].depreciation += depreciation;
        platformPL[platformYearIndex].interest += interest;
        platformPL[platformYearIndex].ebt += ebt;

        return {
          year,
          revenue,
          opex,
          ebitda,
          depreciation,
          interest,
          ebt,
          tax,
          npat
        };
      });
    });

    // Add platform opex and recalculate platform P&L
    platformPL.forEach((yearData, i) => {
      // Calculate platform opex with escalation
      const platformOpexFactor = Math.pow(1 + platformOpexEscalation / 100, i);
      const yearPlatformOpex = -(platformOpex * platformOpexFactor);
      
      // Update platform opex
      yearData.platformOpex = yearPlatformOpex;
      
      // Recalculate EBITDA with platform opex
      yearData.ebitda += yearPlatformOpex;
      
      // Recalculate EBT
      yearData.ebt = yearData.ebitda + yearData.depreciation + yearData.interest;
      
      // Calculate tax
      yearData.tax = yearData.ebt < 0 ? 0 : -(yearData.ebt * corporateTaxRate / 100);
      
      // Calculate NPAT
      yearData.npat = yearData.ebt + yearData.tax;
    });

    return { assetPL, platformPL };
  }, [
    assets, 
    years, 
    constants, 
    constants.assetCosts, 
    deprecationPeriods, 
    usePortfolioDebt, 
    platformOpex, 
    platformOpexEscalation, 
    corporateTaxRate,
    selectedRevenueCase,
    getMerchantPrice
  ]);

  // Get the data to display based on selected asset
  const displayData = useMemo(() => {
    if (selectedAsset === 'Total') {
      return plData.platformPL;
    }
    return plData.assetPL[selectedAsset] || [];
  }, [selectedAsset, plData]);

  // Format for display
  const formatCurrency = (value) => {
    return `$${value.toFixed(1)}M`;
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
              <Label>Corporate Tax Rate</Label>
              <Input 
                type="number"
                value={corporateTaxRate}
                onChange={(e) => setCorporateTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="Tax rate %"
              />
              <p className="text-sm text-gray-500">Corporate tax rate (%)</p>
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
        
        <div className="mt-6">
          <Label className="mb-2 block">Depreciation Periods (Years)</Label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Solar</Label>
              <Input 
                type="number"
                value={deprecationPeriods.solar}
                onChange={(e) => setDeprecationPeriods({
                  ...deprecationPeriods, 
                  solar: parseInt(e.target.value) || 30
                })}
              />
            </div>
            <div>
              <Label>Wind</Label>
              <Input 
                type="number"
                value={deprecationPeriods.wind}
                onChange={(e) => setDeprecationPeriods({
                  ...deprecationPeriods, 
                  wind: parseInt(e.target.value) || 30
                })}
              />
            </div>
            <div>
              <Label>Storage</Label>
              <Input 
                type="number"
                value={deprecationPeriods.storage}
                onChange={(e) => setDeprecationPeriods({
                  ...deprecationPeriods, 
                  storage: parseInt(e.target.value) || 20
                })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full p-4 space-y-4">
      <SettingsPanel />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Platform Profit & Loss</CardTitle>
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* P&L Chart */}
          <div className="h-96 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year"
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Year: ${label}`}
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
                  <TableHead>Year</TableHead>
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
                  <TableHead>EBT</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>NPAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.map((row, index) => (
                  <TableRow key={row.year} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                    <TableCell>{row.year}</TableCell>
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
    </div>
  );
};

export default PlatformPL;