const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Determine status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;
  let code = err.code || 'ERROR';

  // Specific error types
  if (err.message && err.message.includes('Validation')) {
    statusCode = 400;
    message = 'Invalid input';
    code = 'VALIDATION_ERROR';
    details = err.validationErrors || [];
  } else if (err.message && err.message.includes('Not found')) {
    statusCode = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (err.message && err.message.includes('Unauthorized')) {
    statusCode = 401;
    message = 'Authentication required';
    code = 'UNAUTHORIZED';
  } else if (err.message && err.message.includes('Forbidden')) {
    statusCode = 403;
    message = 'Access denied';
    code = 'FORBIDDEN';
  } else if (err.message && err.message.includes('Rate limit')) {
    statusCode = 429;
    message = 'Too many requests. Please try again later.';
    code = 'RATE_LIMIT';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: code,
      message: message,
      details: details,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
