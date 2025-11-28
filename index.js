/**
 * Relovetree - Main Index Page Logic
 * Shared utilities are imported from shared.js
 */

// ================== DATA AND CONSTANTS ==================

/**
 * Popular artists data - centralized for consistency
 */
const POPULAR_ARTISTS = [
    {
        id: 'bts',
        name: '방탄소년단',
        englishName: 'BTS',
        category: 'Legend',
        thumbnail: 'https://img.youtube.com/vi/gwMa6gpoE9I/hqdefault.jpg',
        moments: 108,
        lastUpdate: '방금 전',
        color: 'purple'
    },
    {
        id: 'seventeen',
        name: '세븐틴',
        englishName: 'Seventeen',
        category: 'Group',
        thumbnail: 'https://img.youtube.com/vi/9M7k9ZV67c0/hqdefault.jpg',
        moments: 95,
        lastUpdate: '2시간 전',
        color: 'blue'
    },
    {
        id: 'straykids',
        name: '스트레이 키즈',
        englishName: 'Stray Kids',
        category: 'Group',
        thumbnail: 'https://img.youtube.com/vi/EaswWiwMVs8/hqdefault.jpg',
        moments: 87,
        lastUpdate: '4시간 전',
        color: 'red'
    },
    {
        id: 'leejunyoung',
        name: '이준영',
        englishName: 'Lee Jun-young',
        category: 'Solo',
        thumbnail: 'https://img.youtube.com/vi/gwMa6gpoE9I/hqdefault.jpg',
        moments: 23,
        lastUpdate: '6시간 전',
        color: 'green'
    },
    {
        id: 'hearts2hearts',
        name: '하츠투하츠',
        englishName: 'Hearts2Hearts',
        category: 'Group',
        thumbnail: 'https://img.youtube.com/vi/9M7k9ZV67c0/hqdefault.jpg',
        moments: 45,
        lastUpdate: '1시간 전',
        color: 'pink'
    },
    {
        id: 'illit',
        name: '아일릿',
        englishName: 'ILLIT',
        category: 'Group',
        thumbnail: 'https://img.youtube.com/vi/uyRMRbWAUro/hqdefault.jpg',
        moments: 62,
        lastUpdate: '30분 전',
        color: 'purple'
    }
];

/**
 * Create artist card HTML
 * @param {Object} artist - Artist data
 * @param {boolean} isKorean - Language preference
 * @returns {string} - HTML string
 */
function createArtistCard(artist, isKorean = true) {
    const errorFallbackColor = {
        purple: '#e9d5ff',
        blue: '#dbeafe',
        red: '#fecaca',
        green: '#dcfce7',
        pink: '#fce7f3'
    }[artist.color] || '#f1f5f9';

    return `
        <a href="editor.html?id=${artist.id}"
            class="block h-64 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group focus:outline-none focus:ring-2 focus:ring-brand-500 animate-slide-up"
            style="animation-delay: ${POPULAR_ARTISTS.indexOf(artist) * 0.1}s">
            <div class="h-36 bg-${artist.color}-100 relative overflow-hidden">
                <img src="${artist.thumbnail}" alt="${artist.name} (${artist.englishName}) 주요 순간"
                    class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                    onerror="this.style.display='none'; this.parentNode.style.backgroundColor='${errorFallbackColor}'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-${artist.color}-600 shadow-sm">
                    ${artist.category}
                </div>
            </div>
            <div class="p-5">
                <h3 class="text-xl font-bold text-slate-800 mb-1 group-hover:text-brand-600 transition-colors line-clamp-1">
                    ${artist.name} (${artist.englishName})
                </h3>
                <p class="text-sm text-slate-500 mb-3">마지막 업데이트: ${artist.lastUpdate}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">+${artist.moments}개의 순간</span>
                </div>
            </div>
        </a>
    `;
}

/**
 * Create popular artist list item HTML
 * @param {Object} artist - Artist data
 * @param {number} index - Position index
 * @returns {string} - HTML string
 */
