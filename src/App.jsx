import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  BarChart3,
  AlertTriangle,
  Sliders,
  FileCheck,
  Settings,
  HelpCircle,
  Calculator,
} from 'lucide-react';

// Import components for each tab
import LandingPage from "@/components/LandingPage";
import PortfolioInputs from "@/components/InputsGlobal";
import AssetDashboard from "@/components/AssetDashboard";
import PortfolioRevenue from "@/components/OutputC_Main";
import PPASummaryTable from "@/components/PPA_general_Summary";
import EarningsRiskAnalysis from "@/components/EaR_Dashboard";
import ValuationTabs from "@/components/ValuationTabs";
import PortfolioSettings from "@/components/PortfolioSettings";

// import TestDashboard from "@/components/TestDashboard";

const App = () => {
  const [activeTab, setActiveTab] = useState("landingpage");

  // Tab configuration with colors
  const tabs = [
   // {
   //   id: "test",
    //  label: "test",
     // icon: HelpCircle,
     //component: TestDashboard,
     // colors: "hover:bg-blue-100 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
   //},
    {
      id: "landingpage",
      label: "Usage",
      icon: HelpCircle,
      component: LandingPage,
      colors: "hover:bg-blue-100 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
    },
    {
      id: "inputs",
      label: "Price Inputs",
      icon: Sliders,
      component: PortfolioInputs,
      colors: "hover:bg-green-100 data-[state=active]:bg-green-500 data-[state=active]:text-white",
    },
    {
      id: "dashboard",
      label: "Asset Definition",
      icon: Building2,
      component: AssetDashboard,
      colors: "hover:bg-purple-100 data-[state=active]:bg-purple-500 data-[state=active]:text-white",
    },
    {
      id: "revenue",
      label: "Revenue Charts",
      icon: BarChart3,
      component: PortfolioRevenue,
      colors: "hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white",
    },
    {
      id: "risk",
      label: "Risk Analysis",
      icon: AlertTriangle,
      component: EarningsRiskAnalysis,
      colors: "hover:bg-red-100 data-[state=active]:bg-red-500 data-[state=active]:text-white",
    },
    {
      id: "valuation",
      label: "Valuation",
      icon: Calculator,
      component: ValuationTabs,
      colors: "hover:bg-blue-100 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
    },
    {
      id: "ppa",
      label: "Export Audit",
      icon: FileCheck,
      component: PPASummaryTable,
      colors: "hover:bg-teal-100 data-[state=active]:bg-teal-500 data-[state=active]:text-white",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      component: PortfolioSettings,
      colors: "hover:bg-gray-100 data-[state=active]:bg-gray-500 data-[state=active]:text-white",
    },
  ];

  const date = new Date();
  const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="mx-auto max-w-7xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Portfolio Earnings and Risk Analysis</h1>
            <div className="text-sm text-muted-foreground">
              Last Updated: {formattedDate}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-8 p-1 bg-gray-100">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`flex items-center justify-center gap-1 px-1 py-1 text-xs rounded-md transition-colors duration-200 
                    ${tab.colors}`}
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => {
              const TabComponent = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id}>
                  <Card className="p-3">
                    <TabComponent />
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-4 text-xs text-muted-foreground">
            <p>Manage your portfolio settings, assets, and risk analysis in one place.</p>
          </div>
        </div>
      </Card>

      <footer className="mt-4 text-center text-xs text-muted-foreground">
        <p>Portfolio Management Dashboard © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;
