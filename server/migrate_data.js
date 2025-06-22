// server/migrate-portfolios.js - Import existing JSON data to MongoDB
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Portfolio Schema (same as server)
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
}, { strict: false });

portfolioSchema.index({ userId: 1, portfolioId: 1 }, { unique: true });
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  portfolios: [{ type: String }],
  defaultPortfolio: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Your existing user data
const USERS = {
  'ZEBRE': {
    password: '**',
    portfolioFile: 'zebre_2025-01-13.json',
    portfolioId: 'zebre',
    portfolioName: 'ZEBRE'
  },
  'AULA': {
    password: '**',
    portfolioFile: 'aula_2025-01-13.json',
    portfolioId: 'aula',
    portfolioName: 'Aula'
  },
  'ACCIONA': {
    password: '**',
    portfolioFile: 'acciona_merchant_2025-01-13.json',
    portfolioId: 'acciona',
    portfolioName: 'Acciona Merchant'
  }
};

async function migrateData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n👤 Creating users...');
    
    for (const [username, userData] of Object.entries(USERS)) {
      try {
        // Create or update user
        await User.findOneAndUpdate(
          { username },
          {
            username,
            password: userData.password,
            portfolios: [userData.portfolioId],
            defaultPortfolio: userData.portfolioId
          },
          { upsert: true, new: true }
        );
        console.log(`✅ User created/updated: ${username}`);

        // Load and migrate portfolio data
        const portfolioPath = path.join(__dirname, '../public', userData.portfolioFile);
        
        if (fs.existsSync(portfolioPath)) {
          console.log(`📁 Loading portfolio file: ${userData.portfolioFile}`);
          
          const portfolioData = JSON.parse(fs.readFileSync(portfolioPath, 'utf8'));
          
          // Save portfolio to MongoDB
          await Portfolio.findOneAndUpdate(
            { 
              userId: username,
              portfolioId: userData.portfolioId 
            },
            {
              userId: username,
              portfolioId: userData.portfolioId,
              portfolioName: userData.portfolioName,
              ...portfolioData,
              lastUpdated: new Date(),
              createdAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          console.log(`✅ Portfolio migrated: ${userData.portfolioName}`);
          console.log(`   📊 Assets: ${Object.keys(portfolioData.assets || {}).length}`);
          console.log(`   💰 Constants: ${Object.keys(portfolioData.constants || {}).length}`);
        } else {
          console.log(`⚠️  Portfolio file not found: ${portfolioPath}`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating ${username}:`, error.message);
      }
    }

    console.log('\n🎉 Migration completed!');
    
    // Verify the migration
    console.log('\n🔍 Verification:');
    const users = await User.find();
    const portfolios = await Portfolio.find();
    
    console.log(`👤 Users in database: ${users.length}`);
    console.log(`📁 Portfolios in database: ${portfolios.length}`);
    
    for (const portfolio of portfolios) {
      console.log(`   📊 ${portfolio.userId}: ${portfolio.portfolioName} (${Object.keys(portfolio.assets || {}).length} assets)`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

// Run migration
console.log('🚀 Starting portfolio migration...');
console.log('📂 Looking for JSON files in: ../public/');
migrateData();