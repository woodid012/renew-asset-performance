import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { calculateProjectMetrics, calculateIRR } from './ProjectFinance_Calcs';
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProjectFinanceDashboard = () => {
  const { assets, constants, getMerchantPrice, updateConstants } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [selectedAsset, setSelectedAsset] = useState(() => {
    const firstAsset = Object.values(assets)[0];
    return firstAsset ? firstAsset.name : '';
  });
  
  const [isGearingSolved, setIsGearingSolved] = useState(false);
  const [missingData, setMissingData] = useState(false);

  // Check if asset costs data is complete
  useEffect(() => {
    if (Object.keys(assets).length > 0) {
      let dataIsMissing = false;
      
      Object.values(assets).forEach(asset => {
        const assetCosts = constants.assetCosts[asset.name];
        if (!assetCosts || 
            assetCosts.capex === undefined || 
            assetCosts.operatingCosts === undefined ||
            assetCosts.operatingCostEscalation === undefined ||
            assetCosts.maxGearing === undefined ||
            assetCosts.targetDSCRContract === undefined ||
            assetCosts.targetDSCRMerchant === undefined ||
            assetCosts.interestRate === undefined ||
            assetCosts.tenorYears === undefined) {
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
    const metrics = calculateProjectMetrics(
      assets,
      constants.assetCosts, // Pass assetCosts
      constants,
      getMerchantPrice,
      selectedRevenueCase,
      false  // Never solve gearing in metrics calculation
    );
    // Remove portfolio from metrics if it exists
    const { portfolio, ...assetMetrics } = metrics;
    return assetMetrics;
  }, [assets, constants.assetCosts, selectedRevenueCase, constants, getMerchantPrice]);

  const handleAssetCostChange = (assetName, field, value) => {
    setIsGearingSolved(false); // Reset solved state when values change
    const newValue = value === '' ? '' : parseFloat(value);
    
    updateConstants('assetCosts', {
      ...constants.assetCosts,
      [assetName]: {
        ...constants.assetCosts[assetName],
        [field]: field === 'maxGearing' || field === 'interestRate' ? newValue / 100 : newValue
      }
    });
  };

  const handleSolveGearing = () => {
    // Calculate new gearing values
    const newMetrics = calculateProjectMetrics(
      assets,
      constants.assetCosts,
      constants,
      getMerchantPrice,
      selectedRevenueCase,
      true
    );
  
    // Remove portfolio from metrics if it exists
    const { portfolio, ...assetMetrics } = newMetrics;
    
    // Update assetCosts with the solved gearing for assets only
    const updatedAssetCosts = { ...constants.assetCosts };
    Object.entries(assetMetrics).forEach(([assetName, metrics]) => {
      updatedAssetCosts[assetName] = {
        ...updatedAssetCosts[assetName],
        calculatedGearing: metrics.calculatedGearing
      };
    });
    
    updateConstants('assetCosts', updatedAssetCosts);
    setIsGearingSolved(true);
  };

  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="w-full p-4 space-y-4">
      {missingData && (
        <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
          <AlertDescription className="text-red-600">
            Missing or incomplete asset finance data. Default values have been created. Please review and update as needed.
          </AlertDescription>
        </Alert>
      )}

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
                      value={constants.assetCosts[asset.name]?.capex ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'capex', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={constants.assetCosts[asset.name]?.operatingCosts ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={constants.assetCosts[asset.name]?.operatingCostEscalation ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
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
                      value={(constants.assetCosts[asset.name]?.maxGearing * 100) ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'maxGearing', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={constants.assetCosts[asset.name]?.targetDSCRContract ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRContract', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={constants.assetCosts[asset.name]?.targetDSCRMerchant ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'targetDSCRMerchant', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={(constants.assetCosts[asset.name]?.interestRate * 100) ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'interestRate', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={constants.assetCosts[asset.name]?.tenorYears ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'tenorYears', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <TableHead>Debt Amount ($M)</TableHead>
                <TableHead>Annual Debt Service ($M)</TableHead>
                <TableHead>Min DSCR</TableHead>
                <TableHead>Equity IRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectMetrics)
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
                  formatter={(value) => `$${value.toLocaleString()}M`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#FFB74D" />
                <Line type="monotone" dataKey="opex" name="Operating Costs" stroke="#f44336" />
                <Line type="monotone" dataKey="operatingCashFlow" name="CFADS" stroke="#4CAF50" />
                <Line type="monotone" dataKey="debtService" name="Debt Service" stroke="#9C27B0" />
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