/**
 * Relovetree - Shared JavaScript utilities and configurations
 * Maintains code quality and reduces duplication across files
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

const sharedDom = (typeof window !== 'undefined' && window.ReloveSharedDom) ? window.ReloveSharedDom : {};
const sharedStorage = (typeof window !== 'undefined' && window.ReloveSharedStorage) ? window.ReloveSharedStorage : {};
const sharedTheme = (typeof window !== 'undefined' && window.ReloveSharedTheme) ? window.ReloveSharedTheme : {};
const sharedLayout = (typeof window !== 'undefined' && window.ReloveSharedLayout) ? window.ReloveSharedLayout : {};
const SHARED_APP_INIT_FLAG = '__relovetreeSharedAppInitialized';

// ================== VALIDATION ==================

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

// ================== DOM UTILITIES ==================

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Attributes object
 * @param {string|Node|Node[]} content - Content
 * @returns {HTMLElement} - Created element
 */
// ================== URL PARSING ==================

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

// ================== LOCAL STORAGE ==================

/**
 * Safe localStorage set with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} - Success status
 */
function registerPwaServiceWorker() {
    try {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isSecure) return;

        navigator.serviceWorker.register('/sw.js').catch(function () {
        });
    } catch (e) {
    }
}

// ================== EVENT HANDLERS ==================

/**
 * Setup global error handling
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', function (e) {
        console.error('JavaScript Error:', e.error);
        if (typeof sharedDom.showError === 'function') {
            sharedDom.showError('문제가 발생했습니다. 페이지를 새로고침해주세요.', 5000);
        }
    });

    window.addEventListener('unhandledrejection', function (e) {
        console.error('Unhandled Promise Rejection:', e.reason);
        if (typeof sharedDom.showError === 'function') {
            sharedDom.showError('예상치 못한 오류가 발생했습니다.', 5000);
        }
    });
}

/**
 * Initialize Firebase
 */
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return false;
    }

    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(APP_CONFIG.firebase);
            console.log('Firebase initialized via shared.js');
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }
    return true;
}

/**
 * Initialize the application
 */
function initApp() {
    if (typeof window !== 'undefined' && window[SHARED_APP_INIT_FLAG]) {
        return;
    }
    if (typeof window !== 'undefined') {
        window[SHARED_APP_INIT_FLAG] = true;
    }

    setupGlobalErrorHandling();
    if (typeof sharedDom.setupModalKeyboardHandlers === 'function') {
        sharedDom.setupModalKeyboardHandlers();
    }
    initFirebase();

    if (typeof sharedLayout.ensureGlobalLayoutInjected === 'function') {
        sharedLayout.ensureGlobalLayoutInjected();
    }

    if (typeof sharedTheme.applyGlobalBackgroundPreference === 'function') {
        sharedTheme.applyGlobalBackgroundPreference();
    }
    if (typeof sharedTheme.bindGlobalBackgroundPreferenceSync === 'function') {
        sharedTheme.bindGlobalBackgroundPreferenceSync();
    }
    registerPwaServiceWorker();

    // Add loaded class to body for CSS
    document.body.classList.add('app-loaded');

    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} initialized`);
}

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

async function forkTreeToMyAccountBySourceTreeId(sourceTreeId) {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
            return { ok: false, error: 'Firebase를 사용할 수 없습니다.' };
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            return { ok: false, error: '로그인이 필요합니다.' };
        }

        const db = firebase.firestore();
        const normalizedSourceId = extractTreeIdFromMaybeUrl(sourceTreeId);
        if (!normalizedSourceId) {
            return { ok: false, error: '트리 ID가 올바르지 않습니다.' };
        }

        const sourceRef = db.collection('trees').doc(normalizedSourceId);
        const sourceSnap = await sourceRef.get();
        if (!sourceSnap.exists) {
            return { ok: false, error: '원본 트리를 찾을 수 없습니다.' };
        }

        const sourceData = sourceSnap.data() || {};
        if (sourceData.ownerId && sourceData.ownerId === user.uid) {
            return { ok: false, error: '이미 내 트리입니다.' };
        }

        const nowIso = new Date().toISOString();
        const sourceLastUpdated = normalizeToIsoStringForFork(sourceData.lastUpdated);
        const nodes = Array.isArray(sourceData.nodes) ? sourceData.nodes : [];
        const edges = Array.isArray(sourceData.edges) ? sourceData.edges : [];
        const sourceName = sourceData.name || normalizedSourceId;

        const newDocRef = db.collection('trees').doc();
        await newDocRef.set({
            name: sourceName,
            ownerId: user.uid,
            nodes,
            edges,
            nodeCount: nodes.length,
            lastUpdated: nowIso,
            forkedFrom: {
                treeId: normalizedSourceId,
                ownerId: sourceData.ownerId || null,
                sourceLastUpdated,
                forkedAt: nowIso
            }
        }, { merge: true });

        return {
            ok: true,
            newTreeId: newDocRef.id,
            sourceTreeId: normalizedSourceId,
            sourceOwnerId: sourceData.ownerId || null
        };
    } catch (e) {
        console.error('forkTreeToMyAccountBySourceTreeId 실패:', e);
        return { ok: false, error: '가져오기 실패' };
    }
}

// ================== EXPORTS ==================

// Export for use in other files
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
        createElement: sharedDom.createElement,
        showError: sharedDom.showError,
        hideError: sharedDom.hideError,
        closeModal: sharedDom.closeModal,
        clearValidationErrors: sharedDom.clearValidationErrors,
        parseYouTubeId,
        getYouTubeThumb,
        getYouTubeEmbed,
        timeToSeconds,
        secondsToTime,
        safeLocalStorageSet: sharedStorage.safeLocalStorageSet,
        safeLocalStorageGet: sharedStorage.safeLocalStorageGet,
        safeLocalStorageRemove: sharedStorage.safeLocalStorageRemove,
        setupGlobalErrorHandling,
        setupModalKeyboardHandlers: sharedDom.setupModalKeyboardHandlers,
        forkTreeToMyAccountBySourceTreeId,
        initApp
    };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
