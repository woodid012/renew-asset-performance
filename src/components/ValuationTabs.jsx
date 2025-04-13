import React, { useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import ValuationAnalysis from './ValuationAnalysis';
import ProjectFinanceDashboard from './ProjectFinanceDashboard';
import PlatformFinancials from './PlatformFinancials.jsx';
import { usePortfolio } from '@/contexts/PortfolioContext';

const ValuationTabs = () => {
  const fileInputRef = useRef(null);
  const { assets, portfolioName, constants, exportPortfolioData, importPortfolioData } = usePortfolio();

  // Import handler
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          importPortfolioData(importedData);
          alert('Portfolio data imported successfully');
        } catch (error) {
          alert('Error importing portfolio data: Invalid format');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  // Export handler
  const handleExport = () => {
    const data = exportPortfolioData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileName = `${portfolioName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portfolio Analysis</h2>
        <div className="flex gap-2">
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
          >
            <Upload className="w-4 h-4 mr-2" />
            Load Inputs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Save Inputs
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
        <p className="text-sm text-blue-800">
          Use the tabs below to analyze your portfolio from different perspectives: project finance, financial statements, and operating portfolio valuation.
        </p>
      </div>

      <Tabs defaultValue="project-finance" className="w-full">
        <TabsList className="border-b mb-4">
          <TabsTrigger value="project-finance">Project Finance</TabsTrigger>
          <TabsTrigger value="financials">Financial Statements</TabsTrigger>
          <TabsTrigger value="operating">Operating Portfolio</TabsTrigger>
        </TabsList>
        
        <TabsContent value="project-finance">
          <ProjectFinanceDashboard />
        </TabsContent>
        
        <TabsContent value="financials">
          <PlatformFinancials />
        </TabsContent>
        
        <TabsContent value="operating">
          <ValuationAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ValuationTabs;