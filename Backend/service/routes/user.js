const router = require('express').Router();
const { ObjectId } = require('mongodb');
const { connectToMongoDB } = require('../database/mongodb');
const { userValidation } = require('../validation/userValidation');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Multer config für CSV upload
// memoryStorage: Datei im RAM verarbeitet (schneller für kleine Dateien)
// limits: verhindert Denial of Service durch z.B. zu große Dateien
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max um sicherzugehen
    files: 1 // eine datei auf einmal reicht
  },
  fileFilter: (req, file, cb) => {
    // nur csv format
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// GET /v1/users alle user mit filter, sort und pagination
router.get('', async (req, res, next) => {
  try {
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // Query builder für filter
    const query = {};
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    if (req.query.blocked !== undefined) {
      query.blocked = req.query.blocked === 'true';
    }
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: 'i' }; 
    }
    
    // sort
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };
    
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // daten
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

// GET /v1/users/:id ein user 
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

// POST /v1/users ein user
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

// PATCH /v1/users/:id ein user updaten
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
    
    // user existiert?
    const existing = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!existing) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    // Email Änderung duplicate check
    if (validation.data.email && validation.data.email !== existing.email) {
      const emailExists = await collection.findOne({ email: validation.data.email });
      if (emailExists) {
        const error = new Error('Email already exists');
        error.status = 409;
        throw error;
      }
    }
    
    // update
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

// PATCH /v1/users/:id/block ein user blockieren
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

// PATCH /v1/users/:id/unblock user unblock
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

// DELETE /v1/users/:id user löschen
router.delete('/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      const error = new Error('Invalid user ID format');
      error.status = 400;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });
    
    if (result.deletedCount === 0) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /v1/users/import csv import
