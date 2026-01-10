const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  ipAddress: { 
    type: String, 
    required: false,
    match: [/^(\d{1,3}\.){3}\d{1,3}$/, 'Please enter a valid IP address']
  },
  location: { 
    type: String, 
    required: false,
    trim: true,
    maxlength: 100
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  blocked: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: { 
    type: Date, 
    required: false 
  }
}, { 
  timestamps: true // Automatisch createdAt und updatedAt
});

module.exports = mongoose.model('User', userSchema); 
