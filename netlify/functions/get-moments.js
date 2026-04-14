const { buildResponse, handleError, noContent } = require('./_lib/http');
const { getPostgresDoc } = require('./_lib/db-api');

/**
 * Netlify Function: get-moments
 * Fetches the moments (nodes) for a specific tree.
 * In this architecture, moments are stored as a 'nodes' array within the tree document.
 */
exports.handler = async (event, context) => {
  // 1. Handle Preflight
  if (event.httpMethod === 'OPTIONS') {
    return noContent();
  }

  // 2. Only allow GET
  if (event.httpMethod !== 'GET') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    const params = event.queryStringParameters || {};
    const treeId = params.treeId;

    if (!treeId) {
      return buildResponse(400, { error: 'treeId is required' });
    }

    // 3. Fetch the Tree
    // Use a null user for the query (internal fetch)
    const doc = await getPostgresDoc(null, `trees/${treeId}`);

    if (!doc || !doc.data) {
      return buildResponse(404, { error: 'Tree not found' });
    }

    // 4. Return the nodes array (moments)
    const moments = doc.data.nodes || [];

    return buildResponse(200, { moments });

  } catch (err) {
    return handleError('get-moments', err);
  }
};
