/**
 * ⚠️ LEGACY ENDPOINT NAME - Firestore API Endpoint (Netlify Function)
 * 
 * Routing to PostgreSQL via _lib/firestore-api.js and document-store.js.
 * DO NOT USE for new server code reference.
 * Use: /netlify/functions/_lib/db-api.js for server-side code
 * 
 * Despite the name, this routes to PostgreSQL, NOT Firestore!
 * 
 * Endpoint: POST /.netlify/functions/firestore-api
 * 
 * Architecture:
 *   Client (via firebase-firestore-compat.js) → This Endpoint → _lib/firestore-api.js → PostgreSQL
 * 
 * What this does:
 *   - Accepts Firestore-style operations (getDoc, setDoc, queryCollection, etc.)
 *   - Validates request (JSON parse, method check)
 *   - Delegates to _lib/firestore-api.js for processing
 * 
 * Data goes to:
 *   - Neon PostgreSQL (via document-store.js)
 *   - NOT to Firebase Firestore
 * 
 * This endpoint exists for backward compatibility with the Firestore-style API.
 */
const { buildResponse, handleError, noContent, httpError } = require('./_lib/http');
const { executeFirestoreApi } = require('./_lib/firestore-api');

exports.handler = async (event) => {
  const requestOrigin = event && event.headers
    ? (event.headers.origin || event.headers.Origin || '')
    : '';

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
