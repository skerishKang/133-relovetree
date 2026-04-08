/**
 * AI Helper Pure Utilities
 * 외부 의존성이 없는 순수 헬퍼 함수들을 모은 모듈입니다.
 */

/**
 * 숫자를 최소/최대 범위 내로 제한
 */
function clampNumber(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * ISO 날짜 문자열을 YYYY-MM-DD 형식으로 변환
 */
function isoToDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const t = iso.split('T')[0];
  return t || '';
}

/**
 * 밀리초(ms)를 M:SS 형식의 문자열로 변환
 */
function msToTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 텍스트를 지정된 문자수 내로 자르고 요약 표시
 */
function truncateText(text, maxChars) {
  if (!text || typeof text !== 'string') return '';
  if (!Number.isFinite(maxChars) || maxChars <= 0) return text;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * 문자열에서 JSON 블록을 찾아 파싱 시도
 */
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

/**
 * YouTube API 요청을 위한 보안 및 Referer 헤더 생성
 */
function getYouTubeRequestHeaders(env) {
  const referer = (env.YOUTUBE_API_REFERER || env.URL || env.DEPLOY_PRIME_URL || '').trim();
  if (!referer) return undefined;
  return {
    Referer: referer,
    Origin: referer,
  };
}

module.exports = {
  clampNumber,
  isoToDate,
  msToTime,
  truncateText,
  safeJsonParse,
  getYouTubeRequestHeaders
};
