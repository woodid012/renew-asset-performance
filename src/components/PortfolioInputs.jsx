import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Papa from 'papaparse';
import { Download, Upload } from 'lucide-react';

const PortfolioInputs = () => {
  const { constants, updateConstants } = usePortfolio();
  const fileInputRef = useRef(null);

  const handleCapacityFactorChange = (technology, state, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0 && newValue <= 1) {
      updateConstants(`capacityFactors.${technology}.${state}`, newValue);
    }
  };

  const handleMerchantPriceChange = (profile, type, region, year, value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue >= 0) {
      updateConstants(`merchantPrices.${profile}.${type}.${region}.${year}`, newValue);
    }
  };

  const states = ['NSW', 'QLD', 'SA', 'VIC'];
  const years = Array.from(
    { length: constants.analysisEndYear - constants.analysisStartYear + 1 },
    (_, i) => constants.analysisStartYear + i
  );

  const getMerchantPrice = (profile, type, state, year) => {
    try {
      return constants.merchantPrices[profile]?.[type]?.[state]?.[year] ?? '';
    } catch {
      return '';
    }
  };

  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            const newMerchantPrices = { 
              solar: { black: {}, green: {} }, 
              wind: { black: {}, green: {} },
              baseload: { black: {}, green: {} }  // Added baseload
            };
            
            results.data.forEach(row => {
              if (!row.profile || !row.type || !row.state || !row.year || !row.price) return;
              
              const { profile, type, state, year, price } = row;
              if (!newMerchantPrices[profile]) newMerchantPrices[profile] = {};
              if (!newMerchantPrices[profile][type]) newMerchantPrices[profile][type] = {};
              if (!newMerchantPrices[profile][type][state]) newMerchantPrices[profile][type][state] = {};
              
              newMerchantPrices[profile][type][state][year] = parseFloat(price);
            });

            updateConstants('merchantPrices', newMerchantPrices);
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
    ['solar', 'wind', 'baseload'].forEach(profile => {  // Added baseload
      ['black', 'green'].forEach(type => {
        states.forEach(state => {
          years.forEach(year => {
            const price = getMerchantPrice(profile, type, state, year);
            if (price !== '') {
              rows.push({
                profile,
                type,
                state,
                year,
                price
              });
            }
          });
        });
      });
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merchant_prices.csv';
    link.click();
  };

  const MerchantPriceTable = ({ profile }) => {
    const isLoading = !constants.merchantPrices?.[profile]?.black || !constants.merchantPrices?.[profile]?.green;

    if (isLoading) {
      return <div className="space-y-8">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>;
    }

    return (
      <div className="space-y-8">
        {/* Black Energy Prices Table */}
        <div>
          <h3 className="font-medium text-lg mb-4">Black Energy Price ($/MWh)</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
              <div className="font-medium">Year</div>
              {years.map(year => (
                <div key={year} className="text-center font-medium">{year}</div>
              ))}
            </div>
            
            {states.map(state => (
              <div key={state} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
                <div className="font-medium">{state}</div>
                {years.map(year => (
                  <Input
                    key={`${state}-black-${year}`}
                    type="number"
                    min="0"
                    step="0.1"
                    value={getMerchantPrice(profile, 'black', state, year)}
                    onChange={(e) => handleMerchantPriceChange(profile, 'black', state, year, e.target.value)}
                    className="text-center"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Green Certificate Prices Table */}
        <div>
          <h3 className="font-medium text-lg mb-4">Green Certificate Price ($/MWh)</h3>
          <div className="grid gap-4">
            <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
              <div className="font-medium">Year</div>
              {years.map(year => (
                <div key={year} className="text-center font-medium">{year}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 items-center">
              <div className="font-medium">All</div>
              {years.map(year => (
                <Input
                  key={`all-green-${year}`}
                  type="number"
                  min="0" 
                  step="0.1"
                  value={getMerchantPrice(profile, 'green', 'NSW', year)}
                  onChange={(e) => handleMerchantPriceChange(profile, 'green', 'NSW', year, e.target.value)}
                  className="text-center"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
            <span>Merchant Prices</span>
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
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="solar" className="w-full">
            <TabsList className="mb-4">
              {Object.keys(constants.merchantPrices).map(profile => (
                <TabsTrigger key={profile} value={profile}>
                  {profile.charAt(0).toUpperCase() + profile.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.keys(constants.merchantPrices).map(profile => (
              <TabsContent key={profile} value={profile}>
                <MerchantPriceTable profile={profile} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioInputs;