import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  calculateProjectMetrics, 
  calculateIRR
} from './ProjectFinance_Calcs';
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProjectFinanceDashboard = () => {
  const { assets, constants, getMerchantPrice, updateConstants } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [selectedAsset, setSelectedAsset] = useState(() => {
    return 'Total Portfolio';
  });
  
  const [isGearingSolved, setIsGearingSolved] = useState(false);
  const [missingData, setMissingData] = useState(false);
  const [globalDebtStructure, setGlobalDebtStructure] = useState('sculpting');
  
  // Function to update all debt structures
  const updateAllDebtStructures = (newStructure) => {
    const updatedAssetCosts = { ...constants.assetCosts };
    
    // Update for all individual assets
    Object.values(assets).forEach(asset => {
      updatedAssetCosts[asset.name] = {
        ...updatedAssetCosts[asset.name],
        debtStructure: newStructure
      };
    });
    
    // Update for portfolio if it exists
    if (updatedAssetCosts.portfolio) {
      updatedAssetCosts.portfolio = {
        ...updatedAssetCosts.portfolio,
        debtStructure: newStructure
      };
    }
    
    // Update state and constants
    setGlobalDebtStructure(newStructure);
    updateConstants('assetCosts', updatedAssetCosts);
    setIsGearingSolved(false);
  };
  
  // Reset gearing solved state when revenue case changes
  useEffect(() => {
    setIsGearingSolved(false);
  }, [selectedRevenueCase]);

  // Ensure portfolio has default parameters if they're missing
  useEffect(() => {
    // Check if we have a portfolio but it doesn't have debt parameters
    if (Object.keys(assets).length >= 2 && 
        (!constants.assetCosts.portfolio || 
         !constants.assetCosts.portfolio.maxGearing)) {
      
      // Create default portfolio parameters
      const portfolioParams = {
        ...constants.assetCosts.portfolio || {},
        maxGearing: 0.75, // Slightly higher than individual assets
        targetDSCRContract: 1.30, // Slightly lower than individual assets
        targetDSCRMerchant: 1.80, // Slightly lower than individual assets
        interestRate: 0.055, // Slightly lower than individual assets
        tenorYears: 18, // Portfolio refinancing tenor
        debtStructure: 'sculpting' // Default to sculpting
      };
      
      // Update the constants
      const updatedAssetCosts = {
        ...constants.assetCosts,
        portfolio: portfolioParams
      };
      
      updateConstants('assetCosts', updatedAssetCosts);
      console.log("Added default portfolio parameters:", portfolioParams);
    }
  }, [assets, constants.assetCosts, updateConstants]);
  
  // Initialize default debt structure if needed
  useEffect(() => {
    // Set default debt structure for each asset if not already set
    if (Object.keys(assets).length > 0) {
      const updatedAssetCosts = { ...constants.assetCosts };
      let needsUpdate = false;
      
      // Check each asset
      Object.values(assets).forEach(asset => {
        if (!updatedAssetCosts[asset.name]?.debtStructure) {
          if (!updatedAssetCosts[asset.name]) {
            updatedAssetCosts[asset.name] = {};
          }
          updatedAssetCosts[asset.name].debtStructure = 'sculpting'; // Default to sculpting
          needsUpdate = true;
        }
      });
      
      // Update if needed
      if (needsUpdate) {
        updateConstants('assetCosts', updatedAssetCosts);
      }
    }
  }, [assets, constants.assetCosts, updateConstants]);

  // Set global debt structure on first load
  useEffect(() => {
    // Initialize on first load
    if (Object.keys(assets).length > 0) {
      // Apply the default debt structure to all assets
      updateAllDebtStructures('sculpting');
    }
  }, []); // Empty dependency array to run only once on component mount

  // Check if asset costs data is complete
  useEffect(() => {
    if (Object.keys(assets).length > 0) {
      let dataIsMissing = false;
      
      // Check if any asset is missing cost data
      Object.values(assets).forEach(asset => {
        if (!constants.assetCosts[asset.name] || 
            constants.assetCosts[asset.name].capex === undefined || 
            constants.assetCosts[asset.name].operatingCosts === undefined ||
            constants.assetCosts[asset.name].operatingCostEscalation === undefined ||
            constants.assetCosts[asset.name].maxGearing === undefined ||
            constants.assetCosts[asset.name].targetDSCRContract === undefined ||
            constants.assetCosts[asset.name].targetDSCRMerchant === undefined ||
            constants.assetCosts[asset.name].interestRate === undefined ||
            constants.assetCosts[asset.name].tenorYears === undefined) {
          dataIsMissing = true;
        }
      });
      
      setMissingData(dataIsMissing);
      
      // Auto-solve gearing when loading
      if (!dataIsMissing && !isGearingSolved) {
        setTimeout(() => handleSolveGearing(), 100);
      }
    }
  }, [assets, constants.assetCosts, isGearingSolved]);

  const projectMetrics = useMemo(() => {
    try {
      const metrics = calculateProjectMetrics(
        assets,
        constants.assetCosts, // Pass assetCosts
        constants,
        getMerchantPrice,
        selectedRevenueCase,
        false  // Never solve gearing in metrics calculation
      );
      return metrics;
    } catch (error) {
      console.error("Error calculating project metrics:", error);
      return {};
    }
  }, [assets, constants.assetCosts, selectedRevenueCase, constants, getMerchantPrice]);

  const handleSolveGearing = () => {
    try {
      // Calculate new gearing values
      const newMetrics = calculateProjectMetrics(
        assets,
        constants.assetCosts,
        constants,
        getMerchantPrice,
        selectedRevenueCase,
        true
      );
      
      // Update assetCosts with the solved gearing
      const updatedAssetCosts = { ...constants.assetCosts };
      Object.entries(newMetrics).forEach(([assetName, metrics]) => {
        if (assetName !== 'portfolio') {
          updatedAssetCosts[assetName] = {
            ...updatedAssetCosts[assetName],
            calculatedGearing: metrics.calculatedGearing
          };
        }
      });
      
      updateConstants('assetCosts', updatedAssetCosts);
      setIsGearingSolved(true);
    } catch (error) {
      console.error("Error solving gearing:", error);
    }
  };

  // Safe formatting functions with null checks
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

  // Get selected asset metrics
  const getSelectedMetrics = () => {
    if (selectedAsset === 'Total Portfolio') {
      return projectMetrics.portfolio || {};
    } else {
      return projectMetrics[selectedAsset] || {};
    }
  };

  // Get cash flow data for charts - make opex and debt service positive
  const getCashFlowData = () => {
    const metrics = getSelectedMetrics();
    
    if (!metrics.cashFlows || metrics.cashFlows.length === 0) return [];
    
    return metrics.cashFlows.map(cf => ({
      ...cf,
      // Convert opex and debt service to positive values for the chart
      opex: Math.abs(cf.opex || 0),
      debtService: Math.abs(cf.debtService || 0)
    }));
  };

  // Prepare DSCR and debt data for chart
  const dscrChartData = useMemo(() => {
    const selectedMetrics = getSelectedMetrics();
    if (!selectedMetrics || !selectedMetrics.cashFlows || !selectedMetrics.cashFlows.length) {
      return [];
    }

    const initialDebtAmount = selectedMetrics.debtAmount || 0;
    
    // Determine interest rate
    let interestRate = 0.06; // Default
    if (selectedAsset === 'Total Portfolio') {
      interestRate = constants.assetCosts.portfolio?.interestRate || 
                    0.06; // Default to 6% if not specified
    } else {
      interestRate = constants.assetCosts[selectedAsset]?.interestRate || 
                    0.06;
    }
    
    // For debugging
    console.log("Selected Asset:", selectedAsset);
    console.log("Initial Debt Amount:", initialDebtAmount);
    console.log("Interest Rate:", interestRate);
    console.log("Debt Structure:", globalDebtStructure);
    
    let remainingBalance = initialDebtAmount;
    
    // Calculate the DSCR values over time
    const dscrValues = [];
    
    const result = selectedMetrics.cashFlows.map((cf, index) => {
      // Calculate DSCR if there's a debt service payment
      let debtServiceAmount = Math.abs(cf.debtService || 0);
      const dscr = debtServiceAmount > 0 ? (cf.operatingCashFlow / debtServiceAmount) : null;
      
      if (dscr !== null) {
        dscrValues.push(dscr);
      }
      
      // Calculate interest component based on remaining balance
      const interestPayment = remainingBalance * interestRate;
      
      // Principal payment is the remaining portion of debt service payment
      const principalPayment = debtServiceAmount > interestPayment ? 
                              debtServiceAmount - interestPayment : 0;
      
      // The current debt balance is what we have before making the payment
      const currentDebtBalance = remainingBalance;
      
      // Update balance for next period - only decrease if there's a debt service payment
      if (debtServiceAmount > 0) {
        remainingBalance = Math.max(0, remainingBalance - principalPayment);
      }
      
      return {
        year: cf.year,
        dscr: dscr !== null ? parseFloat((dscr || 0).toFixed(2)) : null,
        minDSCR: selectedMetrics.minDSCR || 0,
        debtBalance: currentDebtBalance > 0 ? parseFloat((currentDebtBalance || 0).toFixed(2)) : 0,
        principalPayment: principalPayment > 0 ? parseFloat((principalPayment || 0).toFixed(2)) : 0,
        interestPayment: interestPayment > 0 ? parseFloat((interestPayment || 0).toFixed(2)) : 0,
        totalDebtPayment: principalPayment + interestPayment,
        refinancePhase: cf.refinancePhase
      };
    });
    
    // Calculate the minimum DSCR from actual values
    const minDSCR = dscrValues.length > 0 ? Math.min(...dscrValues) : 0;
    
    // Update each data point with the calculated minimum DSCR
    return result.map(point => ({
      ...point,
      minDSCR: parseFloat((minDSCR || 0).toFixed(2))
    }));
  }, [projectMetrics, selectedAsset, constants.assetCosts, getSelectedMetrics, globalDebtStructure]);

  return (
    <div className="w-full p-4 space-y-4">
      {missingData && (
        <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
          <AlertDescription className="text-red-600">
            Missing or incomplete asset finance data. Default values have been created. Please review and update as needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Portfolio Debt Parameters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Debt Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Gearing (%)</label>
              <Input
                type="number"
                value={((constants.assetCosts.portfolio?.maxGearing || 0.75) * 100).toFixed(1)}
                onChange={(e) => {
                  const updatedAssetCosts = {
                    ...constants.assetCosts,
                    portfolio: {
                      ...constants.assetCosts.portfolio,
                      maxGearing: parseFloat(e.target.value) / 100
                    }
                  };
                  updateConstants('assetCosts', updatedAssetCosts);
                  setIsGearingSolved(false);
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">DSCR Contract (x)</label>
              <Input
                type="number"
                step="0.05"
                value={(constants.assetCosts.portfolio?.targetDSCRContract || 1.30).toFixed(2)}
                onChange={(e) => {
                  const updatedAssetCosts = {
                    ...constants.assetCosts,
                    portfolio: {
                      ...constants.assetCosts.portfolio,
                      targetDSCRContract: parseFloat(e.target.value)
                    }
                  };
                  updateConstants('assetCosts', updatedAssetCosts);
                  setIsGearingSolved(false);
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">DSCR Merchant (x)</label>
              <Input
                type="number"
                step="0.05"
                value={(constants.assetCosts.portfolio?.targetDSCRMerchant || 1.80).toFixed(2)}
                onChange={(e) => {
                  const updatedAssetCosts = {
                    ...constants.assetCosts,
                    portfolio: {
                      ...constants.assetCosts.portfolio,
                      targetDSCRMerchant: parseFloat(e.target.value)
                    }
                  };
                  updateConstants('assetCosts', updatedAssetCosts);
                  setIsGearingSolved(false);
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                value={((constants.assetCosts.portfolio?.interestRate || 0.055) * 100).toFixed(1)}
                onChange={(e) => {
                  const updatedAssetCosts = {
                    ...constants.assetCosts,
                    portfolio: {
                      ...constants.assetCosts.portfolio,
                      interestRate: parseFloat(e.target.value) / 100
                    }
                  };
                  updateConstants('assetCosts', updatedAssetCosts);
                  setIsGearingSolved(false);
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenor (Years)</label>
              <Input
                type="number"
                value={(constants.assetCosts.portfolio?.tenorYears || 18)}
                onChange={(e) => {
                  const updatedAssetCosts = {
                    ...constants.assetCosts,
                    portfolio: {
                      ...constants.assetCosts.portfolio,
                      tenorYears: parseInt(e.target.value)
                    }
                  };
                  updateConstants('assetCosts', updatedAssetCosts);
                  setIsGearingSolved(false);
                }}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Debt Structure</label>
              <Select 
                value={globalDebtStructure} 
                onValueChange={updateAllDebtStructures}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select debt structure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amortization">Amortization (All)</SelectItem>
                  <SelectItem value="sculpting">Sculpting (All)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <CardTitle>Project Metrics</CardTitle>
            <div className="flex-1" />
            <Select value={selectedRevenueCase} onValueChange={setSelectedRevenueCase}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select case" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base">Base Case</SelectItem>
                <SelectItem value="worst">Downside Volume & Price</SelectItem>
                <SelectItem value="volume">Volume Stress</SelectItem>
                <SelectItem value="price">Price Stress</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSolveGearing}
              className={isGearingSolved ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
            >
              {isGearingSolved ? "Gearing Solved" : "Solve Gearing"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Total CAPEX ($M)</TableHead>
                <TableHead>Calculated Gearing (%)</TableHead>
                <TableHead>Debt Structure</TableHead>
                <TableHead>Debt Amount ($M)</TableHead>
                <TableHead>Annual Debt Service ($M)</TableHead>
                <TableHead>Min DSCR</TableHead>
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
                  <TableCell>{globalDebtStructure === 'sculpting' ? 'Sculpting' : 'Amortization'}</TableCell>
                  <TableCell>${formatNumber(metrics.debtAmount)}</TableCell>
                  <TableCell>${formatNumber(metrics.annualDebtService)}</TableCell>
                  <TableCell>{formatDSCR(metrics.minDSCR)}</TableCell>
                  <TableCell>{calculateIRR(metrics.equityCashFlows) ? formatPercent(calculateIRR(metrics.equityCashFlows)) : 'N/A'}</TableCell>
                </TableRow>
              ))}
              
              {Object.keys(assets).length >= 2 && projectMetrics.portfolio && (
                <TableRow className="bg-muted/50">
                  <TableCell>Portfolio Total</TableCell>
                  <TableCell>${formatNumber(projectMetrics.portfolio?.capex)}</TableCell>
                  <TableCell>{formatPercent(projectMetrics.portfolio?.calculatedGearing)}</TableCell>
                  <TableCell>{globalDebtStructure === 'sculpting' ? 'Sculpting' : 'Amortization'}</TableCell>
                  <TableCell>${formatNumber(projectMetrics.portfolio?.debtAmount)}</TableCell>
                  <TableCell>${formatNumber(projectMetrics.portfolio?.annualDebtService)}</TableCell>
                  <TableCell>
                    {projectMetrics.portfolio && projectMetrics.portfolio.minDSCR 
                      ? projectMetrics.portfolio.minDSCR.toFixed(2) + 'x' 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {projectMetrics.portfolio?.equityCashFlows && calculateIRR(projectMetrics.portfolio.equityCashFlows) 
                      ? formatPercent(calculateIRR(projectMetrics.portfolio.equityCashFlows)) 
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Project Cash Flows</CardTitle>
            <Select 
              value={selectedAsset} 
              onValueChange={setSelectedAsset}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Total Portfolio">Total Portfolio</SelectItem>
                {Object.values(assets).map(asset => (
                  <SelectItem key={asset.name} value={asset.name}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={getCashFlowData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year"
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Cash Flow ($M)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    const formattedValue = `$${value.toLocaleString()}M`;
                    if (name === 'Debt Service' && props.payload.refinancePhase) {
                      return [formattedValue, `${name} (${props.payload.refinancePhase} financing)`];
                    }
                    return formattedValue;
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#FFB74D" />
                <Line type="monotone" dataKey="opex" name="Operating Costs" stroke="#f44336" />
                <Line type="monotone" dataKey="operatingCashFlow" name="CFADS" stroke="#4CAF50" />
                <Line 
                  type="monotone" 
                  dataKey="debtService" 
                  name="Debt Service" 
                  stroke="#9C27B0"
                  strokeWidth={2}
                  dot={(props) => {
                    if (!props.payload || !props.cx || !props.cy) return null;
                    const { refinancePhase } = props.payload;
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={4}
                        fill={refinancePhase === 'portfolio' ? '#9C27B0' : '#E1BEE7'}
                        stroke="#9C27B0"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
                <Line type="monotone" dataKey="equityCashFlow" name="Equity Cash Flow" stroke="#2196F3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* DSCR Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Service Coverage Ratio & Debt Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={dscrChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="year"
                  label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  yAxisId="left"
                  domain={[0, 'auto']}
                  label={{ value: 'DSCR (x)', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']}
                  label={{ value: 'Amount ($M)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'DSCR' || name === 'Minimum DSCR') {
                      return [`${value}x`, name];
                    } else {
                      return [`$${value.toLocaleString()}M`, name];
                    }
                  }}
                />
                <Legend />
                {/* DSCR lines */}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="dscr" 
                  name="DSCR" 
                  stroke="#2196F3" 
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  connectNulls
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="minDSCR" 
                  name="Minimum DSCR" 
                  stroke="#f44336" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
                {/* Debt balance as a line */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="debtBalance" 
                  name="Debt Balance" 
                  stroke="#9C27B0" 
                  strokeWidth={1.5}
                />
                {/* Debt service components as stacked bars */}
                <Bar 
                  yAxisId="right"
                  dataKey="principalPayment" 
                  name="Principal Payment" 
                  stackId="a"
                  fill="#4CAF50"
                />
                <Bar 
                  yAxisId="right"
                  dataKey="interestPayment" 
                  name="Interest Payment" 
                  stackId="a"
                  fill="#FF9800"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 text-sm bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Current Debt Structure: {globalDebtStructure === 'sculpting' ? 'Sculpting' : 'Amortization'}</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li><span className="font-medium">Amortization:</span> Equal debt service payments throughout the loan term.</li>
              <li><span className="font-medium">Sculpting:</span> Debt service payments vary to maintain a constant Debt Service Coverage Ratio (DSCR).</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectFinanceDashboard;