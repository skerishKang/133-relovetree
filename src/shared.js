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

// ================== GLOBAL LAYOUT (JS 주입) ==================

function shouldInjectGlobalLayout() {
    try {
        if (typeof document === 'undefined') return false;
        const page = document.body ? String(document.body.getAttribute('data-page') || '') : '';
        if (page === 'editor') return false;
        return true;
    } catch (e) {
        return false;
    }
}

function buildGlobalHeaderHTML(active) {
    const a = active || '';
    const isCommunity = a === 'community';
    const isOwner = a === 'owner';

    const communityClass = isCommunity
        ? 'inline-flex items-center text-sm font-semibold text-brand-600'
        : 'inline-flex items-center text-sm font-medium text-slate-600 hover:text-brand-600';
    const ownerClass = isOwner
        ? 'inline-flex items-center text-sm font-semibold text-brand-600'
        : 'inline-flex items-center text-sm font-medium text-slate-600 hover:text-brand-600';

    return `
    <nav data-global-header="1" class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40" role="navigation" aria-label="메인 네비게이션">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <a href="index.html" class="flex items-center gap-3 hover:opacity-95 transition">
                    <div class="w-8 h-8 rounded-2xl bg-brand-500 text-white text-sm font-bold flex items-center justify-center shadow-sm" aria-hidden="true">L</div>
                    <div class="flex flex-col leading-tight">
                        <span class="text-sm font-semibold tracking-tight text-slate-800">LoveTree</span>
                        <span class="hidden sm:block text-xs text-slate-500 leading-tight">나의 덕질 타임라인</span>
                    </div>
                </a>
                <a href="community.html" class="${communityClass}">커뮤니티</a>
                <a href="owner.html" class="${ownerClass}">내 트리 관리</a>
            </div>
            <div class="flex items-center gap-2">
                <a href="index.html#search" class="flex items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-slate-200 shadow-sm hover:bg-slate-100 text-slate-600 hover:text-brand-600 transition-colors" title="검색" aria-label="검색">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </a>
                <button id="global-settings-btn" type="button" class="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors" title="마이" aria-label="마이">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span class="hidden sm:inline">마이</span>
                </button>
            </div>
        </div>
    </nav>
    `;
}

function buildGlobalMyModalHTML() {
    return `
    <dialog id="settings-modal" class="p-0 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-900">마이</h3>
                <button type="button" onclick="closeModal('settings-modal')" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="마이 닫기">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-6">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">계정</label>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div class="flex flex-col gap-2">
                            <button id="login-btn" type="button" class="w-full px-4 py-3 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">구글로 로그인</button>
                            <a id="email-login-link" href="login.html" class="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-center">이메일로 로그인</a>
                            <div id="user-menu" class="hidden flex flex-col gap-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <img id="user-avatar" src="" alt="Profile" class="w-10 h-10 rounded-full bg-white border border-slate-200" />
                                        <div class="min-w-0">
                                            <p class="text-sm font-bold text-slate-800 truncate" id="user-name"></p>
                                            <p class="text-xs text-slate-500 truncate">로그인됨</p>
                                        </div>
                                    </div>
                                    <a href="admin.html" id="admin-link" class="hidden text-xs font-bold text-slate-500 hover:text-brand-600">관리자</a>
                                </div>
                                <button id="logout-btn" type="button" class="w-full px-4 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-red-500 transition-colors">로그아웃</button>
                            </div>
                        </div>
                        <p class="mt-3 text-xs text-slate-500">로그인하면 내가 만든 러브트리를 계정에 저장하고, 다른 기기에서도 이어서 볼 수 있어요.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">메뉴</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <a href="index.html#search" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left sm:col-span-2">검색</a>
                        <a href="index.html#recent-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">최근 방문한 트리</a>
                        <a href="index.html#discovery-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">지금 뜨는 러브트리</a>
                        <a href="index.html#my-created-trees-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">내 러브트리</a>
                        <a href="owner.html" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">내 트리 관리</a>
                        <a href="community.html" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">커뮤니티</a>
                        <a href="index.html#my-theme-anchor" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left sm:col-span-2">테마 설정</a>
                    </div>
                </div>
            </div>
        </div>
    </dialog>
    `;
}

