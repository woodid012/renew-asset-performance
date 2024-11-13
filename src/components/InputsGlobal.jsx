import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from 'papaparse';
import { Download, Upload } from 'lucide-react';
import PriceChart from './InputsPriceChart';

const MIN_YEAR = 2022;
const MAX_YEAR = 2100;

const InputsGlobal = () => {
  const { constants, updateConstants } = usePortfolio();
  const fileInputRef = useRef(null);

  // Helper function to get available years from merchant prices
  const getAvailableYears = () => {
    if (!constants.merchantPrices) return [];
    
    let maxYear = MIN_YEAR;
    Object.values(constants.merchantPrices).forEach(profileData => {
      Object.values(profileData).forEach(typeData => {
        Object.values(typeData).forEach(stateData => {
          const years = Object.keys(stateData)
            .map(Number)
            .filter(year => year >= MIN_YEAR && year <= MAX_YEAR);
          if (years.length > 0) {
            maxYear = Math.max(maxYear, Math.max(...years));
          }
        });
      });
    });
    
    return Array.from(
      { length: maxYear - MIN_YEAR + 1 }, 
      (_, i) => MIN_YEAR + i
    );
  };

  useEffect(() => {
    const updates = {};
    const years = getAvailableYears();
    
    if (!constants.escalation) {
      updates.escalation = 2.5;
    }
    
    if (!constants.referenceYear) {
      updates.referenceYear = 2024;
    }
    
    if (!constants.analysisStartYear) {
      const earliestYear = years.length > 0 ? years[0] : new Date().getFullYear();
      updates.analysisStartYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, earliestYear));
    }
    
    if (!constants.analysisEndYear) {
      const latestYear = years.length > 0 ? years[years.length - 1] : 2035;
      updates.analysisEndYear = Math.min(2035, latestYear);
    }

    if (Object.keys(updates).length > 0) {
      Object.entries(updates).forEach(([key, value]) => {
        updateConstants(key, value);
      });
    }
  }, [constants.merchantPrices]);

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: ({ data }) => {
        try {
          const newMerchantPrices = {
            solar: { black: {}, green: {} },
            wind: { black: {}, green: {} },
            baseload: { black: {}, green: {} }
          };

          data.forEach(row => {
            if (!row.profile || !row.type || !row.state || !row.year || !row.price) return;
            
            const yearNum = parseInt(row.year);
            if (yearNum < MIN_YEAR || yearNum > MAX_YEAR) return;
            
            newMerchantPrices[row.profile] = newMerchantPrices[row.profile] || {};
            newMerchantPrices[row.profile][row.type] = newMerchantPrices[row.profile][row.type] || {};
            newMerchantPrices[row.profile][row.type][row.state] = newMerchantPrices[row.profile][row.type][row.state] || {};
            newMerchantPrices[row.profile][row.type][row.state][yearNum] = parseFloat(row.price);
          });

          updateConstants('merchantPrices', newMerchantPrices);
        } catch (error) {
          console.error('Error processing CSV:', error);
          alert('Error processing CSV file. Please check the format.');
        }
      }
    });
  };

  const handleExport = () => {
    if (!constants.merchantPrices) return;
    
    const rows = [];
    Object.entries(constants.merchantPrices).forEach(([profile, profileData]) => {
      Object.entries(profileData).forEach(([type, typeData]) => {
        Object.entries(typeData).forEach(([state, stateData]) => {
          Object.entries(stateData).forEach(([year, price]) => {
            rows.push({ profile, type, state, year, price: price.toFixed(2) });
          });
        });
      });
    });

    const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merchant_prices_real_dollars.csv';
    link.click();
  };

  // Get valid years for reference year dropdown (between start and end year)
  const getReferenceYearOptions = () => {
    const start = MIN_YEAR;
    const end = constants.analysisEndYear || MAX_YEAR;
    return Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );
  };

  return (
    <div className="space-y-6">
      {/* Analysis Period Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analysis Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-1/2 flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Start Year</label>
              <Select 
                value={String(constants.analysisStartYear ?? 2022)}
                onValueChange={value => updateConstants('analysisStartYear', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start year" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears()
                    .filter(year => !constants.analysisEndYear || year <= constants.analysisEndYear)
                    .map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">End Year</label>
              <Select 
                value={String(constants.analysisEndYear ?? 2035)}
                onValueChange={value => updateConstants('analysisEndYear', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end year" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears()
                    .filter(year => !constants.analysisStartYear || year >= constants.analysisStartYear)
                    .map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Curve Card */}
      <Card>
        <CardHeader>
          <CardTitle>Price Curve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inputs Sub-Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Inputs ($real)</span>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".csv"
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />Export Real $ CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Import Real $ CSV
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Indexation (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={constants.escalation ?? 2.5}
                    onChange={e => updateConstants('escalation', parseFloat(e.target.value) || 0)}
                    placeholder="Enter escalation rate"
                  />
                  <p className="text-sm text-gray-500">Applied indexation to real pricing</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Year</label>
                  <Select
                    value={String(constants.referenceYear ?? 2024)}
                    onValueChange={value => updateConstants('referenceYear', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reference year" />
                    </SelectTrigger>
                    <SelectContent>
                      {getReferenceYearOptions().map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Base year for real price calculations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Sub-Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Prices ($nominal)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputsGlobal;