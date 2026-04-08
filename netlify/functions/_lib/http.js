function buildResponse(statusCode, bodyObj, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign(
      {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

function handleError(scope, error) {
  console.error(`${scope} error:`, error);
  if (error && typeof error.status === 'number') {
    return buildResponse(error.status, {
      error: error.message || 'Error',
      details: error.details || null,
    });
  }
  return buildResponse(500, { error: 'Internal error' });
}

module.exports = {
  buildResponse,
  ok,
  noContent,
  httpError,
  handleError,
};
