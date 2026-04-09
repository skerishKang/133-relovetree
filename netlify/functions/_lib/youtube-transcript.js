const { msToTime } = require('./ai-helper-utils');

/**
 * YouTube 내부 API(timedtext)를 사용하여 자막 JSON3 데이터 가져오기
 */
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

/**
 * JSON3 이벤트를 타임스탬프가 포함된 텍스트 라인 배열로 변환
 */
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

/**
 * 비디오 ID를 기반으로 한국어(우선) 또는 영어 자막 합치기
 */
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
  fetchTimedTextJson3,
  buildTranscriptLines,
  getTranscriptText,
};
