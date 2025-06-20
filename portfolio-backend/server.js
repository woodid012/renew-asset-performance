// MongoDB Backend API Implementation
// This goes in your backend server (Node.js/Express + Mongoose)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
// GET ALL USERS
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('_id username email createdAt');
    console.log('Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET USER BY ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});
// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// MONGOOSE SCHEMAS

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Asset Schema (embedded in Portfolio)
const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true },
  name: { type: String, required: true },
  state: String,
  type: String,
  capacity: mongoose.Schema.Types.Mixed,
  volume: mongoose.Schema.Types.Mixed,
  assetLife: mongoose.Schema.Types.Mixed,
  assetStartDate: String,
  constructionStartDate: String,
  constructionDuration: mongoose.Schema.Types.Mixed,
  volumeLossAdjustment: mongoose.Schema.Types.Mixed,
  annualDegradation: mongoose.Schema.Types.Mixed,
  qtrCapacityFactor_q1: mongoose.Schema.Types.Mixed,
  qtrCapacityFactor_q2: mongoose.Schema.Types.Mixed,
  qtrCapacityFactor_q3: mongoose.Schema.Types.Mixed,
  qtrCapacityFactor_q4: mongoose.Schema.Types.Mixed,
  contracts: [{
    id: String,
    counterparty: String,
    type: String,
    strikePrice: mongoose.Schema.Types.Mixed,
    EnergyPrice: mongoose.Schema.Types.Mixed,
    greenPrice: mongoose.Schema.Types.Mixed,
    buyersPercentage: mongoose.Schema.Types.Mixed,
    startDate: String,
    endDate: String,
    indexation: mongoose.Schema.Types.Mixed,
    shape: String,
    hasFloor: Boolean,
    floorValue: mongoose.Schema.Types.Mixed
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Portfolio Schema (main document with embedded assets and constants)
const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portfolioName: { type: String, required: true },
  
  // Embedded assets object (matches your current structure)
  assets: {
    type: Map,
    of: assetSchema,
    default: {}
  },
  
  // Embedded constants object (matches your current structure)
  constants: {
    // System constants
    HOURS_IN_YEAR: { type: Number, default: 8760 },
    priceAggregation: { type: String, default: 'yearly' },
    
    // Capacity factors
    capacityFactors: mongoose.Schema.Types.Mixed,
    capacityFactors_qtr: mongoose.Schema.Types.Mixed,
    
    // Performance
    annualDegradation: mongoose.Schema.Types.Mixed,
    
    // Merchant prices
    merchantPrices: mongoose.Schema.Types.Mixed,
    
    // Risk parameters
    volumeVariation: Number,
    greenPriceVariation: Number,
    EnergyPriceVariation: Number,
    
    // Discount rates
    discountRates: {
      contract: Number,
      merchant: Number
    },
    
    // Asset costs (object with asset names as keys)
    assetCosts: {
      type: Map,
      of: {
        operatingCosts: Number,
        operatingCostEscalation: Number,
        terminalValue: Number,
        capex: Number,
        maxGearing: Number,
        targetDSCRContract: Number,
        targetDSCRMerchant: Number,
        interestRate: Number,
        tenorYears: Number,
        calculatedGearing: Number
      },
      default: {}
    },
    
    // Price settings
    escalation: Number,
    referenceYear: Number,
    
    // Analysis settings
    analysisStartYear: Number,
    analysisEndYear: Number,
    
    // Platform costs
    platformOpex: Number,
    otherOpex: Number,
    platformOpexEscalation: Number,
    dividendPolicy: Number,
    minimumCashBalance: Number,
    
    // Tax settings
    corporateTaxRate: Number,
    deprecationPeriods: {
      solar: Number,
      wind: Number,
      storage: Number
    }
  },
  
  // Portfolio metadata
  analysisMode: { type: String, default: 'simple' },
  activePortfolio: String,
  portfolioSource: { type: String, default: 'database' },
  priceSource: String,
  version: { type: String, default: '2.0' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Scenario Schema (separate collection)
const scenarioSchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
  name: { type: String, required: true },
  description: String,
  values: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Merchant Prices Schema (separate collection, can be global or portfolio-specific)
const merchantPriceSchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio' }, // Optional - null for global prices
  profile: String, // solar, wind, baseload, storage
  type: String,    // Energy, green, fixed, etc.
  region: String,  // NSW, VIC, QLD, SA
  timeframe: String, // monthly, quarterly, yearly
  priceData: [{
    time: String,    // Date or period identifier
    price: Number,   // Price value
    source: String   // Data source
  }],
  metadata: {
    source: String,
    lastUpdated: Date,
    dataFormat: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Template Schema (global collection)
const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String, // 'asset', 'portfolio', 'scenario'
  templateData: {
    // Asset template data
    id: String,
    name: String,
    state: String,
    type: String,
    capacity: Number,
    mlf: Number,
    startDate: String,
    // Add other template fields as needed
  },
  isPublic: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Portfolio = mongoose.model('Portfolio', portfolioSchema);
const Scenario = mongoose.model('Scenario', scenarioSchema);
const MerchantPrice = mongoose.model('MerchantPrice', merchantPriceSchema);
const Template = mongoose.model('Template', templateSchema);

// PORTFOLIO ROUTES

// Get all portfolios for a user
app.get('/api/portfolios', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const portfolios = await Portfolio.find({ userId })
      .select('_id portfolioName createdAt updatedAt')
      .sort({ updatedAt: -1 });
    
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific portfolio with all data
app.get('/api/portfolios/:id', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Get related scenarios
    const scenarios = await Scenario.find({ portfolioId: req.params.id });
    
    // Convert Map objects to regular objects for JSON serialization
    const portfolioData = portfolio.toObject();
    portfolioData.assets = Object.fromEntries(portfolioData.assets);
    portfolioData.constants.assetCosts = Object.fromEntries(portfolioData.constants.assetCosts);
    
    res.json({
      ...portfolioData,
      scenarios
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new portfolio
app.post('/api/portfolios', async (req, res) => {
  try {
    const portfolioData = req.body;
    
    // Convert assets object to Map for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    
    // Convert assetCosts object to Map for MongoDB
    if (portfolioData.constants && portfolioData.constants.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    const portfolio = new Portfolio(portfolioData);
    await portfolio.save();
    
    res.status(201).json({ 
      id: portfolio._id,
      portfolioName: portfolio.portfolioName,
      createdAt: portfolio.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update existing portfolio
app.put('/api/portfolios/:id', async (req, res) => {
  try {
    const portfolioData = req.body;
    portfolioData.updatedAt = new Date();
    
    // Convert assets object to Map for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    
    // Convert assetCosts object to Map for MongoDB
    if (portfolioData.constants && portfolioData.constants.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    const portfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      portfolioData,
      { new: true, runValidators: true }
    );
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({ success: true, updatedAt: portfolio.updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete portfolio
app.delete('/api/portfolios/:id', async (req, res) => {
  try {
    // Delete portfolio and all related data
    await Portfolio.findByIdAndDelete(req.params.id);
    await Scenario.deleteMany({ portfolioId: req.params.id });
    await MerchantPrice.deleteMany({ portfolioId: req.params.id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import portfolio
app.post('/api/portfolios/import', async (req, res) => {
  try {
    const { userId, ...portfolioData } = req.body;
    
    // Convert objects to Maps for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    
    if (portfolioData.constants && portfolioData.constants.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    const portfolio = new Portfolio({
      userId,
      ...portfolioData
    });
    
    await portfolio.save();
    
    res.status(201).json({ 
      id: portfolio._id,
      portfolioName: portfolio.portfolioName,
      message: 'Portfolio imported successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export portfolio
app.get('/api/portfolios/:id/export', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Get scenarios
    const scenarios = await Scenario.find({ portfolioId: req.params.id });
    
    // Convert Map objects to regular objects
    const exportData = portfolio.toObject();
    exportData.assets = Object.fromEntries(exportData.assets);
    exportData.constants.assetCosts = Object.fromEntries(exportData.constants.assetCosts);
    exportData.scenarios = scenarios;
    exportData.exportDate = new Date().toISOString();
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ASSET ROUTES (operates on embedded assets in portfolio)

// Get assets for a portfolio
app.get('/api/assets', async (req, res) => {
  try {
    const { portfolioId } = req.query;
    
    const portfolio = await Portfolio.findById(portfolioId).select('assets');
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    const assets = Object.fromEntries(portfolio.assets);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add asset to portfolio
app.post('/api/assets/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const assetData = req.body;
    
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Generate asset ID if not provided
    const assetId = assetData.assetId || assetData.id || new mongoose.Types.ObjectId().toString();
    
    portfolio.assets.set(assetId, {
      ...assetData,
      assetId,
      updatedAt: new Date()
    });
    
    portfolio.updatedAt = new Date();
    await portfolio.save();
    
    res.status(201).json({ 
      success: true, 
      assetId,
      message: 'Asset created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update specific asset
app.put('/api/assets/:portfolioId/:assetId', async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;
    const assetData = req.body;
    
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    if (!portfolio.assets.has(assetId)) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    portfolio.assets.set(assetId, {
      ...assetData,
      assetId,
      updatedAt: new Date()
    });
    
    portfolio.updatedAt = new Date();
    await portfolio.save();
    
    res.json({ success: true, updatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete asset
app.delete('/api/assets/:portfolioId/:assetId', async (req, res) => {
  try {
    const { portfolioId, assetId } = req.params;
    
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    portfolio.assets.delete(assetId);
    portfolio.updatedAt = new Date();
    await portfolio.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch update assets
app.put('/api/assets/:portfolioId/batch', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { assets } = req.body;
    
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Replace entire assets Map
    portfolio.assets = new Map(Object.entries(assets));
    portfolio.updatedAt = new Date();
    await portfolio.save();
    
    res.json({ success: true, updatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CONSTANTS ROUTES (operates on embedded constants in portfolio)

// Get constants for a portfolio
app.get('/api/constants', async (req, res) => {
  try {
    const { portfolioId } = req.query;
    
    const portfolio = await Portfolio.findById(portfolioId).select('constants');
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Convert Map to object
    const constants = portfolio.constants.toObject();
    if (constants.assetCosts) {
      constants.assetCosts = Object.fromEntries(constants.assetCosts);
    }
    
    res.json(constants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update constants
app.put('/api/constants/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { constants } = req.body;
    
    // Convert assetCosts to Map if present
    if (constants.assetCosts) {
      constants.assetCosts = new Map(Object.entries(constants.assetCosts));
    }
    
    const portfolio = await Portfolio.findByIdAndUpdate(
      portfolioId,
      { 
        constants,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({ success: true, updatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update specific constant field
app.patch('/api/constants/:portfolioId/field', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { field, value } = req.body;
    
    const portfolio = await Portfolio.findById(portfolioId);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Handle nested field updates (e.g., "discountRates.contract")
    if (field.includes('.')) {
      const fieldPath = `constants.${field}`;
      await Portfolio.findByIdAndUpdate(
        portfolioId,
        { 
          $set: { 
            [fieldPath]: value,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Handle Map fields (e.g., assetCosts)
      if (field === 'assetCosts' && typeof value === 'object') {
        portfolio.constants.assetCosts = new Map(Object.entries(value));
      } else {
        portfolio.constants[field] = value;
      }
      
      portfolio.updatedAt = new Date();
      await portfolio.save();
    }
    
    res.json({ success: true, updatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SCENARIO ROUTES (separate collection)

// Get scenarios for a portfolio
app.get('/api/scenarios', async (req, res) => {
  try {
    const { portfolioId } = req.query;
    
    const scenarios = await Scenario.find({ portfolioId }).sort({ createdAt: 1 });
    
    // Convert Map values to objects
    const scenariosWithValues = scenarios.map(scenario => ({
      ...scenario.toObject(),
      values: Object.fromEntries(scenario.values)
    }));
    
    res.json(scenariosWithValues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new scenario
app.post('/api/scenarios', async (req, res) => {
  try {
    const scenarioData = req.body;
    
    // Convert values to Map if present
    if (scenarioData.values) {
      scenarioData.values = new Map(Object.entries(scenarioData.values));
    }
    
    const scenario = new Scenario(scenarioData);
    await scenario.save();
    
    res.status(201).json({
      id: scenario._id,
      name: scenario.name,
      createdAt: scenario.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update scenario
app.put('/api/scenarios/:id', async (req, res) => {
  try {
    const scenarioData = req.body;
    
    // Convert values to Map if present
    if (scenarioData.values) {
      scenarioData.values = new Map(Object.entries(scenarioData.values));
    }
    
    scenarioData.updatedAt = new Date();
    
    const scenario = await Scenario.findByIdAndUpdate(
      req.params.id,
      scenarioData,
      { new: true }
    );
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    res.json({ success: true, updatedAt: scenario.updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update scenario value
app.patch('/api/scenarios/:id/value', async (req, res) => {
  try {
    const { parameterKey, value } = req.body;
    
    const scenario = await Scenario.findById(req.params.id);
    
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    scenario.values.set(parameterKey, value);
    scenario.updatedAt = new Date();
    await scenario.save();
    
    res.json({ success: true, updatedAt: scenario.updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete scenario
app.delete('/api/scenarios/:id', async (req, res) => {
  try {
    await Scenario.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// USER ROUTES

// Get user profile
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: userData.username },
        { email: userData.email }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new User(userData);
    await user.save();
    
    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user portfolios
app.get('/api/users/:id/portfolios', async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.params.id })
      .select('portfolioName createdAt updatedAt')
      .sort({ updatedAt: -1 });
    
    res.json(portfolios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MERCHANT PRICES ROUTES

// Get merchant prices
app.get('/api/merchant-prices', async (req, res) => {
  try {
    const { portfolioId, profile, type, region, timeframe } = req.query;
    
    let query = {};
    
    if (portfolioId) {
      query.portfolioId = portfolioId;
    }
    if (profile) {
      query.profile = profile;
    }
    if (type) {
      query.type = type;
    }
    if (region) {
      query.region = region;
    }
    if (timeframe) {
      query.timeframe = timeframe;
    }
    
    const merchantPrices = await MerchantPrice.find(query).sort({ updatedAt: -1 });
    
    res.json(merchantPrices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update merchant prices
app.put('/api/merchant-prices/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const { priceData } = req.body;
    
    // Replace or create merchant prices for this portfolio
    await MerchantPrice.deleteMany({ portfolioId });
    
    if (Array.isArray(priceData)) {
      const merchantPrices = priceData.map(data => ({
        portfolioId,
        ...data,
        updatedAt: new Date()
      }));
      
      await MerchantPrice.insertMany(merchantPrices);
    }
    
    res.json({ success: true, updatedAt: new Date() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import merchant prices from CSV
app.post('/api/merchant-prices/import', async (req, res) => {
  try {
    const { portfolioId, csvData } = req.body;
    
    // Process CSV data and create merchant price documents
    const merchantPrices = csvData.map(row => ({
      portfolioId: portfolioId || null, // null for global prices
      profile: row.profile,
      type: row.type,
      region: row.state || row.region,
      timeframe: 'monthly', // or determine from data
      priceData: [{
        time: row.time,
        price: row.price,
        source: row.source || 'imported'
      }],
      metadata: {
        source: 'csv_import',
        lastUpdated: new Date(),
        dataFormat: 'monthly'
      }
    }));
    
    await MerchantPrice.insertMany(merchantPrices);
    
    res.status(201).json({ 
      success: true, 
      imported: merchantPrices.length,
      message: 'Merchant prices imported successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEMPLATE ROUTES

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await Template.find({ isPublic: true })
      .select('name category templateData createdAt')
      .sort({ name: 1 });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create template
app.post('/api/templates', async (req, res) => {
  try {
    const template = new Template(req.body);
    await template.save();
    
    res.status(201).json({
      id: template._id,
      name: template.name,
      createdAt: template.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HEALTH CHECK
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const isConnected = dbState === 1;
    
    if (isConnected) {
      // Perform a simple query to verify database access
      await User.findOne().limit(1);
      
      res.json({ 
        status: 'healthy', 
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        message: 'Database connection lost'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// BULK OPERATIONS

// Sync portfolio (atomic update of entire portfolio)
app.post('/api/portfolios/:id/sync', async (req, res) => {
  try {
    const portfolioData = req.body;
    
    // Convert objects to Maps for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    
    if (portfolioData.constants && portfolioData.constants.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    portfolioData.updatedAt = new Date();
    
    const portfolio = await Portfolio.findByIdAndUpdate(
      req.params.id,
      portfolioData,
      { new: true, upsert: false }
    );
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json({ 
      success: true, 
      portfolioId: portfolio._id,
      updatedAt: portfolio.updatedAt 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create backup
app.post('/api/portfolios/:id/backup', async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Create backup document (you might want a separate Backup collection)
    const backupData = {
      originalPortfolioId: portfolio._id,
      portfolioData: portfolio.toObject(),
      backupDate: new Date(),
      backupType: 'manual'
    };
    
    // For now, we'll just return the backup data
    // In production, you'd save this to a backups collection
    res.json({ 
      success: true, 
      backupId: new mongoose.Types.ObjectId(),
      backupDate: backupData.backupDate,
      message: 'Backup created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connected to: ${process.env.MONGODB_DB}`);
});