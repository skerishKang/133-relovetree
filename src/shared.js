/**
 * Lovetree - Shared JavaScript utilities and configurations
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
        
        return false;
    }

    if (!firebase.apps || !firebase.apps.length) {
        try {
            // Priority: window.APP_CONFIG (most reliable in browser) > APP_CONFIG variable
            const config = (window.APP_CONFIG ? window.APP_CONFIG.firebase : null) || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.firebase : null);
            
            if (!config || !config.apiKey) {
                console.error('Firebase config missing or invalid in shared.js');
                return false;
            }
            
firebase.initializeApp(config);
    return true;
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                return true;
            }
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }
    return true;
}

// Export for explicit calls if needed
if (typeof window !== 'undefined') {
    window.initFirebase = initFirebase;
}

function initFirebaseAppCheck() {
    try {
        if (typeof window === 'undefined' || typeof firebase === 'undefined') return false;
        if (!firebase.apps || !firebase.apps.length) {
            // Do not call firebase.appCheck() if no apps initialized, it throws No App error
            return false;
        }

        const config = window.RELOVETREE_APP_CHECK_CONFIG || {};
        const siteKey = String(config.siteKey || '').trim();
        const autoRefresh = config.autoRefreshToken !== false;

        if (!siteKey) return false;
        if (typeof firebase.appCheck !== 'function') {
            return false;
        }

        const appCheck = firebase.appCheck();
        if (appCheck && typeof appCheck.activate === 'function') {
            appCheck.activate(siteKey, autoRefresh);
            return true;
        }
    } catch (error) {
        console.warn('Firebase App Check initialization skipped:', error);
    }
    return false;
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
    initFirebaseAppCheck();

    if (typeof sharedLayout.ensureGlobalLayoutInjected === 'function') {
        sharedLayout.ensureGlobalLayoutInjected();
    }

    if (typeof sharedTheme.applyGlobalBackgroundPreference === 'function') {
        sharedTheme.applyGlobalBackgroundPreference();
    }
    if (typeof sharedTheme.bindGlobalBackgroundPreferenceSync === 'function') {
        sharedTheme.bindGlobalBackgroundPreferenceSync();
    }
    // Add loaded class to body for CSS
    document.body.classList.add('app-loaded');

const appName = (window.APP_CONFIG && window.APP_CONFIG.appName) || 'Lovetree';
  const appVersion = (window.APP_CONFIG && window.APP_CONFIG.version) || '1.0.0';
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

        const db = window.postgresDB;
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
if (typeof window !== 'undefined') {
    // Initialize primary services immediately to avoid race conditions with other scripts
    initFirebase();
    initFirebaseAppCheck();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}
