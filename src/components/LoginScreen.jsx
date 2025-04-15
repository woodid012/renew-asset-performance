import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Lock, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('ZEBRE');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'ZEBRE' && password === 'ZEBRE_Platform25') {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  // Tab configuration with colors (same as App.jsx but non-functional)
  const tabs = [
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

  const date = new Date();
  const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Disabled App UI in the background */}
      <div className="pointer-events-none opacity-30">
        <Card className="mx-auto max-w-screen-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Portfolio Earnings and Risk Analysis</h1>
              <div className="text-sm text-muted-foreground">
                Last Updated: {formattedDate}
              </div>
            </div>

            <Tabs value="landingpage" className="space-y-4">
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
              
              <TabsContent value="landingpage">
                <Card className="p-3">
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <h3 className="text-xl font-medium mb-2">Portfolio Analysis Dashboard</h3>
                      <p>Application content will appear here after login</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>

      {/* Login Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Portfolio Earnings Platform</CardTitle>
            <p className="text-center text-gray-500">Please enter your credentials</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn("pl-10", error ? "border-red-500" : "")}
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">Invalid username or password. Please try again.</p>
                  )}
                </div>
                <Button type="submit" className="w-full">Login</Button>

              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginScreen;