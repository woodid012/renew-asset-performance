// server/index.js - Production-ready server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app.vercel.app'] // Replace with your actual Vercel URL
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Portfolio Schema
const portfolioSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  portfolioId: { type: String, required: true },
  portfolioName: { type: String, required: true },
  version: { type: String, default: '2.0' },
  assets: { type: Object, default: {} },
  constants: { type: Object, default: {} },
  analysisMode: { type: String, default: 'simple' },
  activePortfolio: String,
  portfolioSource: String,
  priceSource: String,
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, {
  strict: false // Allow flexible schema
});

portfolioSchema.index({ userId: 1, portfolioId: 1 }, { unique: true });
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

// User Schema (simple - enhance for production)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hash this in production!
  portfolios: [{ type: String }],
  defaultPortfolio: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Get user portfolios
app.get('/api/portfolios/:userId', async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.params.userId })
      .select('portfolioId portfolioName lastUpdated')
      .sort({ lastUpdated: -1 });
    res.json(portfolios);
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific portfolio
app.get('/api/portfolio/:userId/:portfolioId', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({
      userId: req.params.userId,
      portfolioId: req.params.portfolioId
    });
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    res.json(portfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save/Update portfolio
app.post('/api/portfolio/:userId/:portfolioId', async (req, res) => {
  try {
    const { userId, portfolioId } = req.params;
    const portfolioData = req.body;
    
    const portfolio = await Portfolio.findOneAndUpdate(
      { userId, portfolioId },
      {
        ...portfolioData,
        userId,
        portfolioId,
        lastUpdated: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    res.json({ success: true, portfolio });
  } catch (error) {
    console.error('Error saving portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete portfolio
app.delete('/api/portfolio/:userId/:portfolioId', async (req, res) => {
  try {
    await Portfolio.findOneAndDelete({
      userId: req.params.userId,
      portfolioId: req.params.portfolioId
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// User authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ 
      success: true, 
      user: { 
        username: user.username, 
        portfolios: user.portfolios,
        defaultPortfolio: user.defaultPortfolio
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.json({ success: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// Export for Vercel
module.exports = app;