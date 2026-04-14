/**
 * Error Formatter - Standardized error handling for document store
 */

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isDatabaseError(error) {
  return error && typeof error.code === 'string' && error.code.startsWith('2');
}

function formatDatabaseError(error, operation) {
  console.error(`Database error during ${operation}:`, error.message);
  
  if (error.code === '23505') {
    return httpError(409, 'Duplicate entry: resource already exists');
  }
  if (error.code === '23503') {
    return httpError(400, 'Foreign key constraint violation');
  }
  if (error.code === '42601') {
    return httpError(500, 'Database query syntax error');
  }
  
  return httpError(500, `Database error: ${error.message}`);
}

function formatValidationError(message) {
  return httpError(400, message);
}

function formatNotFoundError(collection, docId) {
  return httpError(404, `Document not found: ${collection}/${docId}`);
}

function formatUnauthorizedError(message = 'Unauthorized') {
  return httpError(401, message);
}

function formatForbiddenError(message = 'Forbidden') {
  return httpError(403, message);
}

module.exports = {
  httpError,
  isDatabaseError,
  formatDatabaseError,
  formatValidationError,
  formatNotFoundError,
  formatUnauthorizedError,
  formatForbiddenError,
};