// Warum Backend: validierung erzwungen, consistency (ACID), fehler zentralisiert
// Query-Parameter: duplicateStrategy = 'error' | 'skip' (default: 'skip')
// - 'error': Duplikate werden als separate Liste zurückgegeben für manuelle Behandlung
// - 'skip': Duplikate werden automatisch übersprungen (bisheriges Verhalten)
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    // Prüfe ob Datei hochgeladen wurde
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.status = 400;
      throw error;
    }
    
    // Duplikat-Strategie aus Query-Parameter
    const duplicateStrategy = req.query.duplicateStrategy || 'skip'; // 'error' oder 'skip'
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // CSV Parsing, streaming für große Dateien
    const csvContent = req.file.buffer.toString('utf-8');
    const records = [];
    
    // Promise based Parsing (csv-parser nutzt Streams)
    // keine expliziten header: csv-parser liest Header automatisch aus erster Zeile
    await new Promise((resolve, reject) => {
      const stream = Readable.from(csvContent);
      stream
        .pipe(csv({
          skipEmptyLines: true,
          trim: true
          // header automatisch aus erster Zeile lesen
        }))
        .on('data', (row) => {
          records.push(row);
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // csv nicht leer
    if (records.length === 0) {
      const error = new Error('CSV file is empty or has no valid rows');
      error.status = 400;
      throw error;
    }
    
    // max 10000 Zeilen
    if (records.length > 10000) {
      const error = new Error('CSV file too large (max 10000 rows)');
      error.status = 400;
      throw error;
    }
    
    // Spalten vorhanden?
    // Keys der ersten Zeile prüfen
    const expectedHeaders = ['Name', 'Email', 'IPAddress', 'Location', 'Active', 'LastLogin'];
    const firstRow = records[0];
    const headers = Object.keys(firstRow);
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      const error = new Error(`Missing required headers: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}`);
      error.status = 400;
      throw error;
    }
    
    // zeile validieren und verarbeiten
    const results = {
      total: records.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duplicates: [] // Duplikate für manuelle Behandlung
    };
    
    // duplikate in der csv ?
    const csvEmails = new Set();
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 Header + 1 index
      
      try {
        // gleiche email mehrfach in csv ?
        const emailLower = row.Email?.toLowerCase().trim();
        if (!emailLower) {
          results.errors.push({
            row: rowNumber,
            email: row.Email || 'N/A',
            error: 'Email is required'
          });
          results.skipped++;
          continue;
        }
        
        if (csvEmails.has(emailLower)) {
          results.errors.push({
            row: rowNumber,
            email: row.Email,
            error: 'Duplicate email in CSV file'
          });
          results.skipped++;
          continue;
        }
        csvEmails.add(emailLower);
        
        // daten transformieren
        const csvRow = {
          name: row.Name?.trim(),
          email: emailLower,
          ipAddress: row.IPAddress?.trim() || null,
          location: row.Location?.trim() || null,
          active: row.Active?.trim(),
          lastLogin: row.LastLogin?.trim() || null
        };
        
        // validation mit joi
        const validation = userValidation(csvRow, 'csv');
        if (!validation.isValid) {
          results.errors.push({
            row: rowNumber,
            email: row.Email,
            errors: validation.errors
          });
          results.skipped++;
          continue;
        }
        
        const userData = validation.data;
        
        // email schon vorhanden?
        const existing = await collection.findOne({ 
          email: userData.email.toLowerCase() 
        });
        
        if (existing) {
          // Duplikat gefunden
          if (duplicateStrategy === 'error') {
            // Duplikat zur Liste hinzufügen für manuelle Behandlung
            results.duplicates.push({
              row: rowNumber,
              email: userData.email,
              name: userData.name,
              location: userData.location,
              existingUser: {
                _id: existing._id.toString(),
                name: existing.name,
                email: existing.email,
                location: existing.location,
                active: existing.active,
                blocked: existing.blocked
              },
              csvData: {
                name: userData.name,
                email: userData.email,
                ipAddress: userData.ipAddress,
                location: userData.location,
                active: userData.active,
                lastLogin: userData.lastLogin
              }
            });
            results.skipped++;
          } else {
            // 'skip' Strategie: automatisch updaten (bisheriges Verhalten)
            await collection.updateOne(
              { _id: existing._id },
              {
                $set: {
                  name: userData.name,
                  email: userData.email,
                  ipAddress: userData.ipAddress,
                  location: userData.location,
                  active: userData.active,
                  lastLogin: userData.lastLogin,
                  updatedAt: new Date()
                  // blocked wird NICHT überschrieben
                }
              }
            );
            results.updated++;
          }
        } else {
          // neuer user
          await collection.insertOne({
            ...userData,
            blocked: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          results.imported++;
        }
      } catch (error) {
        // fehler loggen und weitermachen
        results.errors.push({
          row: rowNumber,
          email: row.Email || 'N/A',
          error: error.message
        });
        results.skipped++;
      }
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// POST /v1/users/import/process-duplicates - Verarbeite ausgewählte Duplikate
// Body: { duplicates: [{ row, action: 'import' | 'skip', ...csvData }] }
// - action: 'import' = trotzdem hinzufügen (Update), 'skip' = verwerfen
router.post('/import/process-duplicates', async (req, res, next) => {
  try {
    const { duplicates } = req.body;
    
    if (!Array.isArray(duplicates)) {
      const error = new Error('duplicates must be an array');
      error.status = 400;
      throw error;
    }
    
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const duplicate of duplicates) {
      try {
        const { row, action, csvData, existingUserId } = duplicate;
        
        if (action === 'skip') {
          results.skipped++;
          continue;
        }
        
        if (action === 'import') {
          // Validierung
          const validation = userValidation(csvData, 'csv');
          if (!validation.isValid) {
            results.errors.push({
              row,
              email: csvData.email,
              errors: validation.errors
            });
            results.skipped++;
            continue;
          }
          
          const userData = validation.data;
          
          // Update bestehenden User
          if (existingUserId && ObjectId.isValid(existingUserId)) {
            await collection.updateOne(
              { _id: new ObjectId(existingUserId) },
              {
                $set: {
                  name: userData.name,
                  email: userData.email,
                  ipAddress: userData.ipAddress,
                  location: userData.location,
                  active: userData.active,
                  lastLogin: userData.lastLogin,
                  updatedAt: new Date()
                  // blocked wird NICHT überschrieben
                }
              }
            );
            results.imported++;
          } else {
            // Fallback: Suche nach Email
            const existing = await collection.findOne({ 
              email: userData.email.toLowerCase() 
            });
            
            if (existing) {
              await collection.updateOne(
                { _id: existing._id },
                {
                  $set: {
                    name: userData.name,
                    email: userData.email,
                    ipAddress: userData.ipAddress,
                    location: userData.location,
                    active: userData.active,
                    lastLogin: userData.lastLogin,
                    updatedAt: new Date()
                  }
                }
              );
              results.imported++;
            } else {
              results.errors.push({
                row,
                email: csvData.email,
                error: 'Existing user not found'
              });
              results.skipped++;
            }
          }
        }
      } catch (error) {
        results.errors.push({
          row: duplicate.row,
          email: duplicate.csvData?.email || 'N/A',
          error: error.message
        });
        results.skipped++;
      }
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

// GET /v1/users/export - CSV Export
router.get('/export', async (req, res, next) => {
  try {
    const { db } = await connectToMongoDB();
    const collection = db.collection('users');
    
    // Query-Builder für Filterung (gleiche Logik wie GET /users)
    const query = {};
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    if (req.query.blocked !== undefined) {
      query.blocked = req.query.blocked === 'true';
    }
    if (req.query.location) {
      query.location = { $regex: req.query.location, $options: 'i' };
    }
    
    // Sortierung
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortOrder };
    
    // Alle User abrufen (ohne Pagination für Export)
    const users = await collection.find(query).sort(sort).toArray();
    
    // CSV Header
    const csvHeader = 'Name,Email,IPAddress,Location,Active,LastLogin\n';
    
    // CSV Zeilen generieren
    const csvRows = users.map(user => {
      const name = `"${(user.name || '').replace(/"/g, '""')}"`;
      const email = `"${(user.email || '').replace(/"/g, '""')}"`;
      const ipAddress = `"${(user.ipAddress || '').replace(/"/g, '""')}"`;
      const location = `"${(user.location || '').replace(/"/g, '""')}"`;
      const active = user.active ? 'true' : 'false';
      const lastLogin = user.lastLogin 
        ? new Date(user.lastLogin).toISOString().replace('T', ' ').substring(0, 19)
        : '';
      
      return `${name},${email},${ipAddress},${location},${active},${lastLogin}`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // CSV als Download senden
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
