import React from 'react';
import { Card } from "@/components/ui/card";
import {
  Building2,
  BarChart3,
  AlertTriangle,
  Sliders,
  FileCheck,
  Settings,
  ClipboardList
} from 'lucide-react';

const LandingPage = () => {
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
        "Configure contracts by asset (bundled, black, green)",
        "Manage uncontracted merchant assets"
      ]
    },
    {
      icon: BarChart3,
      title: "Portfolio Charts",
      description: "Visualize portfolio revenue and contract analysis",
      details: [
        "Revenue and contract fraction portfolio view",
        "Individual asset revenue analysis",
        "Breakdown by black, green, and contracted merchant"
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
      icon: FileCheck,
      title: "Export Audit",
      description: "Detailed data export and audit capabilities",
      details: [
        "Timestep summary data export",
        "Model audit documentation",
        "Excel-compatible output format"
      ]
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Portfolio configuration management",
      details: [
        "Save portfolio configurations",
        "Import existing portfolios",
        "Export portfolio settings"
      ]
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Prototype Notes Section - Full Width */}
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
              <p className="text-gray-600">Remember this is just a prototype</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">To include price curve import / export (user to set as required)</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">Can include asset intricacies (degration etc.) but not important to prototype</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">Can include additional asset types (Storage etc.)</p>
            </div>
            <div className="flex items-start">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 mt-2"></span>
              <p className="text-gray-600">Contracts setup as basic PPA functionaltiy - can add wholesale swap types, CIS, customisable settlement calculations</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-8">
        <p className="text-lg text-gray-600">
          Use the tabs above to navigate through different aspects of your portfolio analysis.
        </p>
      </div>

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