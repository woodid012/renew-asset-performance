import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ValuationAnalysis from './ValuationAnalysis';
import ProjectFinanceDashboard from './ProjectFinanceDashboard';

const ValuationTabs = () => {
  return (
    <Tabs defaultValue="operating" className="w-full">
      <TabsList className="border-b mb-4">
        <TabsTrigger value="operating">Operating Portfolio</TabsTrigger>
        <TabsTrigger value="test">Debt Sizing <span className="ml-2 text-xs py-0.5 px-1.5 rounded-full bg-amber-100 text-amber-800 font-medium">WIP</span></TabsTrigger>
      </TabsList>
      
      <TabsContent value="operating">
        <ValuationAnalysis />
      </TabsContent>
      
      <TabsContent value="test">
        <ProjectFinanceDashboard />
      </TabsContent>
    </Tabs>
  );
};

export default ValuationTabs;