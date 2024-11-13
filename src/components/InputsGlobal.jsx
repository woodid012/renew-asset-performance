import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from "@/components/ui/button";
import Papa from 'papaparse';
import { Download, Upload } from 'lucide-react';
import PriceChart from './InputsPriceChart';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

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
            const validYears = years.filter(year => year >= MIN_YEAR && year <= MAX_YEAR);
            if (validYears.length > 0) {
              const minYear = Math.min(...validYears);
              if (minYear < earliestYear) earliestYear = minYear;
            }
          });
        });
      });

      // Set defaults
      updateConstants('escalation', 2.5); // Default to 2.5%
      updateConstants('referenceYear', Math.max(MIN_YEAR, Math.min(MAX_YEAR, earliestYear)));
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
    if (!isNaN(newValue) && newValue >= MIN_YEAR && newValue <= MAX_YEAR) {
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
              
              const year = parseInt(row.year);
              // Skip records with years outside our valid range
              if (year < MIN_YEAR || year > MAX_YEAR) return;
              
              const { profile, type, state, price } = row;
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

            // Ensure reference year is within bounds
            const validReferenceYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, earliestYear));

            updateConstants('merchantPrices', newMerchantPrices);
            updateConstants('referenceYear', validReferenceYear);
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
            const yearNum = parseInt(year);
            // Skip years outside valid range
            if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) return;
            
            // Apply escalation if enabled
            let escalatedPrice = price;
            if (constants.escalation && constants.referenceYear) {
              const yearDiff = yearNum - constants.referenceYear;
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
              <label className="text-sm font-medium">Indexation (%)</label>
              <Input
                type="number"
                step="0.1"
                value={constants.escalation ?? 2.5}
                onChange={(e) => handleEscalationChange(e.target.value)}
                placeholder="Enter escalation rate"
              />
              <p className="text-sm text-gray-500">Applied indexation to real pricing</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Year</label>
              <Input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={constants.referenceYear ?? ''}
                onChange={(e) => handleReferenceYearChange(e.target.value)}
                placeholder={`Enter reference year (${MIN_YEAR}-${MAX_YEAR})`}
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