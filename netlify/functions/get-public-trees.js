const { buildResponse, handleError, noContent } = require('./_lib/http');
const { queryPostgresCollection } = require('./_lib/db-api');

/**
 * Netlify Function: get-public-trees
 * Fetches LoveTrees marked as public for the community square.
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
    // 3. Parse Params
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit || '12', 10);
    const sort = params.sort || 'recent';

    // 4. Query Public Trees
    // Use a dummy user (null) since this is public, 
    // but the API handles internal authorization logic if needed.
    const docs = await queryPostgresCollection('trees', {
      where: [
        { field: 'isPublic', op: '==', value: true }
      ],
      orderBy: [
        { field: sort === 'popular' ? 'viewCount' : 'updatedAt', direction: 'desc' }
      ],
      limit: limit
    }, null);

    // 5. Transform & Return
    const trees = docs.map(doc => ({
      id: doc.id,
      ...doc.data
    }));

    return buildResponse(200, { trees });

  } catch (err) {
    return handleError('get-public-trees', err);
  }
};
