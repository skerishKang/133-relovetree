const { buildResponse, handleError, httpError, noContent } = require('./_lib/http');
const { requireUser } = require('./_lib/firebase-auth');
const { query } = require('./_lib/db');
const crypto = require('crypto');

/**
 * Netlify Function: create-moment
 * Saves a new story/memory (moment) to the PostgreSQL database.
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
    // 3. Authentication (Optional but recommended for uid verification)
    const authUser = await requireUser(event).catch(() => null);
    
    // 4. Parse & Validate Body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      throw httpError(400, 'Invalid JSON body');
    }

    const { url, memo, tags, uid } = body;

    if (!url || !uid) {
      throw httpError(400, 'Missing required fields (url, uid)');
    }

    // Security check: ensure provided uid matches auth user if logged in
    if (authUser && authUser.uid !== uid) {
      throw httpError(403, 'Unauthorized UID mismatch');
    }

    // 5. Postgres INSERT
    const momentId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Convert tags array to Postgres array format or JSON if needed
    // Assuming tags is an array of strings
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    const sql = `
      INSERT INTO moments (id, external_user_id, video_url, memo, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const values = [
      momentId,
      uid,
      url,
      memo || '',
      tagsJson,
      now,
      now
    ];

    const result = await query(sql, values);
    const createdId = result.rows[0].id;

    // 6. Return Success
    return buildResponse(201, {
      id: createdId,
      message: 'Moment created successfully'
    });

  } catch (err) {
    return handleError('create-moment', err);
  }
};
