const { MongoClient } = require('mongodb');

// Connection String (wie vorgegeben - funktioniert in Development, Credentials werden ignoriert)
// Für Production: MongoDB Auth aktivieren und echte Credentials verwenden
const uri = "mongodb://root:root@mongo-user:27017/userdb";

// Connection Options mit Pooling (Best Practice für MongoDB Node.js Driver)
const options = {
  maxPoolSize: 10, // Maximale Anzahl Connections im Pool (Standard: 100)
  minPoolSize: 2,  // Minimale Anzahl Connections (Standard: 0)
  maxIdleTimeMS: 30000, // Connection wird nach 30s Inaktivität geschlossen
  serverSelectionTimeoutMS: 5000, // Timeout für Server-Auswahl (Standard: 30000)
  socketTimeoutMS: 45000, // Timeout für Socket-Operationen (Standard: 0 = kein Timeout)
};

let client = null;
let db = null;

// Singleton Pattern: Eine Connection für die gesamte App (Best Practice)
// Verhindert Connection-Leaks und verbessert Performance
async function connectToMongoDB() {
  // Prüfe ob Connection bereits existiert und verbunden ist
  if (client && client.topology && client.topology.isConnected()) {
    return { client, db };
  }

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db('userdb');
    
    // Index-Erstellung beim ersten Connect (nur einmal)
    await createIndexes(db);
    
    console.log('MongoDB connected successfully');
    return { client, db };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Index-Erstellung für Performance
async function createIndexes(db) {
  try {
    const usersCollection = db.collection('users');
    
    // Unique Index auf email für Duplikat-Prävention
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    
    // Index auf häufig gefilterte Felder
    await usersCollection.createIndex({ active: 1 });
    await usersCollection.createIndex({ blocked: 1 });
    await usersCollection.createIndex({ location: 1 });
    
    // Compound Index für häufige Queries
    await usersCollection.createIndex({ active: 1, blocked: 1 });
    
    console.log('MongoDB indexes created successfully');
  } catch (error) {
    // Index könnte bereits existieren, das ist OK
    if (error.code !== 85) { // 85 = IndexOptionsConflict
      console.error('Error creating indexes:', error);
    }
  }
}

// Graceful Shutdown
async function closeConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Process-Events für Cleanup
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = { connectToMongoDB, closeConnection };
