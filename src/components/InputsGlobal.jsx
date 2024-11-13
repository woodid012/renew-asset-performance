import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from "@/components/ui/button";
import Papa from 'papaparse';
import { Download, Upload } from 'lucide-react';
import PriceChart from './InputsPriceChart';

const InputsGlobal = () => {
  const { constants, updateConstants } = usePortfolio();
  const fileInputRef = useRef(null);

  // Set defaults on first render
  useEffect(() => {
    if (!constants.escalation && !constants.referenceYear) {
      // Find the earliest year in the merchant prices
      let earliestYear = new Date().getFullYear();
      Object.values(constants.merchantPrices || {}).forEach(profileData => {
        Object.values(profileData).forEach(typeData => {
          Object.values(typeData).forEach(stateData => {
            const years = Object.keys(stateData).map(Number);
            const minYear = Math.min(...years);
            if (minYear < earliestYear) earliestYear = minYear;
          });
        });
      });

      // Set defaults
      updateConstants('escalation', 2.5); // Default to 2.5%
      updateConstants('referenceYear', earliestYear);
    }
  }, []);

  const handleCapacityFactorChange = (technology, state, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0 && newValue <= 1) {
      updateConstants(`capacityFactors.${technology}.${state}`, newValue);
    }
  };

  const handleEscalationChange = (value) => {
    const newValue = parseFloat(value) || 0;
    updateConstants('escalation', newValue);
  };

  const handleReferenceYearChange = (value) => {
    const newValue = parseInt(value);
    if (!isNaN(newValue)) {
      updateConstants('referenceYear', newValue);
    }
  };

  const states = ['NSW', 'QLD', 'SA', 'VIC'];

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            const newMerchantPrices = {};
            
            results.data.forEach(row => {
              if (!row.profile || !row.type || !row.state || !row.year || !row.price) return;
              
              const { profile, type, state, year, price } = row;
              if (!newMerchantPrices[profile]) newMerchantPrices[profile] = {};
              if (!newMerchantPrices[profile][type]) newMerchantPrices[profile][type] = {};
              if (!newMerchantPrices[profile][type][state]) newMerchantPrices[profile][type][state] = {};
              
              newMerchantPrices[profile][type][state][year] = parseFloat(price);
            });

            // Find earliest year for reference
            let earliestYear = new Date().getFullYear();
            Object.values(newMerchantPrices).forEach(profileData => {
              Object.values(profileData).forEach(typeData => {
                Object.values(typeData).forEach(stateData => {
                  const years = Object.keys(stateData).map(Number);
                  const minYear = Math.min(...years);
                  if (minYear < earliestYear) earliestYear = minYear;
                });
              });
            });

            updateConstants('merchantPrices', newMerchantPrices);
            updateConstants('referenceYear', earliestYear);
            if (!constants.escalation) {
              updateConstants('escalation', 2.5); // Set default escalation if not set
            }
          } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Please check the format.');
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          alert('Error parsing CSV file.');
        }
      });
    }
  };

  const handleExport = () => {
    const rows = [];
    Object.entries(constants.merchantPrices).forEach(([profile, profileData]) => {
      Object.entries(profileData).forEach(([type, typeData]) => {
        Object.entries(typeData).forEach(([state, stateData]) => {
          Object.entries(stateData).forEach(([year, price]) => {
            // Apply escalation if enabled
            let escalatedPrice = price;
            if (constants.escalation && constants.referenceYear) {
              const yearDiff = parseInt(year) - constants.referenceYear;
              escalatedPrice = price * Math.pow(1 + constants.escalation / 100, yearDiff);
            }
            
            rows.push({
              profile,
              type,
              state,
              year,
              price: escalatedPrice.toFixed(2)
            });
          });
        });
      });
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merchant_prices_real_dollars.csv';
    link.click();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="font-medium">Technology</div>
            {states.map(state => (
              <div key={`header-${state}`} className="font-medium text-center">{state}</div>
            ))}
            
            {/* Solar Capacity Factors */}
            <div className="font-medium">Solar</div>
            {states.map(state => (
              <div key={`solar-${state}`}>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={constants.capacityFactors?.solar?.[state] ?? ''}
                  onChange={(e) => handleCapacityFactorChange('solar', state, e.target.value)}
                  className="text-center"
                />
              </div>
            ))}

            {/* Wind Capacity Factors */}
            <div className="font-medium">Wind</div>
            {states.map(state => (
              <div key={`wind-${state}`}>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={constants.capacityFactors?.wind?.[state] ?? ''}
                  onChange={(e) => handleCapacityFactorChange('wind', state, e.target.value)}
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Price Inputs (Real Dollars)</span>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".csv"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Real $ CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Real $ CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Real Price Escalation Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                value={constants.escalation ?? 2.5}
                onChange={(e) => handleEscalationChange(e.target.value)}
                placeholder="Enter escalation rate"
              />
              <p className="text-sm text-gray-500">Annual real price change relative to CPI</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Year</label>
              <Input
                type="number"
                value={constants.referenceYear ?? ''}
                onChange={(e) => handleReferenceYearChange(e.target.value)}
                placeholder="Enter reference year"
              />
              <p className="text-sm text-gray-500">Base year for real price calculations</p>
            </div>
          </div>
          <PriceChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default InputsGlobal;