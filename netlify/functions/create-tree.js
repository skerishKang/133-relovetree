const { buildResponse, handleError, httpError, noContent } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const treeRepository = require('./_lib/repositories/tree-repository');

/**
 * Netlify Function: create-tree
 * Creates a new LoveTree for the authenticated user.
 * 
 * Request Body: { userId, title, description, isPublic, ... }
 */
exports.handler = async (event, context) => {
  // 1. Handle Preflight
  if (event.httpMethod === 'OPTIONS') {
    return noContent();
  }

  // 2. Only allow POST
  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    // 3. Authentication
    const authUser = await requireUser(event);
    
    // 4. Parse & Validate Body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      throw httpError(400, 'Invalid JSON body');
    }

    // Mapping fields from api.js to repository schema
    // api.js sends { userId, title, description, isPublic }
    const { title, name, description, isPublic, userId } = body;
    const finalName = name || title;

    if (!finalName) {
      throw httpError(400, 'Missing required field: name/title');
    }

    // Security check: ensure provided userId matches auth user
    const targetUid = userId || authUser.uid;
    if (authUser.uid !== targetUid) {
      throw httpError(403, 'Unauthorized UID mismatch');
    }

    // 5. Create Tree via repository
    // repository uses documentStore which now handles payload/column sync
    const treeData = {
      name: finalName,
      ownerId: targetUid,
      description: description || '',
      isPublic: !!isPublic,
      nodeCount: 0,
      viewCount: 0,
      likeCount: 0,
      shareCount: 0,
      nodes: [],
      lastUpdated: new Date().toISOString()
    };

    const doc = await treeRepository.createTree(treeData);

    // 6. Return Success
    return buildResponse(201, {
      id: doc.id,
      treeId: doc.id,
      message: 'LoveTree created successfully',
      data: doc.data
    });

  } catch (err) {
    return handleError('create-tree', err);
  }
};
