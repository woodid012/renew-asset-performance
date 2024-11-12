import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  BarChart3,
  AlertTriangle,
  Sliders,
  FileCheck,
  Settings
} from 'lucide-react';

// Import components for each tab
import PortfolioInputs from "@/components/PortfolioInputs";
import AssetDashboard from "@/components/AssetDashboard";
import PortfolioRevenue from "@/components/PortfolioRevenue";
import PPASummaryTable from "@/components/PPASummaryTable";
import EarningsRiskAnalysis from "@/components/EarningsRiskAnalysis";
import PortfolioSettings from "@/components/PortfolioSettings";

const App = () => {
  const [activeTab, setActiveTab] = useState("inputs");

  // Tab configuration
  const tabs = [
    {
      id: "inputs",
      label: "Global Inputs",
      icon: Sliders,
      component: PortfolioInputs,
    },
    {
      id: "dashboard",
      label: "Asset Definition",
      icon: Building2,
      component: AssetDashboard,
    },
    {
      id: "revenue",
      label: "Portfolio Charts",
      icon: BarChart3,
      component: PortfolioRevenue,
    },
    {
      id: "risk",
      label: "Risk Analysis",
      icon: AlertTriangle,
      component: EarningsRiskAnalysis,
    },

    {
      id: "ppa",
      label: "Export Audit",
      icon: FileCheck,
      component: PPASummaryTable,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      component: PortfolioSettings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="mx-auto max-w-7xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Portfolio Management</h1>
            <div className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString()}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="space-y-6"
          >
            <TabsList className="grid grid-cols-6 w-full gap-2 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => {
              const TabComponent = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id}>
                  <Card className="p-4">
                    <TabComponent />
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-6 text-sm text-muted-foreground">
            <p>
              Manage your portfolio settings, assets, and risk analysis in one place.
            </p>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>Portfolio Management Dashboard © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;