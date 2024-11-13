import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Upload, FileText } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';

const PortfolioSettings = () => {
  const { 
    assets, 
    setAssets,
    constants,
    updateConstants 
  } = usePortfolio();

  const [currentPriceCurve, setCurrentPriceCurve] = useState('merchant_prices_baseload.csv');
  const [currentPortfolio, setCurrentPortfolio] = useState('assets_esp.csv');
  const [priceData, setPriceData] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);

  useEffect(() => {
    // Load default files on component mount
    loadPriceCurve(currentPriceCurve);
    loadPortfolio(currentPortfolio);
  }, []);

  const loadPriceCurve = async (filename) => {
    try {
      const response = await window.fs.readFile(filename, { encoding: 'utf8' });
      setPriceData(response.slice(0, 100) + '...'); // Show preview of data
      setCurrentPriceCurve(filename);
    } catch (error) {
      console.error('Error loading price curve:', error);
    }
  };

  const loadPortfolio = async (filename) => {
    try {
      const response = await window.fs.readFile(filename, { encoding: 'utf8' });
      setPortfolioData(response.slice(0, 100) + '...'); // Show preview of data
      setCurrentPortfolio(filename);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const handlePriceCurveUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      loadPriceCurve(file.name);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handlePortfolioUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      loadPortfolio(file.name);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
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
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            Manage price curves and portfolio data files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Price Curve</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{currentPriceCurve}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('price-curve-input').click()}
                    variant="outline"
                  >
                    Change File
                  </Button>
                </div>
                {priceData && (
                  <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                    {priceData}
                  </div>
                )}
              </div>
              <input
                id="price-curve-input"
                type="file"
                accept=".csv"
                onChange={handlePriceCurveUpload}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Portfolio Data</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{currentPortfolio}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => document.getElementById('portfolio-input').click()}
                    variant="outline"
                  >
                    Change File
                  </Button>
                </div>
                {portfolioData && (
                  <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                    {portfolioData}
                  </div>
                )}
              </div>
              <input
                id="portfolio-input"
                type="file"
                accept=".csv"
                onChange={handlePortfolioUpload}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Import and export your portfolio data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Portfolio Configuration</h3>
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
              <h4 className="font-medium mb-2">Price Curve Management</h4>
              <p className="text-sm text-gray-600">
                The default price curve file is merchant_prices_baseload.csv. You can change this by clicking the Change File button and selecting a new CSV file.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Portfolio Data Management</h4>
              <p className="text-sm text-gray-600">
                The default portfolio file is assets_esp.csv. You can change this by clicking the Change File button and selecting a new CSV file.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Exporting Configuration</h4>
              <p className="text-sm text-gray-600">
                Use the Export Portfolio button to download your complete portfolio configuration as a JSON file. 
                This includes all assets, PPAs, and analysis settings.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Importing Configuration</h4>
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