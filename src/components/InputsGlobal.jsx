import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from 'papaparse';
import { read, utils, writeFile } from 'xlsx';
import { Download, Upload } from 'lucide-react';
import PriceChart from './InputsPriceChart';
import { useMerchantPrices } from '@/contexts/MerchantPriceProvider';
import {
  DEFAULT_PRICE_SETTINGS,
  UI_CONSTANTS
} from '@/lib/default_constants';

const InputsGlobal = () => {
  const { 
    constants, 
    updateConstants, 
    getMerchantPrice, 
    setPriceCurveSource 
  } = usePortfolio();
  
  const { setMerchantPrices } = useMerchantPrices();
  const fileInputRef = useRef(null);

  // Helper function to determine if a value is default (blue) or user-defined (black)
  const getValueStyle = (currentValue, defaultValue) => {
    const isDefault = currentValue === undefined || currentValue === null || currentValue === defaultValue;
    return isDefault ? UI_CONSTANTS.colors.defaultValue : UI_CONSTANTS.colors.userValue;
  };

  const processData = (data) => {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data found in file');
      }

      const firstRow = data[0];
      const availableColumns = Object.keys(firstRow);
      const columnMap = {};
      const requiredColumns = ['profile', 'type', 'state', 'time', 'price'];
      
      let missingColumns = [];
      requiredColumns.forEach(required => {
        const match = availableColumns.find(
          key => key.toLowerCase() === required.toLowerCase()
        );
        if (!match) {
          missingColumns.push(required);
        }
        columnMap[required] = match;
      });

      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      const transformedData = data
        .map((row) => {
          try {
            const profile = row[columnMap.profile];
            const type = row[columnMap.type];
            const state = row[columnMap.state];
            const time = row[columnMap.time];
            const rawPrice = row[columnMap.price];
            const price = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^0-9.-]/g, '')) : parseFloat(rawPrice);
            
            if (!profile || !type || !state || !time || isNaN(price)) {
              return null;
            }

            return {
              profile: profile.toLowerCase(),
              type: type.toLowerCase(),
              state: state.toUpperCase(),
              time,
              price,
              source: 'imported'
            };
          } catch (err) {
            return null;
          }
        })
        .filter(row => row !== null);

      if (!transformedData.length) {
        throw new Error('No valid data rows found in file after processing');
      }

      setMerchantPrices(transformedData);
      setPriceCurveSource('imported');
      
    } catch (error) {
      alert(error.message || 'Error processing file. Please check the data format and try again.');
      throw error;
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

    event.target.value = '';
  };

  const handleExport = () => {
    const rows = [];
    const profiles = ['solar', 'wind', 'baseload'];
    const types = ['Energy', 'green'];
    const states = ['NSW', 'QLD', 'SA', 'VIC'];
    const currentYear = new Date().getFullYear();
    
    profiles.forEach(profile => {
      types.forEach(type => {
        states.forEach(state => {
          for (let year = currentYear; year <= currentYear + 30; year++) {
            for (let month = 1; month <= 12; month++) {
              const time = `1/${month.toString().padStart(2, '0')}/${year}`;
              const price = getMerchantPrice(profile, type, state, time);
              if (price !== undefined && price !== null && price !== 0) {
                rows.push({
                  profile,
                  type,
                  state,
                  time,
                  price: price.toFixed(2)
                });
              }
            }
          }
        });
      });
    });
  
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Prices");
  
    ws['!cols'] = [
      { wch: 10 },  // profile
      { wch: 8 },   // type
      { wch: 6 },   // state
      { wch: 12 },  // time
      { wch: 10 }   // price
    ];
  
    writeFile(wb, 'merchant_prices_base_real.xlsx');
  };

  const getReferenceYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: 10 },
      (_, i) => currentYear - 5 + i
    );
  };

  // Get current values with defaults
  const currentEscalation = constants.escalation !== undefined ? constants.escalation : DEFAULT_PRICE_SETTINGS.escalation;
  const currentReferenceYear = constants.referenceYear !== undefined ? constants.referenceYear : DEFAULT_PRICE_SETTINGS.referenceYear;

  return (
    <div className="w-full p-4 space-y-4"> 
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
          <Card>
            <CardHeader>
              <CardTitle>Adjust Real to Nominal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Indexation (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentEscalation}
                    onChange={e => updateConstants('escalation', parseFloat(e.target.value) || 0)}
                    placeholder="Enter escalation rate"
                    className={getValueStyle(currentEscalation, DEFAULT_PRICE_SETTINGS.escalation)}
                  />
                  <p className="text-sm text-gray-500">Applied indexation to real pricing</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference Year</label>
                  <Select
                    value={String(currentReferenceYear)}
                    onValueChange={value => updateConstants('referenceYear', parseInt(value))}
                  >
                    <SelectTrigger className={getValueStyle(currentReferenceYear, DEFAULT_PRICE_SETTINGS.referenceYear)}>
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
          <Card>
            <CardHeader>
              <CardTitle>Price Curves for Analysis ($nominal)</CardTitle>
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