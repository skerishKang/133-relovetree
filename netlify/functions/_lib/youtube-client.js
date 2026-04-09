const {
  clampNumber,
  msToTime,
  getYouTubeRequestHeaders,
} = require('./ai-helper-utils');

/**
 * YouTube API: 첫 번째 검색 결과 가져오기
 */
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

/**
 * YouTube API: 여러 검색 결과 가져오기
 */
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

/**
 * YouTube API: 비디오 상세 정보 가져오기
 */
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

module.exports = {
  youtubeSearchFirstVideo,
  youtubeSearchVideos,
  youtubeGetVideoDetails
};
