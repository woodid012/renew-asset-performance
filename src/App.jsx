import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

// Import components for each tab
import LandingPage from "@/components/LandingPage";
import PortfolioInputs from "@/components/InputsGlobal";
import AssetDashboard from "@/components/AssetDashboard";
import PortfolioRevenue from "@/components/OutputC_Main";
import PPASummaryTable from "@/components/PPA_general_Summary";
import EarningsRiskAnalysis from "@/components/EaR_Dashboard";
import ValuationTabs from "@/components/ValuationTabs";
import PortfolioSettings from "@/components/PortfolioSettings";
import LoginScreen from "@/components/LoginScreen";

// Import the shared navigation component
import Navigation, { navigationTabs } from "@/components/shared/Navigation";

const App = () => {
  const [activeTab, setActiveTab] = useState("landingpage");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user was previously logged in
  useEffect(() => {
    const loginStatus = sessionStorage.getItem('portfolioLoggedIn');
    if (loginStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('portfolioLoggedIn', 'true');
  };

  const date = new Date();
  const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Navigation
      activeTab={activeTab}
      onTabChange={setActiveTab}
      formattedDate={formattedDate}
    >
      {navigationTabs.map((tab) => {
        const TabComponent = (() => {
          switch (tab.id) {
            case "landingpage": return LandingPage;
            case "inputs": return PortfolioInputs;
            case "dashboard": return AssetDashboard;
            case "revenue": return PortfolioRevenue;
            case "risk": return EarningsRiskAnalysis;
            case "valuation": return ValuationTabs;
            case "ppa": return PPASummaryTable;
            case "settings": return PortfolioSettings;
            default: return null;
          }
        })();
        
        return (
          <TabsContent key={tab.id} value={tab.id}>
            <Card className="p-3">
              {TabComponent && <TabComponent />}
            </Card>
          </TabsContent>
        );
      })}
    </Navigation>
  );
};

export default App;