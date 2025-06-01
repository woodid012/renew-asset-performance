import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";

// Import components for each tab
import LandingPage from "@/pages/LandingPage";
import PortfolioInputs from "@/components/InputsGlobal";
import AssetDashboard from "@/pages/AssetDashboard";
import PortfolioRevenue from "@/components/OutputC_Main";
import PPASummaryTable from "@/components/PPA_general_Summary";
import EarningsRiskAnalysis from "@/pages/EaR_Dashboard";
import ValuationTabs from "@/pages/ValuationTabs";
import PortfolioSettings from "@/pages/PortfolioSettings";
import LoginScreen from "@/pages/LoginScreen";

// Import the shared navigation component
import Navigation, { navigationTabs } from "@/components/shared/Navigation";
import { usePortfolio } from "@/contexts/PortfolioContext";

const App = () => {
  const [activeTab, setActiveTab] = useState("landingpage");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const { 
    setAssets, 
    setPortfolioName, 
    setActivePortfolio,
    setPortfolioSource,
    importPortfolioData
  } = usePortfolio();

  // Check if user was previously logged in
  useEffect(() => {
    const loginStatus = sessionStorage.getItem('portfolioLoggedIn');
    const storedUser = sessionStorage.getItem('currentUser');
    
    if (loginStatus === 'true' && storedUser) {
      setIsLoggedIn(true);
      setCurrentUser(storedUser);
      loadUserPortfolio(storedUser);
    }
  }, []);

  const loadUserPortfolio = async (username) => {
    try {
      const portfolioFile = sessionStorage.getItem('userPortfolioFile');
      const portfolioId = sessionStorage.getItem('userPortfolioId');
      const portfolioName = sessionStorage.getItem('userPortfolioName');
      
      if (portfolioFile) {
        console.log(`Loading portfolio for user ${username}:`, portfolioFile);
        
        const response = await fetch(`/${portfolioFile}`);
        if (!response.ok) throw new Error('Failed to load user portfolio');
        
        const data = await response.json();
        
        // Use the import function to load all data including constants
        await importPortfolioData(data);
        
        // Set additional user-specific state
        setActivePortfolio(portfolioId || username.toLowerCase());
        setPortfolioSource(portfolioFile);
        
        console.log(`Portfolio loaded successfully for user ${username}`);
      }
    } catch (error) {
      console.error('Error loading user portfolio:', error);
      // Fall back to empty portfolio
      setAssets({});
      setPortfolioName('New Portfolio');
    }
  };

  const handleLogin = async () => {
    const username = sessionStorage.getItem('currentUser');
    
    setIsLoggedIn(true);
    setCurrentUser(username);
    sessionStorage.setItem('portfolioLoggedIn', 'true');
    
    // Load the user's specific portfolio
    if (username) {
      await loadUserPortfolio(username);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    sessionStorage.removeItem('portfolioLoggedIn');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userPortfolioFile');
    sessionStorage.removeItem('userPortfolioId');
    sessionStorage.removeItem('userPortfolioName');
    
    // Reset to blank portfolio
    setAssets({});
    setPortfolioName('New Portfolio');
    setActivePortfolio('blank');
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
      currentUser={currentUser}
      onLogout={handleLogout}
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