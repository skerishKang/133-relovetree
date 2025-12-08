// Relovetree Cloud Functions - Gemini 2.5 Flash Proxy
// 모든 키/외부 호출은 서버에서 처리하고, 프론트에서는 이 엔드포인트만 호출한다.

import functions from 'firebase-functions';
import admin from 'firebase-admin';
import fetch from 'node-fetch';

if (!admin.apps.length) {
  admin.initializeApp();
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function getApiKeys() {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

// 간단한 입력 검증/매핑용 헬퍼
function buildPromptBody(mode, data) {
  if (mode === 'tree') {
    const { prompt, count } = data || {};
    const safeCount = Math.max(1, Math.min(12, Number(count) || 4));
    const text =
      `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 필드는 title, date, description, youtubeUrl, moments 입니다.\n` +
      `date는 YYYY-MM-DD 형식만 사용하고, 과거에서 현재 순으로 정렬하세요.\n` +
      `youtubeUrl에는 가능하면 공식 뮤직비디오나 대표 무대의 YouTube 전체 URL을 넣어주세요.\n` +
      `moments는 time, text, feeling 필드를 가진 객체 배열로, time은 "MM:SS" 형식의 재생 위치, text는 한국어 한 줄 코멘트입니다. feeling은 love, tear, funny, shock 중 하나로 설정하세요.\n` +
      `출력은 오직 JSON 배열(문자열이 아닌 JSON 객체 배열)만 제공하세요.\n` +
      `한국어로 작성하세요.\n` +
      `사용자 설명: ${prompt || ''}`;
    return { text, count: safeCount };
  }

  if (mode === 'node_edit') {
    const { node, instruction } = data || {};
    const title = (node && node.title) || '';
    const date = (node && node.date) || '';
    const videoId = (node && node.videoId) || '';
    const description = (node && node.description) || '';
    const moments = Array.isArray(node && node.moments) ? node.moments : [];

    const baseJson = JSON.stringify(
      {
        title,
        date,
        videoId,
        description,
        moments,
      },
      null,
      2
    );

    const text =
      `당신은 이미 만들어진 러브트리 노드를 다듬어 주는 한국어 편집 도우미입니다.\n` +
      `현재 노드를 읽고, 사용자의 요청에 맞게 title, description, youtubeUrl, videoId, moments를 업데이트한 JSON 객체 하나를 반환하세요.\n` +
      `필드 설명:\n` +
      `- title: 노드 제목 (필요하면 더 자연스럽게 수정)\n` +
      `- description: 이 노드를 설명하는 1~3문장 정도의 한국어 요약\n` +
      `- youtubeUrl: 가능하면 대표 YouTube 영상 전체 URL (없으면 비워둘 수 있음)\n` +
      `- videoId: youtubeUrl에서 추출한 11글자 영상 ID (둘 중 하나만 있어도 됨)\n` +
      `- moments: time, text, feeling(love|tear|funny|shock) 필드를 가진 객체 배열\n` +
      `응답은 오직 하나의 JSON 객체만 포함해야 하며, 한국어로 작성된 description과 moments.text를 포함해야 합니다.\n` +
      `현재 노드(JSON):\n${baseJson}\n\n` +
      `사용자 요청: ${instruction || '이 노드를 더 자연스럽고 감성적으로 정리해줘.'}`;

    return { text };
  }

  if (mode === 'comment') {
    const { prompt, nodeTitle } = data || {};
    const base = prompt || nodeTitle || '이 순간';
    const text =
      `당신은 K-pop 팬의 감정 표현을 도와주는 어시스턴트입니다.\n` +
      `다음 순간을 설명하는 한국어 한 줄 코멘트를 3개 제안해 주세요.\n` +
      `각 코멘트는 1~2문장, 60자 이내로 해주세요.\n` +
      `응답은 오직 JSON 문자열 배열 형식으로만 주세요.\n` +
      `순간 설명: ${base}`;
    return { text };
  }

  if (mode === 'qa') {
    const { prompt, context } = data || {};
    const text =
      `당신은 러브트리(LoveTree) 앱을 사용하는 사용자를 돕는 한국어 어시스턴트입니다.\n` +
      `질문에 대해 친절하지만 간결하게 답변하고, 가능하면 번호 목록이나 불릿으로 정리해 주세요.\n` +
      `앱의 현재 상태에 대한 추가 정보가 있을 수 있습니다:\n` +
      `${context || '(추가 정보 없음)'}\n` +
      `질문: ${prompt || ''}`;
    return { text };
  }

  throw new Error('Unsupported mode');
}

export const aiHelper = functions
  .region('asia-northeast3')
  .runWith({ secrets: ['GEMINI_API_KEYS'] })
  .https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keys = getApiKeys();
    if (!keys.length) {
      return res.status(500).json({ error: 'GEMINI_API_KEY(S) not configured' });
    }

    const { mode, payload } = req.body || {};
    if (!mode || !payload) {
      return res.status(400).json({ error: 'mode and payload are required' });
    }

    const promptBody = buildPromptBody(mode, payload);

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: promptBody.text }]
        }
      ]
    };

    let lastError = null;
    let data = null;

    for (const apiKey of keys) {
      try {
        const response = await fetch(
          `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error('Gemini API error:', response.status, text);

          // 429/403 등 쿼터/허용량 문제면 다음 키로 시도
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
      console.error('All Gemini keys failed:', lastError);
      return res.status(502).json({ error: 'Gemini API error', detail: String(lastError) });
    }

    const candidates = data.candidates || [];
    const first = candidates[0];
    const part = first && first.content && first.content.parts && first.content.parts[0];
    const rawText = part && (part.text || part);

    let result;
    if (mode === 'qa') {
      // QA 모드는 일반 텍스트 답변을 그대로 반환
      result = rawText;
    } else {
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        console.warn('Failed to parse Gemini JSON, returning raw text');
        result = rawText;
      }
    }

    return res.json({ mode, result });
  } catch (err) {
    console.error('aiHelper error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

function buildHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function requireAdminUser(req) {
  const authHeader = req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw buildHttpError(401, 'Missing or invalid Authorization header');
  }

  const idToken = authHeader.substring(7);

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    console.error('Failed to verify ID token:', e);
    throw buildHttpError(401, 'Invalid ID token');
  }

  const uid = decoded.uid;
  const db = admin.firestore();
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

export const treeAdmin = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    try {
      const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
      const segments = url.pathname.split('/').filter(Boolean);

      // Expect path like /api/admin/trees or /api/admin/trees/:id
      if (segments.length < 3 || segments[0] !== 'api' || segments[1] !== 'admin' || segments[2] !== 'trees') {
        return res.status(404).json({ error: 'Not found' });
      }

      const treeId = segments[3] ? decodeURIComponent(segments[3]) : null;

      // 관리자 인증
      await requireAdminUser(req);

      const db = admin.firestore();

      // GET /api/admin/trees 리스트 (간단 버전)
      if (req.method === 'GET' && !treeId) {
        const limit = Math.max(1, Math.min(100, Number((new URLSearchParams(url.search)).get('limit')) || 50));
        const ownerId = (new URLSearchParams(url.search)).get('ownerId') || null;

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
            name: data.name || decodeURIComponent(doc.id),
            ownerId: data.ownerId || null,
            nodeCount: typeof data.nodeCount === 'number' ? data.nodeCount : (Array.isArray(data.nodes) ? data.nodes.length : 0),
            viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
            likeCount: typeof data.likeCount === 'number'
              ? data.likeCount
              : (Array.isArray(data.likes) ? data.likes.length : 0),
            shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
            isDemo: !!data.isDemo,
            isAiBot: !!data.isAiBot,
            lastUpdated: data.lastUpdated || null
          });
        });

        return res.json({ items });
      }

      // GET /api/admin/trees/:id - 단일 트리 조회
      if (req.method === 'GET' && treeId) {
        const snap = await db.collection('trees').doc(treeId).get();
        if (!snap.exists) {
          return res.status(404).json({ error: 'Tree not found' });
        }

        const data = snap.data() || {};
        return res.json({ id: snap.id, ...data });
      }

      // PATCH /api/admin/trees/:id - 단일 트리 부분 업데이트
      if (req.method === 'PATCH' && treeId) {
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({ error: 'Request body must be JSON object' });
        }

        const allowedKeys = new Set([
          'name', 'nodes', 'edges', 'likes', 'comments',
          'nodeCount', 'viewCount', 'likeCount', 'shareCount',
          'lastUpdated', 'lastOpened', 'ownerId', 'isDemo', 'isAiBot'
        ]);

        const updates = {};
        for (const [key, value] of Object.entries(req.body)) {
          if (!allowedKeys.has(key)) continue;
          // 간단 유효성 검사
          if ((key === 'nodes' || key === 'edges' || key === 'likes' || key === 'comments') && !Array.isArray(value)) {
            return res.status(400).json({ error: `${key} must be an array` });
          }
          updates[key] = value;
        }

        if (!Object.keys(updates).length) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        await db.collection('trees').doc(treeId).set(updates, { merge: true });
        return res.json({ ok: true });
      }

      // 아직 구현되지 않은 메서드/경로
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
      console.error('treeAdmin error:', err);
      if (err && typeof err.status === 'number') {
        return res.status(err.status).json({ error: err.message || 'Error' });
      }
      return res.status(500).json({ error: 'Internal error' });
    }
  });
