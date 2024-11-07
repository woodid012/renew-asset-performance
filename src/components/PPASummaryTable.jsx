import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PPASummaryTable = () => {
  const { assets, constants } = usePortfolio();

  const calculateAnnualGeneration = (asset) => {
    return asset.capacity * constants.HOURS_IN_YEAR * constants.capacityFactors[asset.type][asset.state];
  };

  const generateYearlyData = () => {
    const startYear = constants.analysisStartYear;
    const endYear = constants.analysisEndYear;
    const yearlyData = [];

    for (let year = startYear; year <= endYear; year++) {
      Object.values(assets).forEach(asset => {
        const annualGeneration = calculateAnnualGeneration(asset);

        // Calculate contracted volumes for this year
        asset.contracts.forEach(contract => {
          const contractStart = new Date(contract.startDate).getFullYear();
          const contractEnd = new Date(contract.endDate).getFullYear();

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

        // Calculate merchant exposure
        const contractedPercentage = asset.contracts.reduce((sum, contract) => {
          const contractStart = new Date(contract.startDate).getFullYear();
          const contractEnd = new Date(contract.endDate).getFullYear();
          if (year >= contractStart && year <= contractEnd) {
            return sum + parseFloat(contract.buyersPercentage);
          }
          return sum;
        }, 0);

        const merchantPercentage = 100 - contractedPercentage;
        if (merchantPercentage > 0) {
          const merchantVolume = annualGeneration * (merchantPercentage / 100);
          const merchantMW = asset.capacity * (merchantPercentage / 100);
          const merchantPrice = constants.merchantPrices[asset.state].black + 
                              constants.merchantPrices[asset.state].green;
          const escalationFactor = Math.pow(1 + constants.merchantPrices[asset.state].escalation / 100, year - startYear);

          yearlyData.push({
            year,
            assetName: asset.name,
            state: asset.state,
            type: asset.type,
            ppaNumber: 'Merchant',
            contractType: 'merchant',
            buyerPercentage: merchantPercentage,
            basePrice: merchantPrice.toFixed(2),
            indexation: constants.merchantPrices[asset.state].escalation,
            indexedPrice: (merchantPrice * escalationFactor).toFixed(2),
            term: `${year}`,
            volume: Math.round(merchantVolume),
            equivalentMW: merchantMW.toFixed(1)
          });
        }
      });
    }

    return yearlyData.sort((a, b) => 
      a.year - b.year || 
      a.assetName.localeCompare(b.assetName) || 
      (a.ppaNumber === 'Merchant' ? 1 : -1)
    );
  };

  const tableData = useMemo(() => generateYearlyData(), [assets, constants]);

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
      'Indexation %',
      'Indexed Price ($/MWh)',
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
    link.setAttribute('download', `ppa_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">PPA Details - Annual Summary</h2>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Indexation %</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Indexed Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Volume (MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Equivalent MW</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tableData.map((row, index) => (
                <tr 
                  key={`${row.year}-${row.assetName}-${row.ppaNumber}`}
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
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Contracted Volume (MWh)</p>
              <p className="text-2xl font-bold">
                {tableData
                  .reduce((sum, row) => sum + row.volume, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Contract Price</p>
              <p className="text-2xl font-bold">
                ${(tableData
                  .filter(row => row.contractType !== 'merchant')
                  .reduce((sum, row) => sum + parseFloat(row.indexedPrice), 0) / 
                  tableData.filter(row => row.contractType !== 'merchant').length)
                  .toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Merchant Exposure</p>
              <p className="text-2xl font-bold">
                {(tableData
                  .filter(row => row.contractType === 'merchant')
                  .reduce((sum, row) => sum + row.buyerPercentage, 0) / 
                  tableData.filter(row => row.contractType === 'merchant').length)
                  .toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PPASummaryTable;