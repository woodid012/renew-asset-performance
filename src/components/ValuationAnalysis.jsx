import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolio } from '@/contexts/PortfolioContext';
import { 
  DEFAULT_VALUES, 
  initializeAssetCosts,
  calculateStressRevenue,
  calculateNPVData 
} from './ValuationAnalysis_Calcs';

const ValuationAnalysis = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  const [discountRates, setDiscountRates] = useState(DEFAULT_VALUES.discountRates);
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [assetCosts, setAssetCosts] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && Object.keys(assets).length > 0) {
      setAssetCosts(initializeAssetCosts(assets));
      setIsInitialized(true);
    }
  }, [assets, isInitialized]);

  const valuationResults = useMemo(() => calculateNPVData(
    assets,
    assetCosts,
    discountRates,
    constants,
    getMerchantPrice,
    selectedRevenueCase
  ), [assets, assetCosts, discountRates, selectedRevenueCase, constants, getMerchantPrice]);

  const handleAssetCostChange = (assetName, field, value) => {
    setAssetCosts(prev => ({
      ...prev,
      [assetName]: {
        ...prev[assetName],
        [field]: value === '' ? '' : parseFloat(value)
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Input Parameters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Discount Rate</TableHead>
                <TableHead>Merchant Discount Rate</TableHead>
                <TableHead>Revenue Case</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={Number((discountRates.contract * 100).toFixed(2))}
                    onChange={(e) => setDiscountRates(prev => ({
                      ...prev,
                      contract: parseFloat(e.target.value) / 100
                    }))}
                    className="w-32 border rounded p-2"
                  />
                  %
                </TableCell>
                <TableCell>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={Number((discountRates.merchant * 100).toFixed(2))}
                    onChange={(e) => setDiscountRates(prev => ({
                      ...prev,
                      merchant: parseFloat(e.target.value) / 100
                    }))}
                    className="w-32 border rounded p-2"
                  />
                  %
                </TableCell>
                <TableCell>
                  <Select value={selectedRevenueCase} onValueChange={setSelectedRevenueCase}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Case</SelectItem>
                      <SelectItem value="worst">Worst Case</SelectItem>
                      <SelectItem value="volume">Volume Stress</SelectItem>
                      <SelectItem value="price">Price Stress</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Asset Costs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Costs & Terminal Value</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Capacity (MW)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Fixed Cost ($M pa)</TableHead>
                <TableHead>Fixed Cost Index (%)</TableHead>
                <TableHead>Variable Cost ($M per MW)</TableHead>
                <TableHead>Variable Cost Index (%)</TableHead>
                <TableHead>Terminal Value ($M)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(assets).map((asset) => (
                <TableRow key={asset.name}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.capacity || "-"}</TableCell>
                  <TableCell>{asset.assetStartDate ? new Date(asset.assetStartDate).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.fixedCost ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'fixedCost', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.fixedCostIndex ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'fixedCostIndex', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.variableCost ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'variableCost', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.variableCostIndex ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'variableCostIndex', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.terminalValue ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'terminalValue', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* NPV Analysis Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Valuation Analysis</CardTitle>
            <div className="text-2xl font-bold">
              Total NPV: ${(valuationResults?.totalNPV || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cash Flow Chart */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valuationResults?.npvData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value?.toLocaleString()}M`} />
                <Legend />
                <Line type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke="#FFB74D" />
                <Line type="monotone" dataKey="totalCosts" name="Total Costs" stroke="#f44336" />
                <Line type="monotone" dataKey="netCashFlow" name="Net Cash Flow (inc. Terminal Value)" stroke="#9C27B0" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* NPV Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Contract Revenue ($M)</TableHead>
                  <TableHead>Merchant Revenue ($M)</TableHead>
                  <TableHead>Total Revenue ($M)</TableHead>
                  <TableHead>Fixed Costs ($M)</TableHead>
                  <TableHead>Variable Costs ($M)</TableHead>
                  <TableHead>Total Costs ($M)</TableHead>
                  <TableHead>Terminal Value ($M)</TableHead>
                  <TableHead>Net Cash Flow (inc. Terminal Value) ($M)</TableHead>
                  <TableHead>Present Value ($M)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(valuationResults?.npvData || []).map((year) => (
                  <TableRow key={year.year}>
                    <TableCell>{year.year}</TableCell>
                    <TableCell>${(year.contractRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.merchantRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${((year.contractRevenue || 0) + (year.merchantRevenue || 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.fixedCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.variableCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.totalCosts || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.terminalValue || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${((year.netCashFlow || 0) + (year.terminalValue || 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
                    <TableCell>${(year.presentValue || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</TableCell>
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

export default ValuationAnalysis;