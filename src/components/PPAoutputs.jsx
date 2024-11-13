// PPAOutputs.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const PPAOutputs = () => {
  // Sample static data
  const outputData = [
    {
      year: 2024,
      assetName: "Solar Project 1",
      state: "CA",
      contractId: "PPA-001",
      category: "Contracted",
      type: "solar",
      volume: 100000,
      price: "75.00",
      revenue: "7.50"
    },
    {
      year: 2024,
      assetName: "Wind Project 1",
      state: "TX",
      contractId: "Merchant",
      category: "Merchant",
      type: "wind",
      volume: 50000,
      price: "45.00",
      revenue: "2.25"
    }
  ];

  const exportToCSV = () => {
    console.log('Export to CSV clicked');
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

export default PPAOutputs;