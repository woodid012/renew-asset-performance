const mongoose = require('mongoose');

// Hard-code connection for debugging
const MONGODB_URI = 'mongodb+srv://ProjectHalo:5apsFwxTlqN8WHQR@cluster0.quuwlhb.mongodb.net/energy_contracts?retryWrites=true&w=majority&appName=Cluster0';

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Wait for connection to be established
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('🔍 Checking database contents...');
    
    // Wait a moment for connection to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections in database:', collections.map(c => c.name));
    
    // Check if our collections exist
    const collectionNames = collections.map(c => c.name);
    
    if (collectionNames.includes('users')) {
      const usersCollection = mongoose.connection.db.collection('users');
      const userCount = await usersCollection.countDocuments();
      console.log('👤 Users collection: Found', userCount, 'users');
      
      if (userCount > 0) {
        const users = await usersCollection.find().toArray();
        console.log('👤 Users:', users.map(u => ({ id: u._id, username: u.username })));
      }
    } else {
      console.log('❌ No users collection found');
    }
    
    if (collectionNames.includes('portfolios')) {
      const portfoliosCollection = mongoose.connection.db.collection('portfolios');
      const portfolioCount = await portfoliosCollection.countDocuments();
      console.log('📁 Portfolios collection: Found', portfolioCount, 'portfolios');
      
      if (portfolioCount > 0) {
        const portfolios = await portfoliosCollection.find().toArray();
        console.log('📁 Portfolios:', portfolios.map(p => ({ 
          id: p._id, 
          name: p.portfolioName,
          userId: p.userId 
        })));
      }
    } else {
      console.log('❌ No portfolios collection found');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    console.log('🔌 Closing connection...');
    await mongoose.connection.close();
  }
}

checkDatabase();