// PPA_table_I.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { calculateAssetRevenue } from './RevCalculations';

const PPATableInputs = () => {
  const { assets, constants, getMerchantPrice } = usePortfolio();

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    if (num === 0) return '0';
    return Number(num).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return '';
    return Number(num).toFixed(1);
  };

  const generateInputsData = () => {
    const startYear = constants.analysisStartYear;
    const endYear = constants.analysisEndYear;
    const inputsData = [];
    
    Object.values(assets).forEach(asset => {
      for (let year = startYear; year <= endYear; year++) {
        const assetRevenue = calculateAssetRevenue(asset, year, constants, getMerchantPrice);
        
        // Add row for each contract
        asset.contracts.forEach(contract => {
          const startYear = new Date(contract.startDate).getFullYear();
          const years = year - startYear;
          const indexation = parseFloat(contract.indexation) || 0;
          const indexationFactor = Math.pow(1 + indexation/100, years);
          const strikePrice = parseFloat(contract.strikePrice) || 0;
          const indexedPrice = strikePrice * indexationFactor;
          const buyersPercentage = parseFloat(contract.buyersPercentage) || 0;
          const contractVolume = (assetRevenue.annualGeneration * buyersPercentage/100);

          inputsData.push({
            year,
            assetName: asset.name,
            contractId: contract.id || 'Merchant',
            contractType: contract.type || '',
            buyersPercentage: buyersPercentage,
            volume: contractVolume,
            strikePrice: strikePrice,
            indexationRate: indexation,
            indexedPrice: indexedPrice,
            merchantBlackPrice: null,
            merchantGreenPrice: null
          });
        });

        // Add merchant row
        const merchantPercentage = 100 - asset.contracts.reduce((sum, contract) => 
          sum + (parseFloat(contract.buyersPercentage) || 0), 0);
        const merchantVolume = (assetRevenue.annualGeneration * merchantPercentage/100);
        const merchantBlackPrice = getMerchantPrice(asset.type, 'black', asset.state, year);
        const merchantGreenPrice = getMerchantPrice(asset.type, 'green', asset.state, year);

        inputsData.push({
          year,
          assetName: asset.name,
          contractId: 'Merchant',
          contractType: 'merchant',
          buyersPercentage: merchantPercentage,
          volume: merchantVolume,
          strikePrice: null,
          indexationRate: null,
          indexedPrice: null,
          merchantBlackPrice,
          merchantGreenPrice
        });
      }
    });

    return inputsData.sort((a, b) => 
      a.year - b.year || 
      a.assetName.localeCompare(b.assetName) || 
      a.contractId.localeCompare(b.contractId)
    );
  };

  const inputsData = generateInputsData();

  const exportToCSV = () => {
    const headers = [
      'Year',
      'Asset Name',
      'Contract ID',
      'Contract Type',
      'Buyers Percentage (%)',
      'Volume (MWh)',
      'Strike Price ($/MWh)',
      'Indexation Rate (%)',
      'Indexed Price ($/MWh)',
      'Merchant Black ($/MWh)',
      'Merchant Green ($/MWh)'
    ];

    const csvData = inputsData.map(row => [
      row.year,
      row.assetName,
      row.contractId,
      row.contractType,
      row.buyersPercentage,
      row.volume,
      row.strikePrice,
      row.indexationRate,
      row.indexedPrice,
      row.contractType === 'merchant' ? row.merchantBlackPrice : '',
      row.contractType === 'merchant' ? row.merchantGreenPrice : ''
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contract ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contract Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Buyers Percentage (%)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Volume (MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Strike Price ($/MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Indexation Rate (%)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Indexed Price ($/MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Merchant Black ($/MWh)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Merchant Green ($/MWh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inputsData.map((row, index) => (
                <tr 
                  key={`${row.year}-${row.assetName}-${row.contractId}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">{row.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.assetName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.contractId}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.contractType}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatPercentage(row.buyersPercentage)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(row.volume)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.strikePrice ? `$${formatNumber(row.strikePrice)}` : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatNumber(row.indexationRate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.indexedPrice ? `$${formatNumber(row.indexedPrice)}` : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.contractType === 'merchant' ? `$${formatNumber(row.merchantBlackPrice)}` : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{row.contractType === 'merchant' ? `$${formatNumber(row.merchantGreenPrice)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PPATableInputs;