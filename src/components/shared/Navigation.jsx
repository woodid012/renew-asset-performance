import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from "@/components/ui/card";
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

// Navigation tabs configuration that can be shared between App and LoginScreen
// This can be imported in both App.jsx and LoginScreen.jsx
export const navigationTabs = [
  {
    id: "landingpage",
    label: "Usage",
    icon: HelpCircle,
    colors: "hover:bg-blue-100 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
  },
  {
    id: "inputs",
    label: "Price Inputs",
    icon: Sliders,
    colors: "hover:bg-green-100 data-[state=active]:bg-green-500 data-[state=active]:text-white",
  },
  {
    id: "dashboard",
    label: "Asset Definition",
    icon: Building2,
    colors: "hover:bg-purple-100 data-[state=active]:bg-purple-500 data-[state=active]:text-white",
  },
  {
    id: "revenue",
    label: "Revenue Charts",
    icon: BarChart3,
    colors: "hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white",
  },
  {
    id: "risk",
    label: "Risk Analysis",
    icon: AlertTriangle,
    colors: "hover:bg-red-100 data-[state=active]:bg-red-500 data-[state=active]:text-white",
  },
  {
    id: "valuation",
    label: "Platform Valuation",
    icon: Calculator,
    colors: "hover:bg-blue-100 data-[state=active]:bg-blue-500 data-[state=active]:text-white",
  },
  {
    id: "ppa",
    label: "Export Audit",
    icon: FileCheck,
    colors: "hover:bg-teal-100 data-[state=active]:bg-teal-500 data-[state=active]:text-white",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    colors: "hover:bg-gray-100 data-[state=active]:bg-gray-500 data-[state=active]:text-white",
  },
];

const Navigation = ({ 
  activeTab, 
  onTabChange, 
  children, 
  disabled = false,
  title = "Portfolio Earnings and Risk Analysis",
  formattedDate
}) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Card className="mx-auto max-w-screen-2xl">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="text-sm text-muted-foreground">
              Last Updated: {formattedDate}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={disabled ? undefined : onTabChange} 
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-8 p-1 bg-gray-100">
              {navigationTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={`flex items-center justify-center gap-1 px-1 py-1 text-xs rounded-md transition-colors duration-200 
                    ${tab.colors} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={disabled}
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {children}
          </Tabs>
        </div>
      </Card>

      <footer className="mt-4 text-center text-xs text-muted-foreground">
        <p>Portfolio Management Dashboard © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Navigation;