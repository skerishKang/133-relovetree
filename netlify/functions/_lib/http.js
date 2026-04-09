function getAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.URL || 'https://lovetree.limone.dev';
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function resolveCorsOrigin(requestOrigin) {
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || 'https://lovetree.limone.dev';
}

function getCorsHeaders(requestOrigin, extraHeaders) {
  return Object.assign(
    {
      'Access-Control-Allow-Origin': resolveCorsOrigin(requestOrigin),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Vary': 'Origin',
    },
    extraHeaders || {}
  );
}

function buildResponse(statusCode, bodyObj, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign(
      {
        'Access-Control-Allow-Origin': resolveCorsOrigin(),
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Vary': 'Origin',
        'Content-Type': 'application/json; charset=utf-8',
      },
      extraHeaders || {}
    ),
    body: bodyObj == null ? '' : JSON.stringify(bodyObj),
  };
}

function ok(bodyObj, extraHeaders) {
  return buildResponse(200, bodyObj, extraHeaders);
}

function noContent(extraHeaders) {
  return buildResponse(204, null, extraHeaders);
}

function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function handleError(scope, error, requestOrigin) {
  const errorInfo = {
    scope,
    timestamp: new Date().toISOString(),
    message: error?.message || 'Unknown error',
    status: error?.status || 500,
  };
  
  if (error.details) errorInfo.details = error.details;
  
  console.error(`${scope} error:`, errorInfo);
  const headers = getCorsHeaders(requestOrigin, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  if (error && typeof error.status === 'number') {
    return buildResponse(error.status, {
      error: error.message || 'Error',
      details: error.details || null,
    }, headers);
  }
  return buildResponse(500, { error: 'Internal error' }, headers);
}

module.exports = {
  buildResponse,
  getCorsHeaders,
  ok,
  noContent,
  httpError,
  handleError,
};
