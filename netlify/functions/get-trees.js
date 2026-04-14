const { buildResponse, handleError, noContent } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const { queryPostgresCollection } = require('./_lib/db-api');

/**
 * Netlify Function: get-trees
 * Fetches LoveTrees owned by the authenticated user.
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
    // 3. Authentication Required
    const user = await requireUser(event);
    
    // 4. Query Trees
    // The client expects an array of tree objects
    const docs = await queryPostgresCollection(user, 'trees', {
      where: [
        { field: 'ownerId', op: '==', value: user.uid }
      ],
      orderBy: [
        { field: 'updatedAt', direction: 'desc' }
      ]
    });

    // 5. Transform to client format
    const trees = docs.map(doc => ({
      id: doc.id,
      ...doc.data
    }));

    return buildResponse(200, { trees });

  } catch (err) {
    return handleError('get-trees', err);
  }
};
