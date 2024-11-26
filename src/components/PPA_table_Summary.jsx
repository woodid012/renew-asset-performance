import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAssetRevenue } from './RevCalculations';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PPASummarySheet = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();
  
  const minColumns = 3;
  const displayAssets = Object.values(assets).length < minColumns 
    ? [...Object.values(assets), ...Array(minColumns - Object.values(assets).length).fill(null)]
    : Object.values(assets);

  const getFirstContractYear = (asset) => {
    if (!asset?.assetStartDate) return null;
    return new Date(asset.assetStartDate).getFullYear();
  };

  const rows = [
    { 
      label: "Project Details",
      type: "header"
    },
    {
      label: "MW",
      getValue: (asset) => asset?.capacity || "-"
    },
    {
      label: "State",
      getValue: (asset) => asset?.state || "-"
    },
    {
      label: "Start Date",
      getValue: (asset) => asset?.assetStartDate || "-"
    },
    {
      label: "Asset Life",
      getValue: (asset) => {
        if (!asset) return "-";
        return asset.assetLife ? `${asset.assetLife} years` : "35 years";
      }
    },
    {
      label: "Volume",
      type: "header"
    },
    {
      label: "Annual Capacity Factor",
      getValue: (asset) => {
        if (!asset) return "-";
        const q1 = parseFloat(asset.qualrtyCapacityFactor_q1 || 0);
        const q2 = parseFloat(asset.qualrtyCapacityFactor_q2 || 0);
        const q3 = parseFloat(asset.qualrtyCapacityFactor_q3 || 0);
        const q4 = parseFloat(asset.qualrtyCapacityFactor_q4 || 0);
        
        if (q1 + q2 + q3 + q4 === 0) {
          // Try to use the defaults from constants
          if (asset.type && asset.state && constants.capacityFactors?.[asset.type]?.[asset.state]) {
            return `${(constants.capacityFactors[asset.type][asset.state] * 100).toFixed(1)}%`;
          }
          return "-";
        }
        
        const avgCapacityFactor = (q1 + q2 + q3 + q4) / 4;
        return `${avgCapacityFactor.toFixed(1)}%`;
      }
    },
    {
      label: "Volume (GWh)",
      getValue: (asset) => {
        if (!asset) return "-";
        const capacityMW = asset.capacity || 0;
        
        // Get quarterly factors, defaulting to constants if not set
        const getQuarterValue = (quarter) => {
          const value = parseFloat(asset[`qualrtyCapacityFactor_q${quarter}`] || 0);
          if (value === 0 && asset.type && asset.state) {
            return (constants.capacityFactors_qtr?.[asset.type]?.[asset.state]?.[`Q${quarter}`] || 0) * 100;
          }
          return value;
        };
        
        const q1 = getQuarterValue(1) / 100;
        const q2 = getQuarterValue(2) / 100;
        const q3 = getQuarterValue(3) / 100;
        const q4 = getQuarterValue(4) / 100;
        
        const avgCapacityFactor = (q1 + q2 + q3 + q4) / 4;
        const annualGeneration = (capacityMW * avgCapacityFactor * 8760) / 1000;
        
        return annualGeneration.toFixed(1);
      }
    },
    {
      label: "Volume Loss Adjustment",
      getValue: (asset) => asset?.volumeLossAdjustment 
        ? `${parseFloat(asset.volumeLossAdjustment).toFixed(1)}%` 
        : "-"
    },
    {
      label: "Volume (post Adjustment) (GWh)",
      getValue: (asset) => {
        if (!asset) return "-";
        const capacityMW = asset.capacity || 0;
        const volumeLossAdjustment = parseFloat(asset.volumeLossAdjustment || 95) / 100;
        
        // Get quarterly factors, defaulting to constants if not set
        const getQuarterValue = (quarter) => {
          const value = parseFloat(asset[`qualrtyCapacityFactor_q${quarter}`] || 0);
          if (value === 0 && asset.type && asset.state) {
            return (constants.capacityFactors_qtr?.[asset.type]?.[asset.state]?.[`Q${quarter}`] || 0) * 100;
          }
          return value;
        };
        
        const q1 = getQuarterValue(1) / 100;
        const q2 = getQuarterValue(2) / 100;
        const q3 = getQuarterValue(3) / 100;
        const q4 = getQuarterValue(4) / 100;
        
        const avgCapacityFactor = (q1 + q2 + q3 + q4) / 4;
        const annualGeneration = (capacityMW * avgCapacityFactor * 8760 * volumeLossAdjustment) / 1000;
        
        return annualGeneration.toFixed(1);
      }
    },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40 py-2"></TableHead>
              {displayAssets.map((asset, index) => (
                <TableHead 
                  key={index} 
                  className="text-center font-bold py-2"
                >
                  {asset?.name || `-`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow 
                key={rowIndex}
                className={row.type === "header" ? "bg-gray-50" : ""}
              >
                <TableCell 
                  className={`w-40 py-2 ${row.type === "header" ? "font-bold" : ""}`}
                >
                  {row.label}
                </TableCell>
                {displayAssets.map((asset, colIndex) => (
                  <TableCell 
                    key={colIndex} 
                    className="text-center py-2"
                  >
                    {row.type === "header" ? "" : row.getValue(asset)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PPASummarySheet;