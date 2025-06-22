// server/test.js - Simple MongoDB test
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🧪 Testing MongoDB Connection...');
console.log('URI:', MONGODB_URI.replace(/:[^@]*@/, ':****@')); // Hide password

async function testConnection() {
  try {
    console.log('\n1️⃣ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    // Test schema
    const TestSchema = new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    });
    
    const TestModel = mongoose.model('ConnectionTest', TestSchema);
    
    console.log('\n2️⃣ Testing write operation...');
    const testDoc = new TestModel({
      message: 'Test from portfolio server'
    });
    
    const saved = await testDoc.save();
    console.log('✅ Write successful! ID:', saved._id);
    
    console.log('\n3️⃣ Testing read operation...');
    const docs = await TestModel.find().limit(5).sort({ timestamp: -1 });
    console.log('✅ Read successful! Found', docs.length, 'documents');
    
    console.log('\n4️⃣ Testing portfolio-like structure...');
    const PortfolioSchema = new mongoose.Schema({
      userId: String,
      portfolioId: String,
      portfolioName: String,
      assets: Object,
      constants: Object,
      lastUpdated: { type: Date, default: Date.now }
    });
    
    const Portfolio = mongoose.model('PortfolioTest', PortfolioSchema);
    
    const testPortfolio = new Portfolio({
      userId: 'test-user',
      portfolioId: 'test-portfolio',
      portfolioName: 'Test Portfolio',
      assets: {
        'asset1': {
          id: '1',
          name: 'Test Solar Farm',
          type: 'solar',
          capacity: 100,
          state: 'NSW'
        }
      },
      constants: {
        escalation: 2.5,
        referenceYear: 2024
      }
    });
    
    const savedPortfolio = await testPortfolio.save();
    console.log('✅ Portfolio save successful! ID:', savedPortfolio._id);
    
    const foundPortfolios = await Portfolio.find({ userId: 'test-user' });
    console.log('✅ Portfolio read successful! Found', foundPortfolios.length, 'portfolios');
    
    console.log('\n🎉 All tests passed! MongoDB is ready for your portfolio app.');
    console.log('\n📋 Summary:');
    console.log('  ✅ Connection: Working');
    console.log('  ✅ Write: Working');
    console.log('  ✅ Read: Working');
    console.log('  ✅ Portfolio Operations: Working');
    console.log('  ✅ Database:', mongoose.connection.db.databaseName);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔍 Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

testConnection();