import { MongoClient } from 'mongodb';

// Your MongoDB connection string
const MONGODB_URI = 'mongodb+srv://ProjectHalo:5apsFwxTlqN8WHQR@cluster0.quuwlhb.mongodb.net/energy_contracts?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'energy_contracts';

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      console.log('✅ Connected to MongoDB directly');
    }
    return this.db;
  }

  async getPortfolios(userId = null) {
    const db = await this.connect();
    const query = userId ? { userId } : {};
    const portfolios = await db.collection('portfolios').find(query).toArray();
    return portfolios;
  }

  async getPortfolio(portfolioId) {
    const db = await this.connect();
    const portfolio = await db.collection('portfolios').findOne({ _id: portfolioId });
    
    if (portfolio) {
      // Convert Map back to Object for React
      if (portfolio.assets instanceof Map) {
        portfolio.assets = Object.fromEntries(portfolio.assets);
      }
      if (portfolio.constants?.assetCosts instanceof Map) {
        portfolio.constants.assetCosts = Object.fromEntries(portfolio.constants.assetCosts);
      }
    }
    
    return portfolio;
  }

  async updatePortfolio(portfolioId, portfolioData) {
    const db = await this.connect();
    
    // Convert Objects to Map for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    if (portfolioData.constants?.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    portfolioData.updatedAt = new Date();
    
    const result = await db.collection('portfolios').updateOne(
      { _id: portfolioId },
      { $set: portfolioData }
    );
    
    return result;
  }

  async createPortfolio(portfolioData) {
    const db = await this.connect();
    
    // Convert Objects to Map for MongoDB
    if (portfolioData.assets) {
      portfolioData.assets = new Map(Object.entries(portfolioData.assets));
    }
    if (portfolioData.constants?.assetCosts) {
      portfolioData.constants.assetCosts = new Map(Object.entries(portfolioData.constants.assetCosts));
    }
    
    portfolioData.createdAt = new Date();
    portfolioData.updatedAt = new Date();
    
    const result = await db.collection('portfolios').insertOne(portfolioData);
    return { id: result.insertedId, ...portfolioData };
  }

  async getUsers() {
    const db = await this.connect();
    return await db.collection('users').find().toArray();
  }
}

export default new MongoDBService();