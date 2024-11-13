// PPAOutputs.jsx
import React from 'react';

const PPAOutputs = () => {
  // Simple static data
  const outputData = [
    {
      year: 2024,
      assetName: "Solar Project 1",
      contractId: "PPA-001"
    }
  ];

  return (
    <div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Year</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Asset Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contract ID</th>
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
              <td className="px-4 py-3 text-sm text-gray-900">{row.contractId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PPAOutputs;