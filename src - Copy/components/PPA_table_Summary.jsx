import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePortfolio } from '@/contexts/PortfolioContext';

const PPASummarySheet = () => {
  const { assets, constants } = usePortfolio();
  
  // Debug - log asset data
  React.useEffect(() => {
    console.log('Assets in Summary Sheet:', assets);
  }, [assets]);

  const calculateCapacityFactor = (asset) => {
    if (!asset) return "-";
    const q1 = parseFloat(asset.qtrCapacityFactor_q1 || 0);
    const q2 = parseFloat(asset.qtrCapacityFactor_q2 || 0);
    const q3 = parseFloat(asset.qtrCapacityFactor_q3 || 0);
    const q4 = parseFloat(asset.qtrCapacityFactor_q4 || 0);
    
    if (q1 + q2 + q3 + q4 === 0) {
      // Try to use the defaults from constants
      if (asset.type && asset.state && constants.capacityFactors?.[asset.type]?.[asset.state]) {
        return (constants.capacityFactors[asset.type][asset.state] * 100).toFixed(1);
      }
      return "-";
    }
    
    return ((q1 + q2 + q3 + q4) / 4).toFixed(1);
  };

  const calculateVolume = (asset, includeAdjustment = false) => {
    if (!asset) return "-";
    const capacityMW = asset.capacity || 0;
    const volumeLossAdjustment = includeAdjustment ? (parseFloat(asset.volumeLossAdjustment || 95) / 100) : 1;
    
    const getQuarterValue = (quarter) => {
      const value = parseFloat(asset[`qtrCapacityFactor_q${quarter}`] || 0);
      if (value === 0 && asset.type && asset.state) {
        return (constants.capacityFactors_qtr?.[asset.type]?.[asset.state]?.[`Q${quarter}`] || 0) * 100;
      }
      return value.toLocaleString();
    };
    
    const q1 = getQuarterValue(1) / 100;
    const q2 = getQuarterValue(2) / 100;
    const q3 = getQuarterValue(3) / 100;
    const q4 = getQuarterValue(4) / 100;
    
    const avgCapacityFactor = (q1 + q2 + q3 + q4) / 4;
    const annualGeneration = (capacityMW * avgCapacityFactor * 8760 * volumeLossAdjustment);
    
    return annualGeneration.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead colSpan={6} className="text-center bg-gray-50 h-8">
                Details
              </TableHead>
              <TableHead colSpan={4} className="text-center bg-gray-50 h-8">
                Year 1 Volume
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="w-72">Asset Name</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-24">MW</TableHead>
              <TableHead className="w-32">State</TableHead>
              <TableHead className="w-32">Start Date</TableHead>
              <TableHead className="w-32">Asset Life</TableHead>
              <TableHead className="w-40">Annual Capacity Factor</TableHead>
              <TableHead className="w-32">Volume (MWh)</TableHead>
              <TableHead className="w-40">Volume Loss Adj.</TableHead>
              <TableHead className="w-48">Adj. Volume (MWh)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(assets).map((asset) => (
              <TableRow key={asset.name}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.type.charAt(0).toUpperCase() + asset.type.slice(1)|| "-"}</TableCell>
                <TableCell>{asset.capacity || "-"}</TableCell>
                <TableCell>{asset.state || "-"}</TableCell>
                <TableCell>{formatDate(asset.assetStartDate)}</TableCell>
                <TableCell>
                  {(() => {
                    console.log(`Asset ${asset.name} life:`, asset.assetLife);
                    return asset.assetLife ? `${asset.assetLife} years` : "35 years";
                  })()}
                </TableCell>
                <TableCell>{`${calculateCapacityFactor(asset)}%`}</TableCell>
                <TableCell>{calculateVolume(asset)}</TableCell>
                <TableCell>
                  {asset.volumeLossAdjustment 
                    ? `${parseFloat(asset.volumeLossAdjustment).toFixed(1)}%` 
                    : "-"}
                </TableCell>
                <TableCell>{calculateVolume(asset, true)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PPASummarySheet;