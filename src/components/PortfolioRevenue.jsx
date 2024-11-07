import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const PortfolioDashboard = () => {
  // Asset visibility state
  const [visibleAssets, setVisibleAssets] = useState({
    'Solar Farm Alpha': true,
    'Wind Farm Beta': true
  });

  // Portfolio data
  const portfolioData = [
    {
      year: 2024,
      assets: {
        'Solar Farm Alpha': {
          total: 85,
          contracted: 63,
          merchant: 22,
          contractedPercentage: 74
        },
        'Wind Farm Beta': {
          total: 112,
          contracted: 67,
          merchant: 45,
          contractedPercentage: 60
        }
      }
    },
    {
      year: 2025,
      assets: {
        'Solar Farm Alpha': {
          total: 88,
          contracted: 65,
          merchant: 23,
          contractedPercentage: 74
        },
        'Wind Farm Beta': {
          total: 115,
          contracted: 69,
          merchant: 46,
          contractedPercentage: 60
        }
      }
    },
    {
      year: 2026,
      assets: {
        'Solar Farm Alpha': {
          total: 91,
          contracted: 67,
          merchant: 24,
          contractedPercentage: 74
        },
        'Wind Farm Beta': {
          total: 118,
          contracted: 71,
          merchant: 47,
          contractedPercentage: 60
        }
      }
    },
    {
      year: 2027,
      assets: {
        'Solar Farm Alpha': {
          total: 93,
          contracted: 38,
          merchant: 55,
          contractedPercentage: 41
        },
        'Wind Farm Beta': {
          total: 121,
          contracted: 59,
          merchant: 62,
          contractedPercentage: 49
        }
      }
    },
    {
      year: 2028,
      assets: {
        'Solar Farm Alpha': {
          total: 96,
          contracted: 39,
          merchant: 57,
          contractedPercentage: 41
        },
        'Wind Farm Beta': {
          total: 124,
          contracted: 46,
          merchant: 78,
          contractedPercentage: 37
        }
      }
    },
    {
      year: 2029,
      assets: {
        'Solar Farm Alpha': {
          total: 98,
          contracted: 0,
          merchant: 98,
          contractedPercentage: 0
        },
        'Wind Farm Beta': {
          total: 127,
          contracted: 47,
          merchant: 80,
          contractedPercentage: 37
        }
      }
    },
    {
      year: 2030,
      assets: {
        'Solar Farm Alpha': {
          total: 101,
          contracted: 0,
          merchant: 101,
          contractedPercentage: 0
        },
        'Wind Farm Beta': {
          total: 130,
          contracted: 0,
          merchant: 130,
          contractedPercentage: 0
        }
      }
    }
  ];

  // Process data based on visible assets
  const processedData = portfolioData.map(yearData => {
    const processedYearData = {
      year: yearData.year,
      total: 0,
      contracted: 0,
      merchant: 0,
      weightedContractedPercentage: 0,
      totalGeneration: 0
    };

    Object.entries(yearData.assets).forEach(([assetName, assetData]) => {
      if (visibleAssets[assetName]) {
        processedYearData.total += assetData.total;
        processedYearData.contracted += assetData.contracted;
        processedYearData.merchant += assetData.merchant;
        processedYearData.totalGeneration += assetData.total;
        processedYearData[`${assetName} Total`] = assetData.total;
        processedYearData[`${assetName} Contracted`] = assetData.contracted;
        processedYearData[`${assetName} Merchant`] = assetData.merchant;
      }
    });

    // Calculate weighted contracted percentage
    processedYearData.weightedContractedPercentage = 
      processedYearData.totalGeneration > 0 
        ? (processedYearData.contracted / processedYearData.total) * 100 
        : 0;

    return processedYearData;
  });

  const toggleAsset = (assetName) => {
    setVisibleAssets(prev => ({
      ...prev,
      [assetName]: !prev[assetName]
    }));
  };

  const assetColors = {
    'Solar Farm Alpha': {
      base: '#8884d8',
      light: '#9996db'
    },
    'Wind Farm Beta': {
      base: '#82ca9d',
      light: '#a3d9b6'
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex space-x-4">
        <Card className="w-64">
          <CardHeader>
            <CardTitle>Asset Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(visibleAssets).map((assetName) => (
                <div key={assetName} className="flex items-center space-x-2">
                  <Checkbox
                    id={assetName}
                    checked={visibleAssets[assetName]}
                    onCheckedChange={() => toggleAsset(assetName)}
                  />
                  <Label htmlFor={assetName}>{assetName}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Showing data for {Object.entries(visibleAssets)
                .filter(([_, isVisible]) => isVisible)
                .map(([name]) => name)
                .join(', ')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Total Portfolio Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Revenue (Million $)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {Object.entries(visibleAssets).map(([assetName, isVisible]) => 
                  isVisible && (
                    <React.Fragment key={assetName}>
                      <Bar 
                        dataKey={`${assetName} Contracted`} 
                        stackId="a" 
                        fill={assetColors[assetName].base}
                        name={`${assetName} Contracted`}
                      />
                      <Bar 
                        dataKey={`${assetName} Merchant`} 
                        stackId="a" 
                        fill={assetColors[assetName].light}
                        name={`${assetName} Merchant`}
                      />
                    </React.Fragment>
                  )
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Contracted Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Contracted (%)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weightedContractedPercentage" 
                  stroke="#ff7300" 
                  name="Portfolio Contracted %"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioDashboard;