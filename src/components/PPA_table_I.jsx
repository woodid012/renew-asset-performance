import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { calculateAssetRevenue } from './RevCalculations';

const PPATableInputs = ({ yearLimit }) => {
  const { assets, constants, getMerchantPrice } = usePortfolio();

  const generateYearlyData = () => {
    const yearlyData = [];
    const endYear = yearLimit 
      ? constants.analysisStartYear + yearLimit - 1 
      : constants.analysisEndYear;

    Object.values(assets).forEach(asset => {
      const assetStartDate = new Date(asset.assetStartDate);
      const assetStartYear = assetStartDate instanceof Date && !isNaN(assetStartDate) 
        ? assetStartDate.getFullYear() 
        : constants.analysisStartYear;

      for (let year = assetStartYear; year <= endYear; year++) {
        // Get the annual generation from the revenue calculation
        const revenueCalc = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        const annualGeneration = revenueCalc.annualGeneration;

        asset.contracts.forEach(contract => {
          const contractStartDate = new Date(contract.startDate);
          const contractEndDate = new Date(contract.endDate);
          
          const contractStart = contractStartDate instanceof Date && !isNaN(contractStartDate)
            ? contractStartDate.getFullYear()
            : assetStartYear;
          const contractEnd = contractEndDate instanceof Date && !isNaN(contractEndDate)
            ? contractEndDate.getFullYear()
            : endYear;

          if (year >= contractStart && year <= contractEnd) {
            const yearsSinceStart = year - contractStart;
            const indexationFactor = Math.pow(1 + contract.indexation / 100, yearsSinceStart);
            
            let basePrice = 0;
            let indexedPrice = 0;

            if (contract.type === 'bundled') {
              basePrice = parseFloat(contract.greenPrice) + parseFloat(contract.blackPrice);
            } else {
              basePrice = parseFloat(contract.strikePrice);
            }

            indexedPrice = basePrice * indexationFactor;
            const contractedVolume = annualGeneration * (contract.buyersPercentage / 100);
            const equivalentMW = asset.capacity * (contract.buyersPercentage / 100);

            yearlyData.push({
              year,
              assetName: asset.name,
              state: asset.state,
              type: asset.type,
              ppaNumber: contract.id,
              contractType: contract.type,
              buyerPercentage: contract.buyersPercentage,
              basePrice: basePrice.toFixed(2),
              indexation: contract.indexation,
              indexedPrice: indexedPrice.toFixed(2),
              term: `${contractStart}-${contractEnd}`,
              volume: Math.round(contractedVolume),
              equivalentMW: equivalentMW.toFixed(1)
            });
          }
        });

        const contractedGreenPercentage = asset.contracts.reduce((sum, contract) => {
          const contractStart = new Date(contract.startDate).getFullYear();
          const contractEnd = new Date(contract.endDate).getFullYear();
          if (year >= contractStart && year <= contractEnd) {
            if (contract.type === 'bundled' || contract.type === 'green') {
              return sum + parseFloat(contract.buyersPercentage);
            }
          }
          return sum;
        }, 0);

        const contractedBlackPercentage = asset.contracts.reduce((sum, contract) => {
          const contractStart = new Date(contract.startDate).getFullYear();
          const contractEnd = new Date(contract.endDate).getFullYear();
          if (year >= contractStart && year <= contractEnd) {
            if (contract.type === 'bundled' || contract.type === 'black') {
              return sum + parseFloat(contract.buyersPercentage);
            }
          }
          return sum;
        }, 0);

        const merchantGreenPercentage = 100 - contractedGreenPercentage;
        const merchantBlackPercentage = 100 - contractedBlackPercentage;

        if (merchantGreenPercentage > 0) {
          const merchantGreenVolume = annualGeneration * (merchantGreenPercentage / 100);
          const merchantGreenMW = asset.capacity * (merchantGreenPercentage / 100);
          
          const baseGreenPrice = getMerchantPrice(asset.type, 'green', asset.state, year);
          const escalatedGreenPrice = applyEscalation(baseGreenPrice, year);

          yearlyData.push({
            year,
            assetName: asset.name,
            state: asset.state,
            type: asset.type,
            ppaNumber: 'Merchant',
            contractType: 'green',
            buyerPercentage: merchantGreenPercentage,
            basePrice: baseGreenPrice.toFixed(2),
            indexation: constants.escalation,
            indexedPrice: escalatedGreenPrice.toFixed(2),
            term: `${year}`,
            volume: Math.round(merchantGreenVolume),
            equivalentMW: merchantGreenMW.toFixed(1)
          });
        }

        if (merchantBlackPercentage > 0) {
          const merchantBlackVolume = annualGeneration * (merchantBlackPercentage / 100);
          const merchantBlackMW = asset.capacity * (merchantBlackPercentage / 100);
          
          const baseBlackPrice = getMerchantPrice(asset.type, 'black', asset.state, year);
          const escalatedBlackPrice = applyEscalation(baseBlackPrice, year);

          yearlyData.push({
            year,
            assetName: asset.name,
            state: asset.state,
            type: asset.type,
            ppaNumber: 'Merchant',
            contractType: 'black',
            buyerPercentage: merchantBlackPercentage,
            basePrice: baseBlackPrice.toFixed(2),
            indexation: constants.escalation,
            indexedPrice: escalatedBlackPrice.toFixed(2),
            term: `${year}`,
            volume: Math.round(merchantBlackVolume),
            equivalentMW: merchantBlackMW.toFixed(1)
          });
        }
      }
    });

    return yearlyData.sort((a, b) => 
      a.year - b.year || 
      a.assetName.localeCompare(b.assetName) || 
      (a.ppaNumber === 'Merchant' ? 1 : -1)
    );
  };

  const tableData = useMemo(() => generateYearlyData(), [assets, constants, yearLimit]);

  const exportToCSV = () => {
    const headers = [
      'Year',
      'Asset Name',
      'State',
      'Type',
      'PPA #',
      'Contract Type',
      'Buyer %',
      'Base Price ($/MWh)',
      'Indexation/Escalation %',
      'Indexed/Escalated Price ($/MWh)',
      'Volume (MWh)',
      'Equivalent MW'
    ];

    const csvData = tableData.map(row => [
      row.year,
      row.assetName,
      row.state,
      row.type,
      row.ppaNumber,
      row.contractType,
      row.buyerPercentage,
      row.basePrice,
      row.indexation,
      row.indexedPrice,
      row.volume,
      row.equivalentMW
    ]);

    csvData.unshift(headers);
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ppa_inputs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Year</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Asset Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">State</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">PPA #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contract Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Buyer %</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Base Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Index %</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Indexed Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Volume (MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Equivalent MW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-4 py-3 text-sm text-gray-500 text-center">
                    No data available for the selected period
                  </td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr 
                    key={`${row.year}-${row.assetName}-${row.ppaNumber}-${row.contractType}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{row.year}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.assetName}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.state}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.ppaNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.contractType}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.buyerPercentage}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">${row.basePrice}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.indexation}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900">${row.indexedPrice}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.equivalentMW}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PPATableInputs;