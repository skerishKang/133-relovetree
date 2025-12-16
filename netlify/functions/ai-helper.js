// Netlify Function: Gemini 2.5 Flash 프록시
// - 여러 GEMINI_API_KEYS 를 순차적으로 사용
// - 트리 뼈대 / 코멘트 추천 / QA(질문·도움말) 모드를 지원
// - 프런트에서는 /.netlify/functions/ai-helper 로 호출

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function getYouTubeApiKey(env) {
  return (env.YOUTUBE_API_KEY || '').trim();
}

function getYouTubeRequestHeaders(env) {
  const referer = (env.YOUTUBE_API_REFERER || env.URL || env.DEPLOY_PRIME_URL || '').trim();
  if (!referer) return undefined;
  return {
    Referer: referer,
    Origin: referer,
  };
}

function clampNumber(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function isoToDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const t = iso.split('T')[0];
  return t || '';
}

function msToTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function truncateText(text, maxChars) {
  if (!text || typeof text !== 'string') return '';
  if (!Number.isFinite(maxChars) || maxChars <= 0) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

function safeJsonParse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const firstObj = raw.indexOf('{');
    const firstArr = raw.indexOf('[');
    let start = -1;
    if (firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
    else start = Math.max(firstObj, firstArr);

    if (start < 0) return null;

    const lastObj = raw.lastIndexOf('}');
    const lastArr = raw.lastIndexOf(']');
    const end = Math.max(lastObj, lastArr);
    if (end <= start) return null;
    const sliced = raw.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch (e2) {
      return null;
    }
  }
}

async function youtubeSearchFirstVideo(query, apiKey) {
  if (!query || !apiKey) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(process.env),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('YouTube search failed: ' + res.status + ' ' + t);
  }
  const data = await res.json();
  const item = data && data.items && data.items[0];
  const videoId = item && item.id && item.id.videoId;
  const snippet = item && item.snippet;
  if (!videoId) return null;
  return {
    videoId,
    title: (snippet && snippet.title) || '',
    description: (snippet && snippet.description) || '',
    publishedAt: (snippet && snippet.publishedAt) || '',
    channelTitle: (snippet && snippet.channelTitle) || '',
  };
}

async function youtubeSearchVideos(query, apiKey, maxResults) {
  if (!query || !apiKey) return [];
  const safeMax = clampNumber(maxResults || 6, 1, 10);

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(safeMax));
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(process.env),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('YouTube search failed: ' + res.status + ' ' + t);
  }
  const data = await res.json();
  const items = data && Array.isArray(data.items) ? data.items : [];

  return items
    .map(function (item) {
      const videoId = item && item.id && item.id.videoId;
      const snippet = item && item.snippet;
      if (!videoId) return null;
      return {
        videoId,
        title: (snippet && snippet.title) || '',
        description: (snippet && snippet.description) || '',
        publishedAt: (snippet && snippet.publishedAt) || '',
        channelTitle: (snippet && snippet.channelTitle) || '',
      };
    })
    .filter(Boolean);
}

async function youtubeGetVideoDetails(videoId, apiKey) {
  if (!videoId || !apiKey) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(process.env),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('YouTube videos failed: ' + res.status + ' ' + t);
  }
  const data = await res.json();
  const item = data && data.items && data.items[0];
  const snippet = item && item.snippet;
  const contentDetails = item && item.contentDetails;
  return {
    videoId,
    title: (snippet && snippet.title) || '',
    description: (snippet && snippet.description) || '',
    publishedAt: (snippet && snippet.publishedAt) || '',
    channelTitle: (snippet && snippet.channelTitle) || '',
    duration: (contentDetails && contentDetails.duration) || '',
  };
}

async function fetchTimedTextJson3(videoId, lang) {
  if (!videoId) return null;
  const url = new URL('https://www.youtube.com/api/timedtext');
  url.searchParams.set('fmt', 'json3');
  url.searchParams.set('v', videoId);
  url.searchParams.set('lang', lang);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function buildTranscriptLines(json3, maxLines) {
  if (!json3 || !Array.isArray(json3.events)) return [];
  const lines = [];
  for (const ev of json3.events) {
    const start = typeof ev.tStartMs === 'number' ? ev.tStartMs : null;
    const segs = Array.isArray(ev.segs) ? ev.segs : [];
    const text = segs
      .map((s) => (s && s.utf8 ? String(s.utf8) : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    if (start == null) continue;
    lines.push(`[${msToTime(start)}] ${text}`);
    if (lines.length >= maxLines) break;
  }
  return lines;
}

async function getTranscriptText(videoId) {
  const ko = await fetchTimedTextJson3(videoId, 'ko');
  let lines = buildTranscriptLines(ko, 220);
  if (!lines.length) {
    const en = await fetchTimedTextJson3(videoId, 'en');
    lines = buildTranscriptLines(en, 220);
  }
  return lines.join('\n');
}

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

async function buildRealNodeFromVideo(opts) {
  const {
    baseTitle,
    instruction,
    video,
    transcriptText,
    env,
  } = opts;

  const safeTranscript = truncateText(transcriptText || '', 14000);

  const prompt =
    `당신은 K-pop 팬의 덕질 기록(러브트리) 노드를 '실제 영상 기반'으로 채우는 한국어 어시스턴트입니다.\n` +
    `다음 영상 정보를 바탕으로 노드 JSON 객체 하나를 만들어 주세요.\n` +
    `반드시 다음 필드를 포함하세요: title, date, videoId, description, moments\n` +
    `- title: 영상과 팬 관점에서 자연스럽게(너무 길지 않게)\n` +
    `- date: 영상 업로드일(YYYY-MM-DD). 모르면 빈 문자열\n` +
    `- videoId: 반드시 11글자 영상 ID\n` +
    `- description: 2~4문장 한국어 요약\n` +
    `- moments: time(M:SS), text(한국어), feeling(love|tear|funny|shock)로 이루어진 배열\n` +
    `moments의 time은 아래 자막에 등장하는 타임스탬프([M:SS]) 중에서만 선택하세요.\n` +
    `moments는 5~10개 정도로 만들어 주세요.\n` +
    `출력은 오직 JSON 객체 1개만 주세요(설명 문장/코드블록/추가 텍스트 금지).\n\n` +
    `기본 제목(참고): ${baseTitle || ''}\n` +
    (instruction ? `사용자 추가 요청: ${instruction}\n` : '') +
    `영상 제목: ${video.title || ''}\n` +
    `채널: ${video.channelTitle || ''}\n` +
    `업로드: ${video.publishedAt || ''}\n` +
    `videoId: ${video.videoId || ''}\n` +
    `영상 설명(일부): ${truncateText(video.description || '', 600)}\n\n` +
    (safeTranscript
      ? `자막(타임스탬프 포함, 일부):\n${safeTranscript}\n`
      : `자막을 가져오지 못했습니다. 영상 설명을 바탕으로 moments를 만들되 time은 0:00부터 적당히 분산해 주세요.\n`);

  const raw = await callGeminiText(prompt, env);
  const obj = safeJsonParse(raw);
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return null;
  }

  const date = obj.date || isoToDate(video.publishedAt || '');
  const out = {
    title: obj.title || baseTitle || video.title || '새 순간',
    date: date || '',
    videoId: obj.videoId || video.videoId || '',
    description: typeof obj.description === 'string' ? obj.description : '',
    moments: Array.isArray(obj.moments) ? obj.moments : [],
  };

  out.moments = out.moments
    .map((m) => {
      const time = m && m.time ? String(m.time) : '0:00';
      const text = m && m.text ? String(m.text) : '';
      const feeling = m && m.feeling ? String(m.feeling) : 'love';
      return { time, text, feeling };
    })
    .filter((m) => m.text && m.text.trim().length > 0);

  if (!out.moments.length && out.description) {
    out.moments = [{ time: '0:00', text: out.description, feeling: 'love' }];
  }

  return out;
}

function getApiKeys(env) {
  const raw = env.GEMINI_API_KEYS || env.GEMINI_API_KEY || '';
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function buildPromptBody(mode, data) {
  if (mode === 'tree') {
    const { prompt, count } = data || {};
    const safeCount = clampNumber(count || 4, 1, 12);
    const text =
      `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 필드는 title, searchQuery 입니다.\n` +
      `searchQuery는 YouTube에서 실제 영상을 찾기 위한 검색어(한국어)로 작성해 주세요.\n` +
      `출력은 오직 JSON 배열(문자열이 아닌 JSON 객체 배열)만 제공하세요.\n` +
      `한국어로 작성하세요.\n` +
      `사용자 설명: ${prompt || ''}`;
    return { text, count: safeCount };
  }

  if (mode === 'tree_skeleton') {
    const { prompt, count } = data || {};
    const safeCount = clampNumber(count || 4, 1, 12);
    const text =
      `당신은 K-pop 팬을 위한 타임라인 도우미입니다.\n` +
      `사용자의 설명을 바탕으로 ${safeCount}개의 중요한 순간을 시간순으로 제안해 주세요.\n` +
      `각 순간은 JSON 배열 원소 하나로, 필드는 title, searchQuery 입니다.\n` +
      `searchQuery는 YouTube에서 실제 영상을 찾기 위한 검색어(한국어)로 작성해 주세요.\n` +
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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const bodyReq = JSON.parse(event.body || '{}');
    const { mode, payload } = bodyReq;
    if (!mode || !payload) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'mode and payload are required' }),
      };
    }

    if (mode === 'youtube_search') {
      const ytKey = getYouTubeApiKey(process.env);
      if (!ytKey) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }),
        };
      }

      const queryRaw =
        (payload && (payload.query || payload.q || payload.prompt)) || '';
      const query = String(queryRaw || '').trim();
      if (!query) {
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ mode, result: [] }),
        };
      }

      const maxResults = clampNumber(payload && payload.maxResults ? payload.maxResults : 6, 1, 10);
      const list = await youtubeSearchVideos(query, ytKey, maxResults);

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ mode, result: list }),
      };
    }

    const keys = getApiKeys(process.env);
    if (!keys.length) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GEMINI_API_KEYS not configured' }),
      };
    }

    const promptBody = buildPromptBody(mode, payload);

    let result;
    if (mode === 'qa') {
      const rawText = await callGeminiText(promptBody.text, process.env);
      result = rawText;
    } else if (mode === 'tree_skeleton') {
      const rawText = await callGeminiText(promptBody.text, process.env);
      const skeleton = safeJsonParse(rawText);
      const list = Array.isArray(skeleton) ? skeleton : [];
      const safeCount = clampNumber((payload && payload.count) || promptBody.count || 4, 1, 12);
      result = list.slice(0, safeCount);
    } else if (mode === 'tree') {
      const ytKey = getYouTubeApiKey(process.env);
      if (!ytKey) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }),
        };
      }

      const rawText = await callGeminiText(promptBody.text, process.env);
      const skeleton = safeJsonParse(rawText);
      const list = Array.isArray(skeleton) ? skeleton : [];

      const safeCount = clampNumber((payload && payload.count) || promptBody.count || 4, 1, 12);
      const items = list.slice(0, safeCount);

      const built = [];
      for (const item of items) {
        const baseTitle = item && item.title ? String(item.title) : '';
        const rawPrompt = payload && payload.prompt ? String(payload.prompt) : '';
        const rawSearchQuery = item && item.searchQuery ? String(item.searchQuery) : '';
        const candidates = [
          rawSearchQuery,
          baseTitle,
          rawPrompt,
          `${baseTitle} 무대`,
          `${baseTitle} 직캠`,
          `${baseTitle} Mcountdown`,
          `${rawPrompt} 무대`,
        ]
          .map((v) => (v || '').trim())
          .filter((v, idx, arr) => v.length > 0 && arr.indexOf(v) === idx);

        let found = null;
        for (const q of candidates) {
          try {
            found = await youtubeSearchFirstVideo(q, ytKey);
          } catch (e) {
            found = null;
          }
          if (found && found.videoId) break;
        }

        if (!found || !found.videoId) {
          built.push({
            title: baseTitle || '새 순간',
            date: '',
            videoId: '',
            description: '',
            moments: [],
          });
          continue;
        }

        let details = null;
        try {
          details = await youtubeGetVideoDetails(found.videoId, ytKey);
        } catch (e) {
          details = found;
        }

        let transcriptText = '';
        try {
          transcriptText = await getTranscriptText(found.videoId);
        } catch (e) {
          transcriptText = '';
        }

        const nodeObj = await buildRealNodeFromVideo({
          baseTitle,
          instruction: '',
          video: details || found,
          transcriptText,
          env: process.env,
        });

        built.push(
          nodeObj || {
            title: baseTitle || (details && details.title) || '새 순간',
            date: isoToDate((details && details.publishedAt) || found.publishedAt || ''),
            videoId: found.videoId,
            description: truncateText((details && details.description) || found.description || '', 240),
            moments: [],
          }
        );
      }

      result = built;
    } else if (mode === 'node_edit') {
      const ytKey = getYouTubeApiKey(process.env);
      const node = payload && payload.node ? payload.node : {};
      const instruction = payload && payload.instruction ? String(payload.instruction) : '';
      const searchQuery = payload && payload.searchQuery ? String(payload.searchQuery) : '';
      const baseTitle = (node && node.title) ? String(node.title) : '';
      const videoId = (node && node.videoId) ? String(node.videoId) : '';

      let found = null;
      if (videoId) {
        found = { videoId };
      } else if (ytKey) {
        const query = searchQuery && searchQuery.trim().length
          ? searchQuery
          : (baseTitle && baseTitle.trim().length ? baseTitle : (instruction || ''));
        try {
          found = await youtubeSearchFirstVideo(query, ytKey);
        } catch (e) {
          found = null;
        }

        if (!found || !found.videoId) {
          const retryQuery = (searchQuery && searchQuery.trim().length)
            ? `${searchQuery} 무대`
            : (baseTitle && baseTitle.trim().length ? `${baseTitle} 무대` : '');
          if (retryQuery) {
            try {
              found = await youtubeSearchFirstVideo(retryQuery, ytKey);
            } catch (e) {
              found = null;
            }
          }
        }
      }

      let details = null;
      let transcriptText = '';
      if (found && found.videoId && ytKey) {
        try {
          details = await youtubeGetVideoDetails(found.videoId, ytKey);
        } catch (e) {
          details = found;
        }
        try {
          transcriptText = await getTranscriptText(found.videoId);
        } catch (e) {
          transcriptText = '';
        }
      }

      if (found && found.videoId) {
        let nodeObj = null;
        try {
          nodeObj = await buildRealNodeFromVideo({
            baseTitle,
            instruction,
            video: Object.assign({}, details || {}, { videoId: found.videoId }),
            transcriptText,
            env: process.env,
          });
        } catch (e) {
          nodeObj = null;
        }

        if (!nodeObj) {
          const rawText = await callGeminiText(promptBody.text, process.env);
          nodeObj = safeJsonParse(rawText) || {};
        }

        if (nodeObj && typeof nodeObj === 'object') {
          if (!nodeObj.videoId && !nodeObj.youtubeUrl) {
            nodeObj.videoId = found.videoId;
          }
          if (!nodeObj.title) {
            nodeObj.title = baseTitle || (details && details.title) || '새 순간';
          }
          if (!nodeObj.description) {
            nodeObj.description = (details && details.description)
              ? truncateText(details.description, 240)
              : '';
          }
        }

        result = nodeObj || {};
      } else {
        const rawText = await callGeminiText(promptBody.text, process.env);
        result = safeJsonParse(rawText) || rawText;
      }
    } else {
      const rawText = await callGeminiText(promptBody.text, process.env);
      result = safeJsonParse(rawText) || rawText;
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ mode, result }),
    };
  } catch (e) {
    console.error('ai-helper error:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
