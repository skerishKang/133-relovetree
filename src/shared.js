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
    
    // API and External URLs
    youtubeEmbed: 'https://www.youtube-nocookie.com/embed/',
    youtubeWatch: 'https://www.youtube.com/watch?v=',
    youtubeThumb: 'https://img.youtube.com/vi/',
    
    // Validation rules
    validation: {
        artistNameMax: 50,
        titleMax: 100,
        commentMax: 200,
        urlMax: 1000
    },
    
    // UI Configuration
    ui: {
        animation: {
            duration: {
                fast: 150,
                normal: 250,
                slow: 350
            }
        },
        modal: {
            backdropBlur: '4px',
            borderRadius: '1rem'
        }
    }
};

// ================== UTILITY FUNCTIONS ==================

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
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
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
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
    return `${APP_CONFIG.youtubeThumb}${videoId}/${quality}default.jpg`;
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

// ================== EVENT HANDLERS ==================

/**
 * Setup global error handling
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', function(e) {
        console.error('JavaScript Error:', e.error);
        showError('문제가 발생했습니다. 페이지를 새로고침해주세요.', 5000);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
        showError('예상치 못한 오류가 발생했습니다.', 5000);
    });
}

/**
 * Setup escape key handler for modals
 */
function setupModalKeyboardHandlers() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('dialog[open]');
            if (openModal) {
                openModal.close();
            }
        }
    });
}

// ================== INITIALIZATION ==================

/**
 * Initialize the application
 */
function initApp() {
    setupGlobalErrorHandling();
    setupModalKeyboardHandlers();
    
    // Add loaded class to body for CSS
    document.body.classList.add('app-loaded');
    
    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} initialized`);
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
        initApp
    };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}