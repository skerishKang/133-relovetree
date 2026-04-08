const { buildResponse, handleError, noContent, httpError } = require('./_lib/http');
const { executeFirestoreApi } = require('./_lib/firestore-api');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return noContent();
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (error) {
      throw httpError(400, 'Invalid JSON body');
    }

    const data = await executeFirestoreApi(event, body);
    return buildResponse(200, data);
  } catch (error) {
    return handleError('firestore-api', error, requestOrigin);
  }
};