function createPopularArtistItem(artist, index) {
    const rankColor = index < 1 ? 'text-brand-500' : index < 3 ? 'text-slate-700' : 'text-slate-400';
    const errorFallbackColor = {
        purple: '#e9d5ff',
        blue: '#dbeafe',
        red: '#fecaca',
        green: '#dcfce7',
        pink: '#fce7f3'
    }[artist.color] || '#f1f5f9';

    return `
        <li class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            onclick="location.href='editor.html?id=${artist.id}'"
            role="button"
            tabindex="0"
            onkeypress="if(event.key==='Enter') location.href='editor.html?id=${artist.id}'"
            aria-label="${artist.name} 러브트리 보기">
            <span class="font-bold ${rankColor} w-4 text-center" aria-hidden="true">${index + 1}</span>
            <div class="w-8 h-8 rounded-full bg-${artist.color}-100 overflow-hidden">
                <img src="${artist.thumbnail}" alt="${artist.name}" 
                     class="w-full h-full object-cover"
                     loading="lazy"
                     onerror="this.style.display='none'; this.parentNode.style.backgroundColor='${errorFallbackColor}'">
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">${artist.name}</p>
                <p class="text-xs text-slate-500 truncate">${artist.englishName}</p>
            </div>
        </li>
    `;
}

/**
 * Render all artist cards
 */
function renderArtistCards() {
    if (!elements.artistCardsContainer) return;

    const cardsHTML = POPULAR_ARTISTS.map((artist, index) => {
        return createArtistCard(artist, isKorean);
    }).join('');

    elements.artistCardsContainer.innerHTML = cardsHTML;
}

/**
 * Render popular artists list
 */
function renderPopularArtistsList() {
    if (!elements.popularArtistsList) return;

    const listItemsHTML = POPULAR_ARTISTS.map((artist, index) => {
        return createPopularArtistItem(artist, index);
    }).join('');

    elements.popularArtistsList.innerHTML = listItemsHTML;
}

// ================== LANGUAGE AND TRANSLATIONS ==================

/**
 * Translations for UI text
 */
const translations = {
    ko: {
        title: "나의 러브트리",
        subtitle: "사랑에 빠진 모든 순간을 기록하세요.",
        create: "새로운 트리 만들기",
        modalTitle: "누구의 팬이신가요?",
        modalDesc: "아티스트의 이름을 입력하여 새로운 여정을 시작하세요.",
        labelName: "아티스트 이름",
        cancel: "취소",
        start: "시작하기",
        langBtn: "English"
    },
    en: {
        title: "My LoveTrees",
        subtitle: "Record your falling-in-love moments.",
        create: "Create New Tree",
        modalTitle: "Who is your artist?",
        modalDesc: "Enter the artist name to start a new journey.",
        labelName: "Artist Name",
        cancel: "Cancel",
        start: "Start Journey",
        langBtn: "한국어"
    }
};

let isKorean = true;

/**
 * Update UI text based on language
 */
function updateUIText() {
    const t = isKorean ? translations.ko : translations.en;

    if (elements.pageTitle) elements.pageTitle.innerText = t.title;
    if (elements.pageSubtitle) elements.pageSubtitle.innerText = t.subtitle;
    if (elements.btnCreate) elements.btnCreate.innerText = t.create;
    if (elements.modalTitle) elements.modalTitle.innerText = t.modalTitle;
    if (elements.modalDesc) elements.modalDesc.innerText = t.modalDesc;
    if (elements.labelName) elements.labelName.innerText = t.labelName;
    if (elements.btnCancel) elements.btnCancel.innerText = t.cancel;
    if (elements.btnStart) elements.btnStart.innerText = t.start;
    if (elements.langBtn) elements.langBtn.innerText = t.langBtn;

    // Re-render artist cards with correct language
    renderArtistCards();
}

/**
 * Toggle language preference
 */
function toggleLanguage() {
    isKorean = !isKorean;
    updateUIText();

    // Store language preference
    safeLocalStorageSet('lovetree_language', isKorean ? 'ko' : 'en');
}

// ================== MODAL HANDLERS ==================

/**
 * Open create modal
 */
