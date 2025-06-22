// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './globals.css'
import { PortfolioProvider } from './contexts/PortfolioContext'
import { ScenarioProvider } from './contexts/ScenarioContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PortfolioProvider>
      <ScenarioProvider>
        <App />
      </ScenarioProvider>
    </PortfolioProvider>
  </React.StrictMode>,
)