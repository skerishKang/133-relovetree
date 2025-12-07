// Netlify Function: 관리자용 트리 AI 어시스트 (노드 설명 생성)
// - Firebase Admin SDK로 트리/노드 데이터를 읽고,
// - Gemini API를 호출해 노드 설명을 생성/리라이팅한다.

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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

function getApiKeys(env) {
  const raw = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function buildNodeDescriptionPrompt(tree, node, nodeIndex, nodes) {
  const treeName = tree.name || '이 러브트리';
  const title = node.title || `노드 ${node.id != null ? node.id : nodeIndex + 1}`;
  const date = node.date || '';
  const videoId = node.videoId || '';
  const artist = tree.artist || tree.artistName || '';
  const totalNodes = Array.isArray(nodes) ? nodes.length : 0;

  const prevNode =
    nodeIndex > 0 && Array.isArray(nodes) && nodes[nodeIndex - 1]
      ? nodes[nodeIndex - 1]
      : null;
  const nextNode =
    Array.isArray(nodes) && nodeIndex < nodes.length - 1 && nodes[nodeIndex + 1]
      ? nodes[nodeIndex + 1]
      : null;

  const prevTitle = prevNode && prevNode.title ? prevNode.title : null;
  const nextTitle = nextNode && nextNode.title ? nextNode.title : null;

  const contextLines = [];
  contextLines.push(`트리 이름: ${treeName}`);
  if (artist) {
    contextLines.push(`아티스트: ${artist}`);
  }
  contextLines.push(`전체 노드 수: ${totalNodes}`);
  contextLines.push(`현재 노드 인덱스: ${nodeIndex}`);

  contextLines.push('');
  contextLines.push(`현재 노드 제목: ${title}`);
  if (date) contextLines.push(`현재 노드 날짜: ${date}`);
  if (videoId) contextLines.push(`현재 노드 영상 ID: ${videoId}`);

  if (prevTitle) {
    contextLines.push(`이전 노드 제목: ${prevTitle}`);
  }
  if (nextTitle) {
    contextLines.push(`다음 노드 제목: ${nextTitle}`);
  }

  const baseDescription = node.description || '';

  const instructions =
    '당신은 K-pop 팬을 위한 덕질 타임라인 설명을 작성하는 작가입니다.\n' +
    '위 정보를 참고하여 현재 노드에 대한 설명을 한국어로 2~4문장 정도로 써 주세요.\n' +
    '톤은 과몰입 팬이지만 과하지 않게, 따뜻하고 공감되는 느낌으로 작성해 주세요.\n' +
    '문장 사이에는 줄바꿈을 최소한만 사용하고, 출력은 설명 텍스트만 포함해 주세요.\n' +
    '기존 설명이 있다면 더 자연스럽게 다듬어서 다시 써 주세요.\n' +
    (baseDescription
      ? `\n기존 설명:\n${baseDescription}\n`
      : '\n기존 설명은 없습니다. 처음부터 새로 작성해 주세요.\n');

  return `${contextLines.join('\n')}\n\n${instructions}`;
}

async function callGeminiForDescription(promptText, env) {
  const keys = getApiKeys(env);
  if (!keys.length) {
    throw new Error('GEMINI_API_KEYS not configured');
  }

  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
  };

  let lastError = null;
  let data = null;

  for (const apiKey of keys) {
    try {
      const response = await fetch(
        `${endpoint}?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('Gemini API error:', response.status, text);
        if (response.status === 429 || response.status === 403) {
          lastError = new Error('Quota or permission error for one key');
          continue;
        }
        lastError = new Error('Gemini error ' + response.status);
        break;
      }

      data = await response.json();
      lastError = null;
      break;
    } catch (e) {
      console.error('Gemini fetch failed for one key:', e);
      lastError = e;
      continue;
    }
  }

  if (!data) {
    throw lastError || new Error('Gemini 호출 실패');
  }

  const candidates = data.candidates || [];
  const first = candidates[0];
  const part = first && first.content && first.content.parts && first.content.parts[0];
  const rawText = part && (part.text || part);

  if (!rawText || typeof rawText !== 'string') {
    throw new Error('잘못된 Gemini 응답 형식');
  }

  return rawText.trim();
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return buildResponse(204, null);
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    const adminInstance = getAdmin();
    const db = adminInstance.firestore();

    await requireAdminUser(event, adminInstance);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return buildResponse(400, { error: 'Invalid JSON body' });
    }

    const mode = body.mode;
    const treeId = body.treeId;
    const nodeIndex = body.nodeIndex;

    if (!mode || mode !== 'node_description_v1') {
      return buildResponse(400, { error: 'Unsupported mode' });
    }

    if (!treeId || typeof treeId !== 'string') {
      return buildResponse(400, { error: 'treeId is required' });
    }

    if (typeof nodeIndex !== 'number' || !Number.isInteger(nodeIndex) || nodeIndex < 0) {
      return buildResponse(400, { error: 'nodeIndex must be a non-negative integer' });
    }

    const snap = await db.collection('trees').doc(treeId).get();
    if (!snap.exists) {
      return buildResponse(404, { error: 'Tree not found' });
    }

    const tree = snap.data() || {};
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];

    if (!nodes.length || nodeIndex >= nodes.length) {
      return buildResponse(404, { error: 'Node not found' });
    }

    const node = nodes[nodeIndex] || {};

    const promptText = buildNodeDescriptionPrompt(tree, node, nodeIndex, nodes);
    const description = await callGeminiForDescription(promptText, process.env);

    return buildResponse(200, {
      mode,
      treeId,
      nodeIndex,
      suggested: {
        description,
      },
    });
  } catch (err) {
    console.error('tree-ai error:', err);
    if (err && typeof err.status === 'number') {
      return buildResponse(err.status, { error: err.message || 'Error' });
    }
    return buildResponse(500, { error: 'Internal error' });
  }
};
