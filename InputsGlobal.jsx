// InputsGlobal.jsx
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload } from 'lucide-react';
import { useInputsData } from './InputsData';
import InputsChart from './InputsChart';  // Import the chart component

const AGGREGATION_OPTIONS = [
  { value: 'none', label: 'No Aggregation' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

const InputsGlobal = () => {
  const fileInputRef = useRef(null);
  const {
    constants,
    updateConstants,
    availableYears,
    importData,
    exportData
  } = useInputsData();

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await importData(file);
    } catch (error) {
      alert(error);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = () => {
    const exportResult = exportData();
    if (!exportResult) return;

    const { content, filename } = exportResult;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Analysis Period Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analysis Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Start Year</label>
              <Select 
                value={String(constants.analysisStartYear ?? '')}
                onValueChange={value => updateConstants('analysisStartYear', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears
                    .filter(year => !constants.analysisEndYear || year <= constants.analysisEndYear)
                    .map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
            <label className="text-sm font-medium">End Year</label>
              <Select 
                value={String(constants.analysisEndYear ?? constants.analysisEndYear)}
                onValueChange={value => updateConstants('analysisEndYear', parseInt(value))}
              >

                <SelectTrigger>
                  <SelectValue placeholder="Select end year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears
                    .filter(year => !constants.analysisStartYear || year >= constants.analysisStartYear)
                    .map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Aggregation Level</label>
              <Select
                value={constants.aggregationLevel ?? 'yearly'}
                onValueChange={value => updateConstants('aggregationLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aggregation" />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
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
                    <Download className="w-4 h-4 mr-2" />Export Time Series CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />Import Time Series CSV
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
                      {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">Base year for real price calculations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Component */}
          <InputsChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default InputsGlobal;