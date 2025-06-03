// src/contexts/ScenarioContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const ScenarioContext = createContext();

export function useScenarios() {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error('useScenarios must be used within a ScenarioProvider');
  }
  return context;
}

export function ScenarioProvider({ children }) {
  const [scenarios, setScenarios] = useState([
    {
      id: 'base',
      name: 'Base',
      description: 'Current portfolio inputs',
      values: {}
    }
  ]);
  
  const [activeScenario, setActiveScenario] = useState('base');

  // Create new scenario
  const createScenario = useCallback((name, description = '') => {
    const newScenario = {
      id: `scenario_${Date.now()}`,
      name: name.trim(),
      description: description || `Alternative scenario: ${name.trim()}`,
      values: {}
    };

    setScenarios(prev => [...prev, newScenario]);
    return newScenario.id;
  }, []);

  // Delete scenario
  const deleteScenario = useCallback((scenarioId) => {
    if (scenarioId === 'base') return false;
    
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    
    // If we're deleting the active scenario, switch to base
    if (activeScenario === scenarioId) {
      setActiveScenario('base');
    }
    
    return true;
  }, [activeScenario]);

  // Update scenario value
  const updateScenarioValue = useCallback((scenarioId, parameterKey, value) => {
    setScenarios(prev => prev.map(scenario => {
      if (scenario.id === scenarioId) {
        return {
          ...scenario,
          values: {
            ...scenario.values,
            [parameterKey]: value
          }
        };
      }
      return scenario;
    }));
  }, []);

  // Get scenario by ID
  const getScenario = useCallback((scenarioId) => {
    return scenarios.find(s => s.id === scenarioId);
  }, [scenarios]);

  // Get active scenario
  const getActiveScenario = useCallback(() => {
    return scenarios.find(s => s.id === activeScenario);
  }, [scenarios, activeScenario]);

  // Check if scenario has any modifications
  const hasModifications = useCallback((scenarioId) => {
    const scenario = getScenario(scenarioId);
    return scenario && Object.keys(scenario.values).length > 0;
  }, [getScenario]);

  const value = {
    scenarios,
    setScenarios,
    activeScenario,
    setActiveScenario,
    createScenario,
    deleteScenario,
    updateScenarioValue,
    getScenario,
    getActiveScenario,
    hasModifications
  };

  return (
    <ScenarioContext.Provider value={value}>
      {children}
    </ScenarioContext.Provider>
  );
}

export default ScenarioProvider;