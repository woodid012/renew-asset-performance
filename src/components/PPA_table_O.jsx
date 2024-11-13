// PPA_table_O.jsx
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PPATableOutputs = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();

  const generateOutputData = () => {
    const startYear = constants.analysisStartYear;
    const endYear = constants.analysisEndYear;
    const outputData = [];

    Object.values(assets).forEach(asset => {
      for (let year = startYear; year <= endYear; year++) {
        // Contracted outputs
        asset.contracts.forEach(contract => {
          outputData.push({
            year,
            assetName: asset.name,
            state: asset.state,
            contractId: contract.id || 'Merchant',
            category: 'Contracted',
            type: contract.type,
            volume: Math.round(Math.random() * 1000000),
            price: (Math.random() * 100).toFixed(2),
            revenue: (Math.random() * 100).toFixed(2)
          });
        });

        // Merchant outputs
        outputData.push({
          year,
          assetName: asset.name,
          state: asset.state,
          contractId: 'Merchant',
          category: 'Merchant',
          type: 'merchant',
          volume: Math.round(Math.random() * 500000),
          price: (Math.random() * 80).toFixed(2),
          revenue: (Math.random() * 50).toFixed(2)
        });
      }
    });

    return outputData.sort((a, b) => 
      a.year - b.year || 
      a.assetName.localeCompare(b.assetName) || 
      a.contractId.localeCompare(b.contractId)
    );
  };

  const outputData = useMemo(() => generateOutputData(), [assets, constants]);

  const exportToCSV = () => {
    const headers = [
      'Year',
      'Asset Name',
      'State',
      'Contract ID',
      'Category',
      'Type',
      'Volume (MWh)',
      'Price ($/MWh)',
      'Revenue ($M)'
    ];

    const csvData = outputData.map(row => [
      row.year,
      row.assetName,
      row.state,
      row.contractId,
      row.category,
      row.type,
      row.volume,
      row.price,
      row.revenue
    ]);

    csvData.unshift(headers);
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ppa_outputs_${new Date().toISOString().split('T')[0]}.csv`);
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contract ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Volume (MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price ($/MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Revenue ($M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {outputData.map((row, index) => (
                <tr 
                  key={`${row.year}-${row.assetName}-${row.contractId}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">{row.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.assetName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.state}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.contractId}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.volume.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${row.price}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${row.revenue}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PPATableOutputs;