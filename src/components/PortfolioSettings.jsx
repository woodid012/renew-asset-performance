import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioSettings = () => {
  const { 
    assets, 
    setAssets,
    constants,
    updateConstants 
  } = usePortfolio();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          
          // Validate imported data structure
          if (importedData.assets && importedData.constants) {
            setAssets(importedData.assets);
            Object.entries(importedData.constants).forEach(([key, value]) => {
              updateConstants(key, value);
            });
            alert('Portfolio data imported successfully');
          } else {
            throw new Error('Invalid data structure');
          }
        } catch (error) {
          alert('Error importing portfolio data: Invalid format');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const exportPortfolio = () => {
    const exportData = {
      assets,
      constants,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Import and export your portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Portfolio Data</h3>
            <div className="flex gap-4">
              <Button
                onClick={exportPortfolio}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Portfolio
              </Button>

              <Button
                onClick={() => document.getElementById('file-input').click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import Portfolio
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Guide</CardTitle>
          <CardDescription>
            How to manage your portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Exporting Data</h4>
              <p className="text-sm text-gray-600">
                Use the Export Portfolio button to download your complete portfolio configuration as a JSON file. 
                This includes all assets, PPAs, and analysis settings.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Importing Data</h4>
              <p className="text-sm text-gray-600">
                Import previously exported portfolio data using the Import Portfolio button. 
                Make sure the file format matches the export structure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioSettings;