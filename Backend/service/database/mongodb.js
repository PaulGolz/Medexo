const { MongoClient } = require('mongodb');

// Connection String (ohne Auth, da MongoDB im Development Modus ohne Authentifizierung läuft)
// Für Production MongoDB Auth aktivieren und echte credentials verwenden
const uri = "mongodb://mongo-user:27017/userdb";

// best practice mit pooling
const options = {
  maxPoolSize: 10,
  minPoolSize: 2, 
  maxIdleTimeMS: 30000, // nach 30s inactive close
  serverSelectionTimeoutMS: 5000, // server auswahl timeout
  socketTimeoutMS: 45000, // timeout socket operationen
};

let client = null;
let db = null;

// eine connection für die gesamte app
// verhindert connection leaks und verbessert performance
async function connectToMongoDB() {
  // connection existiert und verbunden?
  if (client && client.topology && client.topology.isConnected()) {
    return { client, db };
  }

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db('userdb');
    
    // nur einmal index erstellen
    await createIndexes(db);
    
    console.log('MongoDB connected successfully');
    return { client, db };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// index für performance
async function createIndexes(db) {
  try {
    const usersCollection = db.collection('users');
    
    // unique index auf email 
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    
    // index auf häufige queries
    await usersCollection.createIndex({ active: 1 });
    await usersCollection.createIndex({ blocked: 1 });
    await usersCollection.createIndex({ location: 1 });
    
    // compound index
    await usersCollection.createIndex({ active: 1, blocked: 1 });
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    // egal wenn index bereits existiert
    if (error.code !== 85) {
      console.error('Error creating indexes:', error);
    }
  }
}

// easy shutdown
async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// event cleanup
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = { connectToMongoDB, closeConnection };
