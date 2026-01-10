const Joi = require('joi');

// IP-Address Validierung
const ipAddressPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

// Base Schema für alle Felder
const baseSchema = {
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().trim().lowercase().required(),
  ipAddress: Joi.string().pattern(ipAddressPattern).allow('', null).optional(),
  location: Joi.string().max(100).trim().allow('', null).optional(),
  active: Joi.boolean().default(true),
  blocked: Joi.boolean().default(false),
  lastLogin: Joi.date().iso().allow(null).optional()
};

// POST Schema
const createSchema = Joi.object({
  ...baseSchema,
  name: baseSchema.name.required(),
  email: baseSchema.email.required()
});

// PATCH Schema (alle Felder optional)
const updateSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  email: Joi.string().email().trim().lowercase().optional(),
  ipAddress: Joi.string().pattern(ipAddressPattern).allow('', null).optional(),
  location: Joi.string().max(100).trim().allow('', null).optional(),
  active: Joi.boolean().optional(),
  blocked: Joi.boolean().optional(),
  lastLogin: Joi.date().iso().allow(null).optional()
});

// CSV Import Schema (für CSV-Parsing)
const csvImportSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  email: Joi.string().email().trim().lowercase().required(),
  ipAddress: Joi.string().pattern(ipAddressPattern).allow('', null).optional(),
  location: Joi.string().max(100).trim().allow('', null).optional(),
  active: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false', 'True', 'False', '1', '0')
  ).required(),
  lastLogin: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  ).allow(null, '').optional()
});

const userValidation = (data, schemaType = 'create') => {
  let schema;
  switch (schemaType) {
    case 'create':
      schema = createSchema;
      break;
    case 'update':
      schema = updateSchema;
      break;
    case 'csv':
      schema = csvImportSchema;
      break;
    default:
      schema = createSchema;
  }
  
  const { error, value } = schema.validate(data, { 
    abortEarly: false, 
    allowUnknown: false,
    stripUnknown: true
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    };
  }
  
  // Daten-Transformation für CSV
  if (schemaType === 'csv') {
    // Active: String zu Boolean
    if (typeof value.active === 'string') {
      value.active = value.active.toLowerCase() === 'true' || value.active === '1';
    }
    
    // LastLogin: String zu Date
    if (value.lastLogin && typeof value.lastLogin === 'string') {
      value.lastLogin = new Date(value.lastLogin);
    }
  }
  
  return {
    isValid: true,
    data: value
  };
};

module.exports = { userValidation };
