// EarInputs.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { validateTimePeriods } from './useEarAnalysis';

// Component for parameter input fields
const ParameterInput = ({ label, value, onChange, min = 0, error }) => (
  <div>
    <label className="text-sm text-gray-500 block">
      {label}
    </label>
    <Input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className={`h-8 w-24 ${error ? 'border-red-500' : ''}`}
    />
  </div>
);

// TimePeriod Parameters Component
const TimePeriodParameters = ({ 
  period, 
  onUpdate, 
  onRemove, 
  canRemove,
  error
}) => (
  <div className={`flex items-start gap-4 p-3 rounded ${error ? 'bg-red-50' : 'bg-gray-50'}`}>
    <div className="flex gap-4">
      <div>
        <label className="text-sm text-gray-500 block">Years</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={period.startYear}
            onChange={(e) => onUpdate({ ...period, startYear: parseInt(e.target.value) || 0 })}
            className={`h-8 w-20 ${error ? 'border-red-500' : ''}`}
          />
          <span>-</span>
          <Input
            type="number"
            value={period.endYear}
            onChange={(e) => onUpdate({ ...period, endYear: parseInt(e.target.value) || 0 })}
            className={`h-8 w-20 ${error ? 'border-red-500' : ''}`}
          />
        </div>
      </div>
      <ParameterInput
        label="Volume Sensitivity (±%)"
        value={period.volumeVariation}
        onChange={(value) => onUpdate({ ...period, volumeVariation: value })}
      />
      <ParameterInput
        label="Black Price Sensitivity (±%)"
        value={period.blackPriceVariation}
        onChange={(value) => onUpdate({ ...period, blackPriceVariation: value })}
      />
      <ParameterInput
        label="Green Price Sensitivity (±%)"
        value={period.greenPriceVariation}
        onChange={(value) => onUpdate({ ...period, greenPriceVariation: value })}
      />
    </div>
    {canRemove && (
      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 p-1"
        aria-label="Remove time period"
      >
        ✕
      </button>
    )}
  </div>
);

// Main EarInputs Component
const EarInputs = ({ constants, updateConstants, onTimePeriodsChange }) => {
  const [mode, setMode] = useState('simple');
  const [validationError, setValidationError] = useState(null);
  const [timePeriods, setTimePeriods] = useState(() => {
    const midYear = Math.floor((constants.analysisEndYear - constants.analysisStartYear) / 2) + constants.analysisStartYear;
    return [
      {
        startYear: constants.analysisStartYear,
        endYear: midYear,
        volumeVariation: constants.volumeVariation,
        blackPriceVariation: constants.blackPriceVariation,
        greenPriceVariation: constants.greenPriceVariation,
      },
      {
        startYear: midYear + 1,
        endYear: constants.analysisEndYear,
        volumeVariation: constants.volumeVariation,
        blackPriceVariation: constants.blackPriceVariation,
        greenPriceVariation: constants.greenPriceVariation,
      }
    ];
  });

  useEffect(() => {
    if (mode === 'complex') {
      const validation = validateTimePeriods(
        timePeriods, 
        constants.analysisStartYear, 
        constants.analysisEndYear
      );
      
      setValidationError(validation.error);
      
      if (validation.valid) {
        onTimePeriodsChange(timePeriods);
      } else {
        onTimePeriodsChange(null);
      }
    } else {
      setValidationError(null);
      onTimePeriodsChange(null);
    }
  }, [mode, timePeriods, constants.analysisStartYear, constants.analysisEndYear, onTimePeriodsChange]);

  const handleAddPeriod = () => {
    if (timePeriods.length >= 5) return;
    
    const lastPeriod = timePeriods[timePeriods.length - 1];
    const newEndYear = Math.min(
      lastPeriod.endYear + Math.floor((constants.analysisEndYear - lastPeriod.endYear) / 2),
      constants.analysisEndYear
    );
    
    setTimePeriods([
      ...timePeriods,
      {
        startYear: lastPeriod.endYear + 1,
        endYear: newEndYear,
        volumeVariation: constants.volumeVariation,
        blackPriceVariation: constants.blackPriceVariation,
        greenPriceVariation: constants.greenPriceVariation,
      }
    ]);
  };

  const handleRemovePeriod = (index) => {
    if (timePeriods.length <= 1) return;
    setTimePeriods(timePeriods.filter((_, i) => i !== index));
  };

  const handleUpdatePeriod = (index, updatedPeriod) => {
    const newPeriods = [...timePeriods];
    newPeriods[index] = updatedPeriod;
    setTimePeriods(newPeriods);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Analysis Input Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-500">Mode:</label>
            <select
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="simple">Simple</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {mode === 'simple' ? (
            <div className="flex justify-between items-start gap-6">
              <div className="flex gap-6">
                <ParameterInput
                  label="Volume Sensitivity (±%)"
                  value={constants.volumeVariation}
                  onChange={(value) => updateConstants('volumeVariation', value)}
                />
                <ParameterInput
                  label="Black Price Sensitivity (±%)"
                  value={constants.blackPriceVariation}
                  onChange={(value) => updateConstants('blackPriceVariation', value)}
                />
                <ParameterInput
                  label="Green Price Sensitivity (±%)"
                  value={constants.greenPriceVariation}
                  onChange={(value) => updateConstants('greenPriceVariation', value)}
                />
              </div>
              <ul className="text-xs space-y-1 text-gray-600 min-w-64">
                <li>• Merchant revenue affected by both volume and price risks</li>
                <li>• Green and black prices vary independently</li>
                <li>• PPA revenue affected by volume risk only</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {timePeriods.map((period, index) => (
                <TimePeriodParameters
                  key={index}
                  period={period}
                  onUpdate={(updatedPeriod) => handleUpdatePeriod(index, updatedPeriod)}
                  onRemove={() => handleRemovePeriod(index)}
                  canRemove={timePeriods.length > 1}
                  error={validationError}
                />
              ))}
              {timePeriods.length < 5 && (
                <button
                  onClick={handleAddPeriod}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  + Add Time Period
                </button>
              )}
              {validationError && (
                <div className="text-sm text-red-500 mt-2">
                  {validationError}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EarInputs;