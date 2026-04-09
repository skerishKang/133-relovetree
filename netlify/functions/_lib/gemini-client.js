const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * 환경 변수에서 Gemini API 키 추출
 */
function getApiKeys(env) {
  const raw = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Gemini API 호출 (다중 키 지원 및 재시도 로직 포함)
 */
async function callGeminiText(promptText, env) {
  const keys = getApiKeys(env);
  if (!keys.length) {
    throw new Error('GEMINI_API_KEYS not configured');
  }

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
        `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
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
    throw lastError || new Error('All Gemini keys failed');
  }

  const candidates = data.candidates || [];
  const first = candidates[0];
  const part = first && first.content && first.content.parts && first.content.parts[0];
  const rawText = part && (part.text || part);
  if (!rawText) {
    throw new Error('Empty Gemini response');
  }
  return typeof rawText === 'string' ? rawText : String(rawText);
}

module.exports = {
  getApiKeys,
  callGeminiText,
};
