/**
 * Editor AI Utils
 * - YouTube API integration
 * - Performance estimation (localStorage)
 * - Formatting & Escaping
 */

// YouTube Data API v3 설정
const YOUTUBE_API_KEY = '';

/**
 * YouTube에서 영상을 검색하고 첫 번째 결과의 videoId를 반환
 * @param {string} query - 검색어
 * @returns {Promise<{videoId: string, title: string, description: string} | null>}
 */
async function searchYouTubeVideo(query) {
    if (!query || !YOUTUBE_API_KEY) return null;

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', query);
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', '1');
        url.searchParams.set('key', YOUTUBE_API_KEY);

        const response = await fetch(url.toString());
        if (!response.ok) {
            console.warn('[YouTube API] Search failed:', response.status);
            return null;
        }

        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description
            };
        }
        return null;
    } catch (error) {
        console.error('[YouTube API] Error:', error);
        return null;
    }
}

function getAiHelperEstimateKey(mode, count) {
    const safeMode = mode || 'unknown';
    const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
    return 'ai_estimate_' + safeMode + '_' + safeCount;
}

function readAiHelperEstimateMs(mode, count) {
    try {
        const raw = localStorage.getItem(getAiHelperEstimateKey(mode, count));
        const n = raw ? parseInt(raw, 10) : NaN;
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (e) {
        return 0;
    }
}

function writeAiHelperEstimateMs(mode, count, durationMs) {
    if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) return;
    try {
        const prev = readAiHelperEstimateMs(mode, count);
        const next = prev ? Math.round(prev * 0.7 + durationMs * 0.3) : Math.round(durationMs);
        localStorage.setItem(getAiHelperEstimateKey(mode, count), String(next));
    } catch (e) {
    }
}

function calcAiHelperDefaultEstimateMs(mode, count) {
    const c = Number.isFinite(count) && count > 0 ? count : 4;
    if (mode === 'tree') {
        return 8000 + c * 12000;
    }
    if (mode === 'node') {
        return 7000 + 15000;
    }
    if (mode === 'qa') {
        return 6000 + 6000;
    }
    return 15000;
}

function getAiHelperEstimateMs(mode, count) {
    const saved = readAiHelperEstimateMs(mode, count);
    return saved || calcAiHelperDefaultEstimateMs(mode, count);
}

function formatSeconds(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    if (s < 60) return s + '초';
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + '분 ' + r + '초';
}

function escapeHtmlForAi(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function (ch) {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '"') return '&quot;';
        if (ch === "'") return '&#39;';
        return ch;
    });
}
