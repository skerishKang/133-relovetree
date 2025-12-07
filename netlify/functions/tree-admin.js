// Netlify Function: 관리자용 트리/노드 관리 API
// - Firestore Admin SDK를 통해 트리 데이터를 조회/수정
// - 엔드포인트 예시:
//   - GET  /api/admin/trees        -> 트리 리스트
//   - GET  /api/admin/trees/:id    -> 단일 트리 전체 JSON
//   - PATCH/ api/admin/trees/:id   -> 단일 트리 부분 업데이트

const admin = require('firebase-admin');

let adminInitialized = false;

function getAdmin() {
  if (adminInitialized) return admin;

  if (!admin.apps || !admin.apps.length) {
    const raw =
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!raw) {
      console.error(
        'Firebase 서비스 계정 환경 변수가 설정되지 않았습니다. FIREBASE_SERVICE_ACCOUNT_JSON 또는 FIREBASE_SERVICE_ACCOUNT 를 설정하세요.'
      );
      throw new Error('Missing Firebase service account config');
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.error('Firebase 서비스 계정 JSON 파싱 오류:', e);
      throw e;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  adminInitialized = true;
  return admin;
}

function buildResponse(statusCode, bodyObj, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign(
      {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      },
      extraHeaders || {}
    ),
    body: bodyObj ? JSON.stringify(bodyObj) : '',
  };
}

function buildHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function requireAdminUser(event, adminInstance) {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    throw buildHttpError(401, 'Missing or invalid Authorization header');
  }

  const idToken = authHeader.substring(7);

  let decoded;
  try {
    decoded = await adminInstance.auth().verifyIdToken(idToken);
  } catch (e) {
    console.error('ID 토큰 검증 실패:', e);
    throw buildHttpError(401, 'Invalid ID token');
  }

  const uid = decoded.uid;
  const db = adminInstance.firestore();
  const userSnap = await db.collection('users').doc(uid).get();

  if (!userSnap.exists) {
    throw buildHttpError(403, 'User not found');
  }

  const userData = userSnap.data() || {};
  if (userData.role !== 'admin') {
    throw buildHttpError(403, 'Forbidden');
  }

  return { uid, user: userData };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, null);
  }

  try {
    const adminInstance = getAdmin();
    const db = adminInstance.firestore();

    await requireAdminUser(event, adminInstance);

    const functionBasePath = '/.netlify/functions/tree-admin';
    const apiBasePath = '/api/admin/trees';

    let pathTail = event.path || '';

    if (pathTail.startsWith(functionBasePath)) {
      pathTail = pathTail.slice(functionBasePath.length);
    } else if (pathTail.startsWith(apiBasePath)) {
      pathTail = pathTail.slice(apiBasePath.length);
    }

    if (pathTail.startsWith('/')) {
      pathTail = pathTail.slice(1);
    }

    const segments = pathTail.split('/').filter(Boolean);
    const treeId = segments[0] || null;

    const qs = event.queryStringParameters || {};

    if (event.httpMethod === 'GET' && !treeId) {
      const limitRaw = qs.limit;
      const limit = Math.max(1, Math.min(100, Number(limitRaw) || 50));
      const ownerId = qs.ownerId || null;

      let query = db.collection('trees').orderBy('lastUpdated', 'desc').limit(limit);
      if (ownerId) {
        query = query.where('ownerId', '==', ownerId);
      }

      const snapshot = await query.get();
      const items = [];

      snapshot.forEach((doc) => {
        const data = doc.data() || {};
        items.push({
          id: doc.id,
          name: data.name || doc.id,
          ownerId: data.ownerId || null,
          nodeCount:
            typeof data.nodeCount === 'number'
              ? data.nodeCount
              : Array.isArray(data.nodes)
              ? data.nodes.length
              : 0,
          viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
          likeCount:
            typeof data.likeCount === 'number'
              ? data.likeCount
              : Array.isArray(data.likes)
              ? data.likes.length
              : 0,
          shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
          isDemo: !!data.isDemo,
          isAiBot: !!data.isAiBot,
          lastUpdated: data.lastUpdated || null,
        });
      });

      return buildResponse(200, { items });
    }

    if (event.httpMethod === 'GET' && treeId) {
      const snap = await db.collection('trees').doc(treeId).get();
      if (!snap.exists) {
        return buildResponse(404, { error: 'Tree not found' });
      }

      const data = snap.data() || {};
      return buildResponse(200, { id: snap.id, ...data });
    }

    if (event.httpMethod === 'PATCH' && treeId) {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return buildResponse(400, { error: 'Invalid JSON body' });
      }

      if (!body || typeof body !== 'object') {
        return buildResponse(400, { error: 'Request body must be JSON object' });
      }

      const allowedKeys = new Set([
        'name',
        'nodes',
        'edges',
        'likes',
        'comments',
        'nodeCount',
        'viewCount',
        'likeCount',
        'shareCount',
        'lastUpdated',
        'lastOpened',
        'ownerId',
        'isDemo',
        'isAiBot',
      ]);

      const updates = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of Object.entries(body)) {
        if (!allowedKeys.has(key)) continue;

        if (
          (key === 'nodes' || key === 'edges' || key === 'likes' || key === 'comments') &&
          !Array.isArray(value)
        ) {
          return buildResponse(400, { error: `${key} must be an array` });
        }

        updates[key] = value;
      }

      if (!Object.keys(updates).length) {
        return buildResponse(400, { error: 'No valid fields to update' });
      }

      await db.collection('trees').doc(treeId).set(updates, { merge: true });
      return buildResponse(200, { ok: true });
    }

    return buildResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('tree-admin error:', err);
    if (err && typeof err.status === 'number') {
      return buildResponse(err.status, { error: err.message || 'Error' });
    }
    return buildResponse(500, { error: 'Internal error' });
  }
};
