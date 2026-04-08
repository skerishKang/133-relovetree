/**
 * Relovetree - Shared JavaScript utilities and configurations
 * Maintains code quality and reduces duplication across files
 */

// If running in Node, we might need to require shared-utils.js to make APP_CONFIG available
if (typeof module !== 'undefined' && module.exports && typeof APP_CONFIG === 'undefined') {
    // Node.js environment fallback
    try {
        const utils = require('./shared-utils.js');
        Object.assign(global, utils); // Make them available globally like in browser
    } catch(e) {}
}

const sharedDom = (typeof window !== 'undefined' && window.ReloveSharedDom) ? window.ReloveSharedDom : {};
const sharedStorage = (typeof window !== 'undefined' && window.ReloveSharedStorage) ? window.ReloveSharedStorage : {};
const sharedTheme = (typeof window !== 'undefined' && window.ReloveSharedTheme) ? window.ReloveSharedTheme : {};
const sharedLayout = (typeof window !== 'undefined' && window.ReloveSharedLayout) ? window.ReloveSharedLayout : {};
const SHARED_APP_INIT_FLAG = '__relovetreeSharedAppInitialized';

// ================== DOM UTILITIES ==================

/**
 * Create element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Attributes object
 * @param {string|Node|Node[]} content - Content
 * @returns {HTMLElement} - Created element
 */
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
            // APP_CONFIG is now from shared-utils.js
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
        // extractTreeIdFromMaybeUrl is from shared-utils.js
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
        // normalizeToIsoStringForFork is from shared-utils.js
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
        // Re-export what was extracted for backwards compatibility in tests if necessary
        ...(typeof APP_CONFIG !== 'undefined' ? {
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
            secondsToTime
        } : {}),
        createElement: sharedDom.createElement,
        showError: sharedDom.showError,
        hideError: sharedDom.hideError,
        closeModal: sharedDom.closeModal,
        clearValidationErrors: sharedDom.clearValidationErrors,
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
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}
