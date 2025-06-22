// server/cleanup-users.js - Fix user collection issues
const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 Existing collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Drop the problematic users collection if it exists
    try {
      await mongoose.connection.db.collection('users').drop();
      console.log('\n🗑️ Dropped existing users collection');
    } catch (error) {
      console.log('\n💡 No existing users collection to drop (this is fine)');
    }

    // Create clean user schema without email field
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      portfolios: [{ type: String }],
      defaultPortfolio: String,
      createdAt: { type: Date, default: Date.now }
    });

    const User = mongoose.model('User', userSchema);

    // Your users data
    const USERS = {
      'ZEBRE': {
        password: '**',
        portfolioId: 'zebre',
        portfolioName: 'ZEBRE'
      },
      'AULA': {
        password: '**',
        portfolioId: 'aula',
        portfolioName: 'Aula'
      },
      'ACCIONA': {
        password: '**',
        portfolioId: 'acciona',
        portfolioName: 'Acciona Merchant'
      }
    };

    console.log('\n👤 Creating clean users...');
    
    for (const [username, userData] of Object.entries(USERS)) {
      try {
        const user = new User({
          username,
          password: userData.password,
          portfolios: [userData.portfolioId],
          defaultPortfolio: userData.portfolioId
        });
        
        await user.save();
        console.log(`✅ User created: ${username}`);
      } catch (error) {
        console.error(`❌ Error creating ${username}:`, error.message);
      }
    }

    // Also clean up duplicate portfolios
    const Portfolio = mongoose.model('Portfolio', new mongoose.Schema({}, { strict: false }));
    
    console.log('\n📁 Cleaning up portfolios...');
    
    // Remove portfolios with 0 assets (duplicates from migration)
    const emptyPortfolios = await Portfolio.find({
      $or: [
        { assets: {} },
        { 'assets': { $exists: false } }
      ]
    });
    
    console.log(`🗑️ Found ${emptyPortfolios.length} empty portfolios to remove`);
    
    for (const portfolio of emptyPortfolios) {
      await Portfolio.findByIdAndDelete(portfolio._id);
      console.log(`   Removed: ${portfolio.portfolioName} (${portfolio.userId})`);
    }

    // Verification
    console.log('\n🔍 Final verification:');
    const users = await User.find();
    const portfolios = await Portfolio.find();
    
    console.log(`👤 Users in database: ${users.length}`);
    users.forEach(user => console.log(`   - ${user.username}`));
    
    console.log(`📁 Portfolios in database: ${portfolios.length}`);
    portfolios.forEach(portfolio => {
      const assetCount = Object.keys(portfolio.assets || {}).length;
      console.log(`   📊 ${portfolio.userId}: ${portfolio.portfolioName} (${assetCount} assets)`);
    });

    console.log('\n🎉 Cleanup completed!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

console.log('🧹 Starting database cleanup...');
cleanupUsers();