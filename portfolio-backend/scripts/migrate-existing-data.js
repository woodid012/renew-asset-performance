const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Define schemas (same as in your backend)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const portfolioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portfolioName: { type: String, required: true },
  assets: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  constants: mongoose.Schema.Types.Mixed,
  analysisMode: { type: String, default: 'simple' },
  activePortfolio: String,
  portfolioSource: { type: String, default: 'database' },
  priceSource: String,
  version: { type: String, default: '2.0' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

async function migrateExistingData() {
  try {
    console.log('Starting migration...');
    
    // Create default user
    let user = await User.findOne({ username: 'admin' });
    if (!user) {
      user = await User.create({
        username: 'admin',
        email: 'admin@portfolio.com'
      });
      console.log('Created default user:', user.username);
    }

    // Find all JSON files in your public directory
    const publicDir = '../public'; // Adjust this path to your React app's public folder
    
    if (!fs.existsSync(publicDir)) {
      console.log('Public directory not found. Please update the path in the script.');
      console.log('Current path:', path.resolve(publicDir));
      return;
    }

    const jsonFiles = fs.readdirSync(publicDir)
      .filter(file => file.endsWith('.json') && !file.includes('merchant'));

    console.log(`Found ${jsonFiles.length} portfolio files to migrate:`, jsonFiles);

    for (const file of jsonFiles) {
      const filePath = path.join(publicDir, file);
      const portfolioData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Skip if already migrated
      const existingPortfolio = await Portfolio.findOne({ 
        portfolioName: portfolioData.portfolioName || file.replace('.json', '')
      });

      if (existingPortfolio) {
        console.log(`Skipping ${file} - already migrated`);
        continue;
      }

      // Convert assets object to Map
      let assetsMap = new Map();
      if (portfolioData.assets) {
        Object.entries(portfolioData.assets).forEach(([key, value]) => {
          assetsMap.set(key, value);
        });
      }

      // Convert assetCosts to Map if it exists
      if (portfolioData.constants && portfolioData.constants.assetCosts) {
        const assetCostsMap = new Map();
        Object.entries(portfolioData.constants.assetCosts).forEach(([key, value]) => {
          assetCostsMap.set(key, value);
        });
        portfolioData.constants.assetCosts = assetCostsMap;
      }

      // Create portfolio document
      const portfolio = await Portfolio.create({
        userId: user._id,
        portfolioName: portfolioData.portfolioName || file.replace('.json', ''),
        assets: assetsMap,
        constants: portfolioData.constants || {},
        analysisMode: portfolioData.analysisMode || 'simple',
        activePortfolio: portfolioData.activePortfolio,
        priceSource: portfolioData.priceSource,
        version: portfolioData.version || '2.0'
      });

      console.log(`✅ Migrated: ${file} -> Portfolio ID: ${portfolio._id}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateExistingData();