const { getCorsHeaders } = require('./_lib/http');

function getYouTubeApiKey(env) {
  return (env.YOUTUBE_API_KEY || '').trim();
}

const {
  clampNumber,
  safeJsonParse,
} = require('./_lib/ai-helper-utils');
const {
  buildRealNodeFromVideo: clientBuildRealNodeFromVideo,
  buildPromptBody: clientBuildPromptBody,
} = require('./_lib/ai-prompts');
const {
  getTranscriptText: clientGetTranscriptText,
} = require('./_lib/youtube-transcript');
const {
  getApiKeys,
  callGeminiText: clientCallGeminiText,
} = require('./_lib/gemini-client');
const {
  getApiKey: getGroqApiKey,
  callGroqText: clientCallGroqText,
  getAiProvider,
} = require('./_lib/groq-client');
const {
  youtubeSearchFirstVideo: clientSearchFirstVideo,
  youtubeSearchVideos: clientSearchVideos,
  youtubeGetVideoDetails: clientGetVideoDetails,
} = require('./_lib/youtube-client');

async function youtubeSearchFirstVideo(query, apiKey) {
  return clientSearchFirstVideo(query, apiKey, process.env);
}

async function youtubeSearchVideos(query, apiKey, maxResults) {
  return clientSearchVideos(query, apiKey, maxResults, process.env);
}

async function youtubeGetVideoDetails(videoId, apiKey) {
  return clientGetVideoDetails(videoId, apiKey, process.env);
}

async function getTranscriptText(videoId) {
  return clientGetTranscriptText(videoId);
}

async function callGeminiText(promptText, env) {
  return clientCallGeminiText(promptText, env);
}

/**
 * Universal AI text call with provider fallback
 * - If AI_PROVIDER=groq: try Groq first, fallback to Gemini
 * - If AI_PROVIDER=gemini: try Gemini first
 */
async function callAiText(promptText, env) {
  const provider = getAiProvider(env);
  
  if (provider === 'groq') {
    try {
      const groqApiKey = getGroqApiKey(env);
      if (groqApiKey) {
        return await clientCallGroqText(promptText, env);
      }
    } catch (e) {
      console.warn('Groq failed, trying Gemini fallback:', e.message);
    }
  }
  
  // Fallback to Gemini
  return clientCallGeminiText(promptText, env);
}


async function buildRealNodeFromVideo(opts) {
  return clientBuildRealNodeFromVideo(opts, callAiText);
}

function buildPromptBody(mode, data) {
  return clientBuildPromptBody(mode, data);
}

exports.handler = async (event, context) => {
  const requestOrigin = event && event.headers ? (event.headers.origin || event.headers.Origin || '') : '';

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(requestOrigin),
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
          headers: getCorsHeaders(requestOrigin),
          body: JSON.stringify({ mode, result: [] }),
        };
      }

      const maxResults = clampNumber(payload && payload.maxResults ? payload.maxResults : 6, 1, 10);
      const list = await youtubeSearchVideos(query, ytKey, maxResults, process.env);

      return {
        statusCode: 200,
        headers: getCorsHeaders(requestOrigin),
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
      const rawText = await callAiText(promptBody.text, process.env);
      result = rawText;
    } else if (mode === 'tree_skeleton') {
      const rawText = await callAiText(promptBody.text, process.env);
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

      const rawText = await callAiText(promptBody.text, process.env);
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
            found = await youtubeSearchFirstVideo(q, ytKey, process.env);
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
          details = await youtubeGetVideoDetails(found.videoId, ytKey, process.env);
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
      const searchFallbackQueries = Array.isArray(payload && payload.searchFallbackQueries)
        ? payload.searchFallbackQueries
          .map((q) => (q == null ? '' : String(q).trim()))
          .filter((q) => q.length > 0)
          .slice(0, 6)
        : [];
      const baseTitle = (node && node.title) ? String(node.title) : '';
      const videoId = (node && node.videoId) ? String(node.videoId) : '';

      let found = null;
      if (videoId) {
        found = { videoId };
      } else if (ytKey) {
        const candidates = [];
        const trimmedSearch = searchQuery ? searchQuery.trim() : '';
        const trimmedTitle = baseTitle ? baseTitle.trim() : '';

        if (trimmedSearch) candidates.push(trimmedSearch);
        searchFallbackQueries.forEach((q) => {
          if (q && !candidates.includes(q)) candidates.push(q);
        });
        if (trimmedTitle) candidates.push(trimmedTitle);
        if (trimmedSearch) candidates.push(`${trimmedSearch} 무대`);
        if (trimmedSearch) candidates.push(`${trimmedSearch} 직캠`);
        if (trimmedTitle) candidates.push(`${trimmedTitle} 무대`);

        const safeCandidates = candidates
          .map((q) => (q == null ? '' : String(q).trim()))
          .filter((q) => q.length > 0)
          .slice(0, 8);

        // eslint-disable-next-line no-restricted-syntax
        for (const q of safeCandidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
            found = await youtubeSearchFirstVideo(q, ytKey, process.env);
          } catch (e) {
            found = null;
          }
          if (found && found.videoId) break;
        }
      }

      let details = null;
      let transcriptText = '';
      if (found && found.videoId && ytKey) {
        try {
          details = await youtubeGetVideoDetails(found.videoId, ytKey, process.env);
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
          const rawText = await callAiText(promptBody.text, process.env);
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
        const rawText = await callAiText(promptBody.text, process.env);
        result = safeJsonParse(rawText) || rawText;
      }
    } else {
      const rawText = await callAiText(promptBody.text, process.env);
      result = safeJsonParse(rawText) || rawText;
    }

    return {
      statusCode: 200,
      headers: getCorsHeaders(requestOrigin),
      body: JSON.stringify({ mode, result }),
    };
  } catch (e) {
    console.error('ai-helper error:', e);
    return {
      statusCode: 500,
      headers: getCorsHeaders(requestOrigin),
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
