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
import { Alert, AlertDescription } from "@/components/ui/alert";

const ValuationAnalysis = () => {
  const { assets, constants, getMerchantPrice, updateConstants } = usePortfolio();
  const [selectedRevenueCase, setSelectedRevenueCase] = useState('base');
  const [selectedAsset, setSelectedAsset] = useState('Total');
  const [isInitialized, setIsInitialized] = useState(false);
  const [missingData, setMissingData] = useState(false);
  const volumeStress = constants?.volumeVariation;
  const priceStress = constants?.EnergyPriceVariation;
  const discountRates = constants.discountRates;
  const assetCosts = constants.assetCosts || {};

  useEffect(() => {
    // Check if asset costs exist and have necessary values
    if (Object.keys(assets).length > 0) {
      let dataIsMissing = false;
      
      // Check if any asset is missing cost data
      Object.values(assets).forEach(asset => {
        if (!assetCosts[asset.name] || 
            assetCosts[asset.name].operatingCosts === undefined || 
            assetCosts[asset.name].operatingCostEscalation === undefined ||
            assetCosts[asset.name].terminalValue === undefined) {
          dataIsMissing = true;
        }
      });
      
      setMissingData(dataIsMissing);
      
      // If data is missing, initialize with defaults
      if (dataIsMissing && !isInitialized) {
        updateConstants('assetCosts', initializeAssetCosts(assets));
        setIsInitialized(true);
      }
    }
  }, [assets, assetCosts, isInitialized, updateConstants]);

  const valuationResults = useMemo(() => calculateNPVData(
    assets,
    assetCosts,
    discountRates,
    constants,
    getMerchantPrice,
    selectedRevenueCase,
    selectedAsset
  ), [assets, assetCosts, discountRates, selectedRevenueCase, selectedAsset, constants, getMerchantPrice]);

  const handleAssetCostChange = (assetName, field, value) => {
    const newAssetCosts = {
      ...assetCosts,
      [assetName]: {
        ...assetCosts[assetName],
        [field]: value === '' ? '' : parseFloat(value)
      }
    };
    updateConstants('assetCosts', newAssetCosts);
  };

  return (
    <div className="w-full p-4 space-y-2">
      {missingData && (
        <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200">
          <AlertDescription className="text-red-600">
            Missing or incomplete asset cost data. Default values have been created. Please review and update as needed.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Input Parameters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Discount Rates</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-40">Contracted Rate:</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={((discountRates.contract * 100).toFixed(1))}
                      onChange={(e) => updateConstants('discountRates.contract', parseFloat(e.target.value) / 100)}
                      className="w-32 border rounded p-2"
                    />
                    <span>%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-40">Merchant Rate:</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={((discountRates.merchant * 100).toFixed(1))}
                      onChange={(e) => updateConstants('discountRates.merchant', parseFloat(e.target.value) / 100)}
                      className="w-32 border rounded p-2"
                    />
                    <span>%</span>
                  </div>
                </TableCell>
                <TableCell></TableCell>
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
                <TableHead>Start</TableHead>
                <TableHead>Fixed Cost ($M/pa)</TableHead>
                <TableHead>Fixed Cost Esc. (%)</TableHead>
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
                      value={assetCosts[asset.name]?.operatingCosts ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'operatingCosts', e.target.value)}
                      className="w-32 border rounded p-2"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={assetCosts[asset.name]?.operatingCostEscalation ?? ''}
                      onChange={(e) => handleAssetCostChange(asset.name, 'operatingCostEscalation', e.target.value)}
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle>Valuation Analysis</CardTitle>
              <div className="text-2xl font-bold">
                {selectedAsset === 'Total' ? 'Total Portfolio' : selectedAsset} NPV: ${(valuationResults?.totalNPV || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="font-medium">Analysis:</span>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Total">Total Portfolio</SelectItem>
                    {Object.values(assets).map(asset => (
                      <SelectItem key={asset.name} value={asset.name}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Revenue Case:</span>
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
                <YAxis domain={[0, 'auto']} />
                <Tooltip formatter={(value) => `$${value?.toLocaleString()}M`} />
                <Legend />
                <Line type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke="#FFB74D" />
                <Line type="monotone" dataKey="totalCosts" name="Fixed Costs" stroke="#f44336" />
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
                  <TableHead>Terminal Value ($M)</TableHead>
                  <TableHead>Net Cash Flow (inc. Terminal Value) ($M)</TableHead>
                  <TableHead>Present Value ($M)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuationResults?.npvData.map((row, index) => (
                  <TableRow key={row.year} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell>${row.contractRevenue.toFixed(1)}</TableCell>
                    <TableCell>${row.merchantRevenue.toFixed(1)}</TableCell>
                    <TableCell>${row.totalRevenue.toFixed(1)}</TableCell>
                    <TableCell>${Math.abs(row.fixedCosts).toFixed(1)}</TableCell>
                    <TableCell>${row.terminalValue.toFixed(1)}</TableCell>
                    <TableCell>${row.netCashFlow.toFixed(1)}</TableCell>
                    <TableCell>${row.presentValue.toFixed(1)}</TableCell>
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