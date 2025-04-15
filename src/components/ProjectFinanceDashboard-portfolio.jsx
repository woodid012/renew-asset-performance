import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { initializeProjectValues, calculateProjectMetrics, calculateIRR, DEFAULT_PROJECT_FINANCE } from './ProjectFinance_Calcs';



const ProjectFinanceDashboard = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [selectedAsset, setSelectedAsset] = useState(() => {
    const firstAsset = Object.values(assets)[0];
    return firstAsset ? firstAsset.name : '';
  });
  
  const [projectValues, setProjectValues] = useState(() => Object.keys(assets).length > 0 ? initializeProjectValues(assets) : {});
  const [isGearingSolved, setIsGearingSolved] = useState(false);


  useEffect(() => {
    if (Object.keys(assets).length > 0) {
      setProjectValues(initializeProjectValues(assets));
    }
  }, [assets]);

  const projectMetrics = useMemo(() => calculateProjectMetrics(
    assets,
    projectValues,
    constants,
    getMerchantPrice,
    selectedRevenueCase,
    false  // Never solve gearing in metrics calculation
  ), [assets, projectValues, selectedRevenueCase, constants, getMerchantPrice]);

  const handleProjectValueChange = (assetName, field, value) => {
    setIsGearingSolved(false); // Reset solved state when values change
    setProjectValues(prev => ({
      ...prev,
      [assetName]: {
        ...prev[assetName],
        [field]: value === '' ? '' : parseFloat(value)
      }
    }));
  };

  const handleSolveGearing = () => {
    // Calculate new gearing values
    const newMetrics = calculateProjectMetrics(
      assets,
      projectValues,
      constants,
      getMerchantPrice,
      selectedRevenueCase,
      true
    );
  
    // Update projectValues with the solved gearing
    // Update projectValues with the solved gearing
  setProjectValues(prev => {
    const newValues = { ...prev };
    Object.entries(newMetrics).forEach(([assetName, metrics]) => {
      if (assetName === 'portfolio') {
        newValues.portfolio = {
          ...prev.portfolio,
          calculatedGearing: metrics.calculatedGearing
        };
      } else {
        newValues[assetName] = {
          ...prev[assetName],
          calculatedGearing: metrics.calculatedGearing
        };
      }
    });
    return newValues;
  });
  setIsGearingSolved(true);
  };

  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

  console.log('Portfolio metrics row:', {
    portfolioMetrics: projectMetrics.portfolio,
    calculatedGearing: projectMetrics.portfolio?.calculatedGearing,
    maxGearing: projectValues.portfolio?.maxGearing
  });

  return (
    <div className="w-full p-4 space-y-4">
      {/* Project Parameters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Capacity (MW)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Asset Life (Years)</TableHead>
                <TableHead>Capex ($M)</TableHead>
                <TableHead>Opex ($M/pa)</TableHead>
                <TableHead>Opex Esc. (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(assets).map((asset) => (
                <TableRow key={asset.name}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.capacity}</TableCell>
                  <TableCell>{asset.assetStartDate ? new Date(asset.assetStartDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{asset.assetLife}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.capex ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'capex', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.opex ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'opex', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.opexEscalation ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'opexEscalation', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Debt Parameters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Debt Parameters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Max Gearing (%)</TableHead>
                <TableHead>Target DSCR Contract (x)</TableHead>
                <TableHead>Target DSCR Merchant (x)</TableHead>
                <TableHead>Interest Rate (%)</TableHead>
                <TableHead>Tenor (Years)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(assets).map((asset) => (
                <TableRow key={asset.name}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={(projectValues[asset.name]?.maxGearing * 100) ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'maxGearing', e.target.value / 100)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.targetDSCRContract ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'targetDSCRContract', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.targetDSCRMerchant ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>

                  <TableCell>
                    <input
                      type="number"
                      value={(projectValues[asset.name]?.interestRate * 100) ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'interestRate', e.target.value / 100)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues[asset.name]?.tenorYears ?? ''}
                      onChange={(e) => handleProjectValueChange(asset.name, 'tenorYears', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(assets).length >= 2 && (
                <TableRow className="bg-muted/50">
                  <TableCell>Portfolio Refinance</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={(projectValues.portfolio?.maxGearing * 100) ?? ''}
                      onChange={(e) => handleProjectValueChange('portfolio', 'maxGearing', e.target.value / 100)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues.portfolio?.targetDSCRContract ?? ''}
                      onChange={(e) => handleProjectValueChange('portfolio', 'targetDSCRContract', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues.portfolio?.targetDSCRMerchant ?? ''}
                      onChange={(e) => handleProjectValueChange('portfolio', 'targetDSCRMerchant', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={(projectValues.portfolio?.interestRate * 100) ?? ''}
                      onChange={(e) => handleProjectValueChange('portfolio', 'interestRate', e.target.value / 100)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={projectValues.portfolio?.tenorYears ?? ''}
                      onChange={(e) => handleProjectValueChange('portfolio', 'tenorYears', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Project Metrics */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Project Metrics</CardTitle>
            <Button 
              onClick={handleSolveGearing}
              className={isGearingSolved ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
            >
              {isGearingSolved ? "Gearing Solved" : "Solve Gearing"}
            </Button>
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
            
          </div>
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
                <TableHead>Equity IRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectMetrics)
                .filter(([assetName]) => assetName !== 'portfolio')
                .map(([assetName, metrics]) => (
                <TableRow key={assetName}>
                  <TableCell>{assetName}</TableCell>
                  <TableCell>${metrics.capex.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{formatPercent(metrics.calculatedGearing)}</TableCell>
                  <TableCell>${metrics.debtAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>${metrics.annualDebtService.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{metrics.minDSCR.toFixed(2)}x</TableCell>
                  <TableCell>{calculateIRR(metrics.equityCashFlows) ? formatPercent(calculateIRR(metrics.equityCashFlows)) : 'N/A'}</TableCell>
                </TableRow>
              ))}
              

              {Object.keys(assets).length >= 2 && (
                <TableRow className="bg-muted/50">
                  <TableCell>Portfolio Refinance</TableCell>
                  <TableCell>${projectMetrics.portfolio?.capex.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{projectMetrics.portfolio ? formatPercent(projectMetrics.portfolio.calculatedGearing) : formatPercent(projectValues.portfolio?.maxGearing || 0)}</TableCell>
                  <TableCell>${projectMetrics.portfolio?.debtAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>${projectMetrics.portfolio?.annualDebtService.toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                  <TableCell>{projectMetrics.portfolio ? (projectMetrics.portfolio.minDSCR.toFixed(2) + 'x') : 'N/A'}</TableCell>
                  <TableCell>{projectMetrics.portfolio && calculateIRR(projectMetrics.portfolio.equityCashFlows) ? formatPercent(calculateIRR(projectMetrics.portfolio.equityCashFlows)) : 'N/A'}</TableCell>
                </TableRow>
              )}
                            {Object.keys(assets).length >= 2 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-gray-600">
                    Portfolio refinancing starts from {Math.max(...Object.values(assets).map(asset => new Date(asset.assetStartDate).getFullYear()))} 
                     (when all assets are operational). Before this, individual asset financing applies.
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
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(assets).length >= 2 && (
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                )}
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
  data={projectMetrics[selectedAsset]?.cashFlows || []}
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

      
    </div>
  );
};

export default ProjectFinanceDashboard;