function ensureGlobalLayoutInjected() {
    try {
        if (!shouldInjectGlobalLayout()) return;
        if (!document.body) return;
        if (document.querySelector('nav[data-global-header="1"]')) return;

        const page = document.body ? String(document.body.getAttribute('data-page') || '') : '';
        const active = page === 'community' ? 'community' : (page === 'owner' ? 'owner' : '');

        const headerHTML = buildGlobalHeaderHTML(active);
        const temp = document.createElement('div');
        temp.innerHTML = headerHTML;
        const nav = temp.firstElementChild;
        if (nav) {
            document.body.insertBefore(nav, document.body.firstChild);
        }

        if (!document.getElementById('settings-modal')) {
            const modalWrap = document.createElement('div');
            modalWrap.innerHTML = buildGlobalMyModalHTML();
            const modalEl = modalWrap.firstElementChild;
            if (modalEl) document.body.appendChild(modalEl);
        }

        const btn = document.getElementById('global-settings-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                const modal = document.getElementById('settings-modal');
                if (!modal) return;
                try {
                    if (typeof modal.showModal === 'function') modal.showModal();
                    else modal.setAttribute('open', 'open');
                } catch (e) {
                }
            });
        }
    } catch (e) {
    }
}

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
function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else {
            element.setAttribute(key, value);
        }
    });

    if (content) {
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (typeof child === 'string') {
                    element.innerHTML += child;
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }
    }

    return element;
}

/**
 * Show error message
 * @param {string} message - Error message to show
 * @param {number} duration - Duration in milliseconds (0 for persistent)
 */
function showError(message, duration = 5000) {
    let errorDiv = document.getElementById('error-message');

    if (!errorDiv) {
        errorDiv = createElement('div', {
            id: 'error-message',
            className: 'hidden fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-4',
            role: 'alert',
            'aria-live': 'polite'
        });

        const errorText = createElement('span', { id: 'error-text' });
        const closeBtn = createElement('button', {
            className: 'text-white hover:text-red-200',
            'aria-label': '오류 메시지 닫기'
        });
        closeBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        closeBtn.onclick = hideError;

        errorDiv.append(errorText, closeBtn);
        document.body.appendChild(errorDiv);
    }

    const errorText = errorDiv.querySelector('#error-text');
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');

    if (duration > 0) {
        setTimeout(hideError, duration);
    }
}

/**
 * Hide error message
 */
function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

/**
 * Close modal and reset form
 * @param {string} modalId - ID of modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.close();
        // Clear validation errors
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            clearValidationErrors(form);
        }
    }
}

/**
 * Clear validation errors from form
 * @param {HTMLFormElement} form - Form to clear errors from
 */
function clearValidationErrors(form) {
    if (!form) return;

    form.querySelectorAll('.error-message').forEach(el => el.remove());
    form.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
    form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.setAttribute('aria-invalid', 'false'));
}

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
function safeLocalStorageSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn('localStorage set failed:', error);
        return false;
    }
}

/**
 * Safe localStorage get with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} - Stored value or default
 */
function safeLocalStorageGet(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.warn('localStorage get failed:', error);
        return defaultValue;
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} - Success status
 */
function safeLocalStorageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn('localStorage remove failed:', error);
        return false;
    }
}

function applyGlobalBackgroundPreference() {
    try {
        if (typeof document === 'undefined' || !document.body) return;
        const config = safeLocalStorageGet('relovetree_background', null);
        if (!config || !config.type || !config.value) return;

        const body = document.body;
        if (config.type === 'image') {
            body.style.backgroundImage = `url('${config.value}')`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundAttachment = 'fixed';
            body.style.backgroundColor = '';
        } else if (config.type === 'color') {
            body.style.backgroundImage = 'none';
            body.style.backgroundColor = config.value;
        }
    } catch (e) {
        console.warn('applyGlobalBackgroundPreference failed:', e);
    }
}

function bindGlobalBackgroundPreferenceSync() {
    try {
        if (typeof window === 'undefined') return;
        window.addEventListener('storage', function (e) {
            if (!e) return;
            if (e.key === 'relovetree_background') {
                applyGlobalBackgroundPreference();
            }
        });
    } catch (e) {
    }
}

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
        showError('문제가 발생했습니다. 페이지를 새로고침해주세요.', 5000);
    });

    window.addEventListener('unhandledrejection', function (e) {
        console.error('Unhandled Promise Rejection:', e.reason);
        showError('예상치 못한 오류가 발생했습니다.', 5000);
    });
}

/**
 * Setup escape key handler for modals
 */
function setupModalKeyboardHandlers() {
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('dialog[open]');
            if (openModal) {
                openModal.close();
            }
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
    setupGlobalErrorHandling();
    setupModalKeyboardHandlers();
    initFirebase();

    ensureGlobalLayoutInjected();

    applyGlobalBackgroundPreference();
    bindGlobalBackgroundPreferenceSync();
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
        createElement,
        showError,
        hideError,
        closeModal,
        clearValidationErrors,
        parseYouTubeId,
        getYouTubeThumb,
        getYouTubeEmbed,
        timeToSeconds,
        secondsToTime,
        safeLocalStorageSet,
        safeLocalStorageGet,
        safeLocalStorageRemove,
        setupGlobalErrorHandling,
        setupModalKeyboardHandlers,
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