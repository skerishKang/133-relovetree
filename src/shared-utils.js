/**
 * Relovetree - Shared utility functions and pure configurations
 * Extracted from shared.js to maintain code quality and reduce duplication
 */

// ================== CONFIGURATION ==================
const APP_CONFIG = {
    // App metadata
    appName: 'Relovetree',
    version: '1.0.0',
    author: 'skerishKang',

    // Firebase Configuration
    firebase: {
        apiKey: "AIzaSyDQNR8bNIp4LG4EGNwl1ew8B7Har-KJC90",
        authDomain: "relovetree.firebaseapp.com",
        projectId: "relovetree",
        storageBucket: "relovetree.firebasestorage.app",
        messagingSenderId: "1091063063536",
        appId: "1:1091063063536:web:065a746e2578c47dd7b335",
        measurementId: "G-D4R5XMGFK5"
    },

    // Validation limits
    validation: {
        artistNameMax: 50
    },

    // YouTube
    defaultThumbnail: 'https://placehold.co/640x360/f8fafc/94a3b8?text=Relovetree',
    youtubeEmbed: 'https://www.youtube.com/embed/'
};

/**
 * Debounce function to limit function execution frequency
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        const later = function () {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Safe JSON parsing with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} - Parsed object or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('JSON parsing failed:', error);
        return fallback;
    }
}

/**
 * Deep clone object using JSON methods
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted size string
 */
function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ================== STRING & VALIDATION ==================

/**
 * Validate artist name
 * @param {string} name - Artist name to validate
 * @param {boolean} isKorean - Whether to use Korean error messages
 * @returns {string|null} - Error message or null if valid
 */
function validateArtistName(name, isKorean = true) {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return isKorean ? '아티스트 이름을 입력해주세요.' : 'Please enter an artist name.';
    }

    if (trimmed.length > APP_CONFIG.validation.artistNameMax) {
        return isKorean
            ? `아티스트 이름은 ${APP_CONFIG.validation.artistNameMax}자 이하로 입력해주세요.`
            : `Artist name must be ${APP_CONFIG.validation.artistNameMax} characters or less.`;
    }

    // Check for valid characters (Korean, English, numbers, spaces, some special chars)
    if (!/^[가-힣\sa-zA-Z0-9._-]+$/.test(trimmed)) {
        return isKorean ? '사용할 수 없는 문자가 포함되어 있습니다.' : 'Invalid characters included.';
    }

    return null;
}

/**
 * Validate YouTube URL
 * @param {string} url - YouTube URL to validate
 * @returns {string|null} - Extracted video ID or null if invalid
 */
function validateYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return null;

    const patterns = [
        /(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^"&?\/\s]{11})/,
        /youtube\.com\/embed\/([^"&?\/\s]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

/**
 * Validate time format (MM:SS or HH:MM:SS)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} - Whether valid
 */
function validateTimeFormat(timeString) {
    if (!timeString) return false;

    const parts = timeString.split(':').map(Number);

    if (parts.length === 2) {
        // MM:SS format
        return parts[0] >= 0 && parts[0] < 60 && parts[1] >= 0 && parts[1] < 60;
    } else if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] >= 0 && parts[1] >= 0 && parts[1] < 60 && parts[2] >= 0 && parts[2] < 60;
    }

    return false;
}

// ================== URL PARSING & YOUTUBE ==================

/**
 * Parse YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
function parseYouTubeId(url) {
    return validateYouTubeUrl(url);
}

/**
 * Generate YouTube thumbnail URL
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Image quality (default, hqdefault, mqdefault)
 * @returns {string} - Thumbnail URL
 */
function getYouTubeThumb(videoId, quality = 'hqdefault') {
    if (!videoId) {
        return APP_CONFIG.defaultThumbnail;
    }

    const normalizedQuality = quality.endsWith('.jpg') ? quality : `${quality}.jpg`;
    const hostname = 'https://img.youtube.com/vi/';
    const thumbUrl = `${hostname}${videoId}/${normalizedQuality}`;

    // Add defensive fallback: if thumbnail request fails after retries, use default placeholder image from app config
    const img = new Image();
    img.src = thumbUrl;
    let retries = 0;
    const maxRetries = 3;
    img.onerror = function () {
        retries++;
        if (retries < maxRetries) {
            img.src = thumbUrl;
        } else {
            img.src = APP_CONFIG.defaultThumbnail;
        }
    };

    return thumbUrl;
}

/**
 * Generate YouTube embed URL
 * @param {string} videoId - YouTube video ID
 * @param {Object} params - Additional parameters
 * @returns {string} - Embed URL
 */
function getYouTubeEmbed(videoId, params = {}) {
    const defaultParams = {
        playsinline: 1,
        rel: 0,
        modestbranding: 1
    };

    const searchParams = new URLSearchParams({ ...defaultParams, ...params });
    return `${APP_CONFIG.youtubeEmbed}${videoId}?${searchParams.toString()}`;
}

/**
 * Convert time string to seconds
 * @param {string} timeString - Time in MM:SS or HH:MM:SS format
 * @returns {number} - Seconds
 */
function timeToSeconds(timeString) {
    if (!validateTimeFormat(timeString)) return 0;

    const parts = timeString.split(':').map(Number);
    let seconds = 0;

    if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return seconds;
}

/**
 * Format seconds to time string
 * @param {number} seconds - Seconds to format
 * @returns {string} - Formatted time string
 */
function secondsToTime(seconds) {
    if (seconds < 0 || !Number.isFinite(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ================== MISC / DATA PARSING ==================

function normalizeToIsoStringForFork(value) {
    try {
        if (!value) return '';
        if (value && typeof value.toDate === 'function') {
            return value.toDate().toISOString();
        }
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toISOString();
    } catch (e) {
        return value ? String(value) : '';
    }
}

function extractTreeIdFromMaybeUrl(value) {
    try {
        const raw = String(value || '').trim();
        if (!raw) return '';

        const m = raw.match(/[?&]id=([^&#\s]+)/i);
        if (m && m[1]) {
            try {
                return decodeURIComponent(m[1]);
            } catch (e) {
                return String(m[1]);
            }
        }

        if (/\s/.test(raw)) return '';
        if (raw.includes('/')) return '';
        return raw;
    } catch (e) {
        return '';
    }
}

// ================== EXPORTS ==================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APP_CONFIG,
        debounce,
        throttle,
        safeJsonParse,
        deepClone,
        formatFileSize,
        validateArtistName,
        validateYouTubeUrl,
        validateTimeFormat,
        parseYouTubeId,
        getYouTubeThumb,
        getYouTubeEmbed,
        timeToSeconds,
        secondsToTime,
        normalizeToIsoStringForFork,
        extractTreeIdFromMaybeUrl
    };
}