function openCreateModal() {
    hideError();

    const nameInput = document.getElementById('artist-name');
    if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
    }

    const modal = document.getElementById('create-modal');
    if (modal) {
        modal.showModal();
    }
}

/**
 * Handle form submission
 * @param {Event} e - Form submit event
 */
function handleCreate(e) {
    e.preventDefault();
    hideError();

    const nameInput = document.getElementById('artist-name');
    const name = nameInput?.value?.trim();

    if (!name) {
        const error = validateArtistName('', isKorean);
        if (error) {
            nameInput?.classList.add('border-red-500');
            showError(error);
            nameInput?.focus();
            return;
        }
    }

    // Validate using shared utility
    const validationError = validateArtistName(name, isKorean);
    if (validationError) {
        nameInput?.classList.add('border-red-500');
        showError(validationError);
        nameInput?.focus();
        return;
    }

    try {
        if (name) {
            const encodedName = encodeURIComponent(name);
            window.location.href = `editor.html?id=${encodedName}`;
        }
    } catch (error) {
        console.error('Navigation error:', error);
        showError(isKorean ? '페이지 이동 중 오류가 발생했습니다.' : 'Error occurred while navigating.');
    }
}

// ================== LOADING AND PERFORMANCE ==================

/**
 * Show loading indicator
 */
function showLoading() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
    }
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

/**
 * Initialize lazy loading for images
 */
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('loading-skeleton');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            img.classList.add('loading-skeleton');
            imageObserver.observe(img);
        });
    }
}

// ================== DOM CACHING ==================

/**
 * Cache frequently used DOM elements for performance
 */
function cacheElements() {
    elements = {
        // Page elements
        pageTitle: document.getElementById('page-title'),
        pageSubtitle: document.getElementById('page-subtitle'),

        // Button elements
        btnCreate: document.getElementById('btn-create'),
        btnCancel: document.getElementById('btn-cancel'),
        btnStart: document.getElementById('btn-start'),
        langBtn: document.getElementById('lang-btn'),

        // Modal elements
        modalTitle: document.getElementById('modal-title'),
        modalDesc: document.getElementById('modal-desc'),
        labelName: document.getElementById('label-name'),

        // Container elements
        mainGrid: document.getElementById('main-grid'),
        artistCardsContainer: document.getElementById('artist-cards-container'),
        popularArtistsList: document.getElementById('popular-artists-list')
    };
}

// Global elements object
let elements = {};

// ================== INITIALIZATION ==================

/**
 * Initialize the page
 */
function initPage() {
    showLoading();

    try {
        // Cache DOM elements
        cacheElements();

        // Load saved language preference
        const savedLang = safeLocalStorageGet('lovetree_language', 'ko');
        isKorean = savedLang === 'ko';

        // Initial render
        renderArtistCards();
        renderPopularArtistsList();
        updateUIText();

        // Initialize performance features
        initializeLazyLoading();

        // Add form validation
        const artistNameInput = document.getElementById('artist-name');
        if (artistNameInput) {
            artistNameInput.addEventListener('input', debounce((e) => {
                const value = e.target.value.trim();
                const error = validateArtistName(value, isKorean);

                // Clear previous errors
                e.target.classList.remove('border-red-500');

                if (error) {
                    e.target.classList.add('border-red-500');
                    // Optionally show inline error
                }
            }, 300));
        }

    } catch (error) {
        console.error('Page initialization error:', error);
        showError('페이지 로딩 중 오류가 발생했습니다.', 3000);
    } finally {
        hideLoading();
    }
}

// ================== EVENT LISTENERS ==================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

// Handle page visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause any animations or timers when page is hidden
        console.log('Page hidden - pausing operations');
    } else {
        // Resume operations when page becomes visible
        console.log('Page visible - resuming operations');
    }
});

// Export functions for global access
window.toggleLanguage = toggleLanguage;
window.openCreateModal = openCreateModal;
window.handleCreate = handleCreate;
// Note: closeModal and hideError are globally available from shared.js
// These assignments are no longer needed since functions are imported from shared.js
window.closeModal = function (modalId) {
    closeModal(modalId || 'create-modal');
};
window.hideError = hideError;