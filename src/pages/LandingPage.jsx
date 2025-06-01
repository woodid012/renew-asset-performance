import React, { useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  Building2,
  BarChart3,
  AlertTriangle,
  Sliders,
  FileCheck,
  Settings,
  ClipboardList,
  Calculator,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const portfolios = [
  {
    id: 'blank',
    filename: '',
    displayName: 'Blank Template',
    description: 'Start with a clean slate',
    details: [
      'No predefined assets',
      'Configure your own portfolio',
      'Full customization'
    ]
  },
  {
    id: 'templers',
    filename: 'templers_only_2025-04-15.json',
    displayName: 'Templers Only',
    description: 'Single battery storage asset',
    details: [
      'Single Asset - Templers BESS',
      'South Australia - 111MW / 293MWh',
      '100% Tolling contract with ZEN'
    ]
  },
  {
    id: 'zebre',
    filename: 'zebre_2025-01-13.json',
    displayName: 'ZEBRE',
    description: 'Mixed technology portfolio with storage',
    details: [
      '6 Assets including storage',
      'Total capacity BESS 1.1GW + 232 MW Solar',
      'Mix of merchant and contracted'
    ]
  },
  {
    id: 'portfolio1',
    filename: '',
    displayName: 'Portfolio 1',
    description: 'Future portfolio placeholder',
    details: [
      'Placeholder for future assets',
      'Import your own portfolio here',
      'Use for additional asset analysis'
    ]
  },
  {
    id: 'portfolio2',
    filename: '',
    displayName: 'Portfolio 2',
    description: 'Future portfolio placeholder',
    details: [
      'Placeholder for future assets',
      'Import your own portfolio here',
      'Use for comparative analysis'
    ]
  }
];

const features = [
  {
    icon: Sliders,
    title: "Price Inputs",
    description: "Configure analysis parameters and price curves",
    details: [
      "Set date range for analysis and reporting periods",
      "View and analyze price curve data",
      "Modify price curves as needed"
    ]
  },
  {
    icon: Building2,
    title: "Asset Definition",
    description: "Define and manage portfolio assets",
    details: [
      "Define assets for portfolio analysis",
      "Configure contracts by asset (bundled, Energy, green)",
      "Manage uncontracted merchant assets"
    ]
  },
  {
    icon: BarChart3,
    title: "Revenue Charts",
    description: "Visualize portfolio revenue and contract analysis",
    details: [
      "Revenue and contract fraction portfolio view",
      "Individual asset revenue analysis",
      "Breakdown by Energy, green, and contracted merchant"
    ]
  },
  {
    icon: AlertTriangle,
    title: "Risk Analysis",
    description: "Monte Carlo simulation and risk assessment",
    details: [
      "Monte Carlo analysis with flexible parameters",
      "Volume output and price sensitivity analysis",
      "Downside scenario evaluation"
    ]
  },
  {
    icon: Calculator,
    title: "Valuation",
    description: "Calculate asset and portfolio valuations",
    details: [
      "NPV calculations based on revenue streams",
      "Asset cost and capital expenditure analysis",
      "Customizable discount rate scenarios"
    ]
  },
  {
    icon: FileCheck,
    title: "Export Audit",
    description: "Detailed data export and audit capabilities",
    details: [
      "Timestep summary data export",
      "Model audit documentation",
      "Excel-compatible output format"
    ]
  }
];

const LandingPage = () => {
  const { 
    setAssets, 
    setPortfolioName, 
    activePortfolio, 
    setActivePortfolio,
    assets 
  } = usePortfolio();

  // Initialize blank portfolio if nothing is selected
  useEffect(() => {
    if (!activePortfolio) {
      loadPortfolio(portfolios[0]); // Load blank template by default
    }
  }, [activePortfolio]);

  const loadPortfolio = async (portfolio) => {
    if (portfolio.id === 'blank') {
      // Load empty portfolio
      setAssets({});
      setPortfolioName('New Portfolio');
      setActivePortfolio(portfolio.id);
      return;
    }

    try {
      const response = await fetch(`/${portfolio.filename}`);
      if (!response.ok) throw new Error('Failed to load portfolio');
      
      const data = await response.json();
      setAssets(data.assets);
      setPortfolioName(data.portfolioName);
      setActivePortfolio(portfolio.id);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      alert('Failed to load portfolio');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Portfolio Selection Card */}
      <div className="mb-8">
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">Select Demo Portfolio</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {portfolios.map((portfolio) => (
                <Card key={portfolio.id} className="p-4 bg-white hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="flex-grow space-y-3">
                    <h3 className="text-lg font-semibold">{portfolio.displayName}</h3>
                    <p className="text-sm text-gray-600">{portfolio.description}</p>
                    <ul className="space-y-1">
                      {portfolio.details.map((detail, idx) => (
                        <li key={idx} className="text-xs text-gray-500 flex items-center">
                          <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 mt-auto">
                    <Button 
                      className={cn(
                        "w-full",
                        activePortfolio === portfolio.id ? "bg-green-500 hover:bg-green-600" : ""
                      )}
                      onClick={() => {
                        console.log('Loading portfolio:', portfolio.id);
                        loadPortfolio(portfolio);
                      }}
                    >
                      {activePortfolio === portfolio.id ? (
                        <span className="flex items-center justify-center">
                          <Check className="w-4 h-4 mr-2" />
                          Loaded
                        </span>
                      ) : (
                        "Load Portfolio"
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Prototype Notes Card */}
      <div className="mb-16">
        <Card className="p-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center">
              <ClipboardList className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">Prototype Notes</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">Remember this is just a prototype...bugs are expected</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">All contract values are assumed values for demonstration purposes</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">Contracts setup as basic PPA functionaltiy - can add wholesale swap types, CIS, customisable settlement calculations</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <feature.icon className="h-8 w-8 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">{feature.title}</h2>
            </div>
            <p className="text-gray-600 mb-4">{feature.description}</p>
            <ul className="space-y-2">
              {feature.details.map((detail, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-500">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                  {detail}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;