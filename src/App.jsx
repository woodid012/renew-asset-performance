import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  TrendingUp, 
  Settings, 
  Sliders 
} from "lucide-react";

// Import components for each tab
import PortfolioInputs from "@/components/PortfolioInputs";
import AssetDashboard from "@/components/AssetDashboard";
//import PortfolioRevenue from "@/components/PortfolioRevenue";
import PPASummaryTable from "@/components/PPASummaryTable";
import EarningsRiskAnalysis from "@/components/EarningsRiskAnalysis";
import PortfolioSettings from "@/components/PortfolioSettings";

const App = () => {
  const [activeTab, setActiveTab] = useState("inputs");

  // Tab configuration
  const tabs = [
    {
      id: "inputs",
      label: "Inputs",
      icon: Sliders,
      component: PortfolioInputs,
    },
    {
      id: "dashboard",
      label: "Asset Dashboard",
      icon: LayoutDashboard,
      component: AssetDashboard,
    },
    //{
     // id: "revenue",
      //label: "Portfolio Summary",
      //icon: FileSpreadsheet,
      //component: PortfolioRevenue,
    //},
    {
      id: "risk",
      label: "Risk Analysis",
      icon: TrendingUp,
      component: EarningsRiskAnalysis,
    },
    {
      id: "ppa",
      label: "PPA Summary",
      icon: FileSpreadsheet,
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Portfolio Management</h1>
            <div className="text-sm text-muted-foreground">
              Last Updated: {new Date().toLocaleDateString()}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-5 w-[600px]">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => {
              const TabComponent = tab.component;
              return (
                <TabsContent key={tab.id} value={tab.id}>
                  <Card>
                    <TabComponent />
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-4 text-sm text-muted-foreground">
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