const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Validation Errors (Joi oder Custom)
  if (err.isJoi || err.name === 'ValidationError' || err.status === 400 && err.details) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.details || err.errors || err.message
    });
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: `${field} already exists`
    });
  }

  // MongoDB Cast Error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'Invalid user ID format'
    });
  }

  // Not Found
  if (err.status === 404 || err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message || 'Resource not found'
    });
  }

  // Default: 500 Internal Server Error
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
};

// 404 Handler für nicht-existierende Routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
};

module.exports = { errorHandler, notFoundHandler };
