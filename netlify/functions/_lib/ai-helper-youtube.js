const {
  clampNumber,
  msToTime,
  getYouTubeRequestHeaders,
} = require('./ai-helper-utils');

async function youtubeSearchFirstVideo(query, apiKey, env) {
  if (!query || !apiKey) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(env),
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

async function youtubeSearchVideos(query, apiKey, maxResults, env) {
  if (!query || !apiKey) return [];
  const safeMax = clampNumber(maxResults || 6, 1, 10);

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(safeMax));
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(env),
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

async function youtubeGetVideoDetails(videoId, apiKey, env) {
  if (!videoId || !apiKey) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), {
    headers: getYouTubeRequestHeaders(env),
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

module.exports = {
  youtubeSearchFirstVideo,
  youtubeSearchVideos,
  youtubeGetVideoDetails,
  fetchTimedTextJson3,
  buildTranscriptLines,
  getTranscriptText,
};
