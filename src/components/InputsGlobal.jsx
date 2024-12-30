import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from 'papaparse';
import { read, utils, writeFile } from 'xlsx';
import { Download, Upload } from 'lucide-react';
import PriceChart from './InputsPriceChart';

const MIN_YEAR = 2022;
const MAX_YEAR = 2100;

const InputsGlobal = () => {
  const { constants, updateConstants, getMerchantPrice } = usePortfolio();
  const fileInputRef = useRef(null);

  // Helper function to get available years from merchant prices
  const getAvailableYears = () => {
    const years = new Set();
    const profiles = ['solar', 'wind', 'baseload'];
    const types = ['black', 'green'];
    const states = ['NSW', 'QLD', 'SA', 'VIC'];
    
    profiles.forEach(profile => {
      types.forEach(type => {
        states.forEach(state => {
          for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
            const price = getMerchantPrice(profile, type, state, year);
            if (price !== undefined && price !== null && price !== 0) {
              years.add(year);
            }
          }
        });
      });
    });
    
    return Array.from(years).sort((a, b) => a - b);
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

    if (!constants.priceAggregation) {
      updates.priceAggregation = 'yearly';
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
  }, [getMerchantPrice]);

  const processData = (data) => {
    try {
      const newMerchantPrices = {
        solar: { black: {}, green: {} },
        wind: { black: {}, green: {} },
        baseload: { black: {}, green: {} }
      };

      data.forEach(row => {
        if (!row.profile || !row.type || !row.state || !row.year || !row.month || !row.price) {
          console.warn('Skipping row with missing data:', row);
          return;
        }
        
        const yearNum = parseInt(row.year);
        const monthNum = parseInt(row.month);
        
        if (yearNum < MIN_YEAR || yearNum > MAX_YEAR || monthNum < 1 || monthNum > 12) {
          console.warn('Skipping row with invalid year/month:', row);
          return;
        }
        
        if (!newMerchantPrices[row.profile]) {
          newMerchantPrices[row.profile] = { black: {}, green: {} };
        }
        if (!newMerchantPrices[row.profile][row.type]) {
          newMerchantPrices[row.profile][row.type] = {};
        }
        if (!newMerchantPrices[row.profile][row.type][row.state]) {
          newMerchantPrices[row.profile][row.type][row.state] = {};
        }
        if (!newMerchantPrices[row.profile][row.type][row.state][yearNum]) {
          newMerchantPrices[row.profile][row.type][row.state][yearNum] = {};
        }

        // Store monthly data
        newMerchantPrices[row.profile][row.type][row.state][yearNum][monthNum] = {
          price: parseFloat(row.price)
        };
      });

      updateConstants('merchantPrices', newMerchantPrices);
    } catch (error) {
      console.error('Error processing data:', error);
      alert('Error processing file. Please check the format.');
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => processData(data)
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = read(data, { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);
        processData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a CSV or Excel file');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleExport = () => {
    const rows = [];
    const profiles = ['solar', 'wind', 'baseload'];
    const types = ['black', 'green'];
    const states = ['NSW', 'QLD', 'SA', 'VIC'];
    
    profiles.forEach(profile => {
      types.forEach(type => {
        states.forEach(state => {
          const years = getAvailableYears();
          years.forEach(year => {
            // Export monthly data
            for (let month = 1; month <= 12; month++) {
              const price = getMerchantPrice(profile, type, state, `1/${month.toString().padStart(2, '0')}/${year}`);
              if (price !== undefined && price !== null && price !== 0) {
                rows.push({
                  profile,
                  type,
                  state,
                  year,
                  month,
                  price: price.toFixed(2)
                });
              }
            }
          });
        });
      });
    });

    // Create workbook and worksheet with formatting
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Prices");

    // Add column headers
    ws['!cols'] = [
      { wch: 10 },  // profile
      { wch: 8 },   // type
      { wch: 6 },   // state
      { wch: 6 },   // year
      { wch: 6 },   // month
      { wch: 10 }   // price
    ];

    // Save file
    writeFile(wb, 'merchant_prices_base_real.xlsx');
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
    <div className="space-y-2">
      {/* Analysis Period Card */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="px-0">Analysis Period</CardTitle>
        </CardHeader>
        <CardContent className="p-2 px-6">
          <div className="flex gap-4">
            <div className="space-y-0.5">
              <label className="block text-sm font-medium mb-0.5">Start Year</label>
              <Select 
                value={String(constants.analysisStartYear)}
                onValueChange={value => updateConstants('analysisStartYear', parseInt(value))}
              >
                <SelectTrigger className="w-28">
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

            <div className="space-y-0.5">
              <label className="block text-sm font-medium mb-0.5">End Year</label>
              <Select 
                value={String(constants.analysisEndYear)}
                onValueChange={value => updateConstants('analysisEndYear', parseInt(value))}
              >
                <SelectTrigger className="w-28">
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
          <CardTitle className="flex justify-between items-center">
            <span>Price Curve</span>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Base Prices (pre-escalation)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Save Base Prices (pre-escalation)
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inputs Sub-Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Adjust Real to Nominal</span>
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
                <span>Price Curves for Analysis ($nominal)</span>
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