const router = require('express').Router();
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../database/mongodb');
const { userValidation } = require('../validation/userValidation');

// GET /v1/users - Alle User abrufen mit Filterung, Sortierung, Pagination
router.get('', async (req, res, next) => {
  try {
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // Query-Builder für Filterung
    const query = {};
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    if (req.query.blocked !== undefined) {
      query.blocked = req.query.blocked === 'true';
    }
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: 'i' }; // Case-insensitive
    }
    
    // Sortierung
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Daten abrufen
    const [users, total] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/users/:id - Einzelnen User abrufen
router.get('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// POST /v1/users - Neuen User erstellen
router.post('', async (req, res, next) => {
  try {
    // Validierung
    const validation = userValidation(req.body, 'create');
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.status = 400;
      error.details = validation.errors;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // Email-Eindeutigkeit prüfen
    const existing = await collection.findOne({ email: validation.data.email });
    if (existing) {
      const error = new Error('Email already exists');
      error.status = 409;
      throw error;
    }
    
    // User erstellen
    const newUser = {
      ...validation.data,
      blocked: false, // Default
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(newUser);
    const createdUser = await collection.findOne({ _id: result.insertedId });
    
    res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    next(error);
  }
});

// PATCH /v1/users/:id - User aktualisieren
router.patch('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      throw error;
    }
    
    // Validierung
    const validation = userValidation(req.body, 'update');
    if (!validation.isValid) {
      const error = new Error('Validation failed');
      error.status = 400;
      error.details = validation.errors;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // User existiert?
    const existing = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!existing) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    // Email-Änderung: Eindeutigkeit prüfen
    if (validation.data.email && validation.data.email !== existing.email) {
      const emailExists = await collection.findOne({ email: validation.data.email });
      if (emailExists) {
        const error = new Error('Email already exists');
        error.status = 409;
        throw error;
      }
    }
    
    // Update
    const updateData = {
      ...validation.data,
      updatedAt: new Date()
    };
    
    await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    
    const updatedUser = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// PATCH /v1/users/:id/block - User blockieren
router.patch('/:id/block', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { blocked: true, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    const updatedUser = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// PATCH /v1/users/:id/unblock - User freischalten
router.patch('/:id/unblock', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { blocked: false, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    const updatedUser = await collection.findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
