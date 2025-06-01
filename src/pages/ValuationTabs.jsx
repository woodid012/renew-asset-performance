import React, { useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Upload, Settings, BarChart3 } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';

// Import the two unified components
import PortfolioInputs from '@/components/PortfolioInputs';
import PortfolioAnalysis from '@/components/PortfolioAnalysis';

const ValuationTabs = () => {
  const fileInputRef = useRef(null);
  const { portfolioName, exportPortfolioData, importPortfolioData } = usePortfolio();

  // Import handler
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          importPortfolioData(importedData);
          
          // Show success message
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
          notification.textContent = 'Portfolio data imported successfully';
          document.body.appendChild(notification);
          
          // Remove notification after 3 seconds
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 3000);
        } catch (error) {
          // Show error message
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
          notification.textContent = 'Error importing portfolio data: Invalid format';
          document.body.appendChild(notification);
          
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 3000);
          
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  // Export handler
  const handleExport = () => {
    try {
      const data = exportPortfolioData();
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      // Create clean filename
      const cleanPortfolioName = portfolioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().split('T')[0];
      const exportFileName = `${cleanPortfolioName}_${timestamp}.json`;
      
      // Create and trigger download
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      // Show success message
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = `Portfolio data exported as ${exportFileName}`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    } catch (error) {
      // Show error message
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = 'Error exporting portfolio data';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      
      console.error('Export error:', error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure portfolio settings and analyze financial performance
            </p>
          </div>
          
          {/* Import/Export Controls */}
          <div className="flex items-center space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              className="hidden"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Portfolio
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Portfolio
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="inputs" className="w-full">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-white border border-gray-200">
              <TabsTrigger 
                value="inputs" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Settings className="w-4 h-4" />
                Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
              >
                <BarChart3 className="w-4 h-4" />
                Analysis
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="inputs" className="mt-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <PortfolioInputs />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <PortfolioAnalysis />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Help Text */}
      <div className="fixed bottom-4 right-4 max-w-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
          <p className="text-xs text-blue-700">
            <strong>💡 Tip:</strong> All settings auto-save and trigger real-time recalculation. 
            Switch between Configuration and Analysis tabs to see results update instantly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValuationTabs;