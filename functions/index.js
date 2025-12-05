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
    const { prompt, count } = data;
    const safeCount = Math.max(1, Math.min(12, Number(count) || 4));
    const text = `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 다음 필드를 갖습니다: title, date, description.\n` +
      `date는 YYYY-MM-DD 형식으로만 출력하세요. 과거에서 현재 순으로 정렬해 주세요.\n` +
      `출력은 오직 JSON 배열만 제공하세요. 한국어로 작성하세요.\n` +
      `사용자 설명: ${prompt || ''}`;
    return { mode: 'tree', text, count: safeCount };
  }

  if (mode === 'comment') {
    const { prompt, nodeTitle } = data;
    const base = prompt || nodeTitle || '이 순간';
    const text = `당신은 K-pop 팬의 감정 표현을 도와주는 어시스턴트입니다.\n` +
      `다음 순간을 설명하는 한국어 한줄 코멘트를 3개 제안해 주세요.\n` +
      `각 코멘트는 1~2문장, 60자 이내로 해주세요.\n` +
      `응답은 오직 JSON 배열(문자열 배열) 형식으로만 해주세요.\n` +
      `순간 설명: ${base}`;
    return { mode: 'comment', text: text };
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
    const candidates = data.candidates || [];
    const first = candidates[0];
    const part = first && first.content && first.content.parts && first.content.parts[0];
    const rawText = part && (part.text || part);

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.warn('Failed to parse Gemini JSON, returning raw text');
      parsed = rawText;
    }

    return res.json({ mode, result: parsed });
  } catch (err) {
    console.error('aiHelper error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});
