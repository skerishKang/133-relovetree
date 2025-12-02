/**
 * Relovetree - Main Index Page Logic
 * 공유 유틸리티는 shared.js에서 로드됨
 */

// ================== DATA AND CONSTANTS ==================

const DEFAULT_THUMBNAIL = 'https://placehold.co/640x360/f8fafc/94a3b8?text=Relovetree';

const BASE_POPULAR_ARTISTS = [
    {
        id: 'bts',
        name: '방탄소년단',
        englishName: 'BTS',
        category: 'Legend',
        videoId: 'gwMa6gpoE9I',
        moments: 108,
        lastUpdate: '방금 전',
        color: 'purple'
    },
    {
        id: 'seventeen',
        name: '세븐틴',
        englishName: 'Seventeen',
        category: 'Group',
        videoId: 'ThI0pBAbFnk',
        thumbnail: 'https://img.youtube.com/vi/ThI0pBAbFnk/hqdefault.jpg',
        moments: 95,
        lastUpdate: '2시간 전',
        color: 'blue'
    },
    {
        id: 'straykids',
        name: '스트레이 키즈',
        englishName: 'Stray Kids',
        category: 'Group',
        videoId: 'EaswWiwMVs8',
        moments: 87,
        lastUpdate: '4시간 전',
        color: 'red'
    },
    {
        id: 'leejunyoung',
        name: '이준영',
        englishName: 'Lee Jun-young',
        category: 'Solo',
        videoId: 'PPgQOxtnUao',
        thumbnail: 'https://img.youtube.com/vi/PPgQOxtnUao/hqdefault.jpg',
        moments: 23,
        lastUpdate: '6시간 전',
        color: 'green'
    },
    {
        id: 'hearts2hearts',
        name: '하츠투하츠',
        englishName: 'Hearts2Hearts',
        category: 'Group',
        videoId: 'kxUA2wwYiME',
        moments: 45,
        lastUpdate: '1시간 전',
        color: 'pink'
    },
    {
        id: 'illit',
        name: '아일릿',
        englishName: 'ILLIT',
        category: 'Group',
        videoId: 'Vk5-c_v4gMU',
        moments: 62,
        lastUpdate: '30분 전',
        color: 'purple'
    }
];

const POPULAR_ARTISTS = BASE_POPULAR_ARTISTS.map((artist) => ({
    ...artist,
    thumbnail: artist.thumbnail || (typeof getYouTubeThumb === 'function' ? getYouTubeThumb(artist.videoId) : '')
}));

function resolveArtistThumbnail(artist) {
    if (artist.thumbnail) return artist.thumbnail;
    if (artist.videoId && typeof getYouTubeThumb === 'function') {
        const videoThumb = getYouTubeThumb(artist.videoId);
        if (videoThumb) return videoThumb;
    }
    return DEFAULT_THUMBNAIL;
}

function getFallbackColor(colorKey) {
    const palette = {
        purple: '#e9d5ff',
        blue: '#dbeafe',
        red: '#fecaca',
        green: '#dcfce7',
        pink: '#fce7f3'
    };
    return palette[colorKey] || '#f1f5f9';
}

function navigateToArtist(artistId) {
    if (!artistId) return;
    window.location.href = `editor.html?id=${encodeURIComponent(artistId)}`;
}

function attachArtistCardEvents() {
    if (!elements.artistCardsContainer) return;

    elements.artistCardsContainer.querySelectorAll('a[data-artist-id]').forEach((anchor) => {
        const artistId = anchor.dataset.artistId;
        if (!artistId) return;

        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            navigateToArtist(artistId);
        });
    });
}

function attachPopularListEvents() {
    if (!elements.popularArtistsList) return;

    elements.popularArtistsList.querySelectorAll('[data-artist-id]').forEach((item) => {
        const artistId = item.dataset.artistId;
        if (!artistId) return;

        const handleActivate = (event) => {
            if (event.type === 'click' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateToArtist(artistId);
            }
        };

        item.addEventListener('click', handleActivate);
        item.addEventListener('keydown', handleActivate);
    });
}

function createArtistCard(artist) {
    const fallbackColor = getFallbackColor(artist.color);
    const thumbnailSrc = resolveArtistThumbnail(artist);

    return `
        <a href="editor.html?id=${artist.id}"
            data-artist-id="${artist.id}"
            class="block h-64 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group focus:outline-none focus:ring-2 focus:ring-brand-500 animate-slide-up"
            style="animation-delay: ${POPULAR_ARTISTS.indexOf(artist) * 0.1}s">
            <div class="aspect-video bg-${artist.color}-100 relative overflow-hidden">
                <img src="${thumbnailSrc}" alt="${artist.name} (${artist.englishName}) 주요 순간"
                    class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}'; this.parentNode.style.backgroundColor='${fallbackColor}';">
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

function createPopularArtistItem(artist, index) {
    const rankColor = index < 1 ? 'text-brand-500' : index < 3 ? 'text-slate-700' : 'text-slate-400';
    const fallbackColor = getFallbackColor(artist.color);
    const thumbnailSrc = resolveArtistThumbnail(artist);

    return `
        <li class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            role="button"
            tabindex="0"
            data-artist-id="${artist.id}"
            aria-label="${artist.name} 러브트리 보기">
            <span class="font-bold ${rankColor} w-4 text-center" aria-hidden="true">${index + 1}</span>
            <div class="w-8 h-8 rounded-full bg-${artist.color}-100 overflow-hidden">
                <img src="${thumbnailSrc}" alt="${artist.name}"
                     class="w-full h-full object-cover"
                     loading="lazy"
                     decoding="async"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}'; this.parentNode.style.backgroundColor='${fallbackColor}';">
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate">${artist.name}</p>
                <p class="text-xs text-slate-500 truncate">${artist.englishName}</p>
            </div>
        </li>
    `;
}

function renderArtistCards() {
    if (!elements.artistCardsContainer) return;

    const cardsHTML = POPULAR_ARTISTS.map((artist) => createArtistCard(artist)).join('');
    elements.artistCardsContainer.innerHTML = cardsHTML;
    attachArtistCardEvents();
}

function renderPopularArtistsList() {
    if (!elements.popularArtistsList) return;

    const listItemsHTML = POPULAR_ARTISTS.map((artist, index) => createPopularArtistItem(artist, index)).join('');
    elements.popularArtistsList.innerHTML = listItemsHTML;
    attachPopularListEvents();
}

/**
 * Load and display "My Trees" from LocalStorage
 */
function loadMyTrees() {
    if (!elements.myTreesGrid || !elements.myTreesSection) return;

    const myTrees = [];
    const STORAGE_PREFIX = 'relovetree_data_';

    // Scan LocalStorage for tree data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
            try {
                const treeId = key.replace(STORAGE_PREFIX, '');
                const data = JSON.parse(localStorage.getItem(key));

                // Basic validation
                if (data && (data.nodes || data.edges)) {
                    myTrees.push({
                        id: treeId,
                        name: data.name || decodeURIComponent(treeId),
                        lastUpdated: data.lastUpdated || new Date().toISOString(),
                        nodeCount: (data.nodes || []).length
                    });
                }
            } catch (e) {
                console.warn('Failed to parse tree data:', key, e);
            }
        }
    }

    // Sort by last updated (descending)
    myTrees.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    if (myTrees.length > 0) {
        elements.myTreesSection.classList.remove('hidden');

        const myTreesHTML = myTrees.map(tree => {
            // Determine color based on ID hash or random for variety
            const colors = ['purple', 'blue', 'red', 'green', 'pink', 'indigo', 'teal'];
            const colorIndex = tree.id.length % colors.length;
            const color = colors[colorIndex];

            return `
            <a href="editor.html?id=${encodeURIComponent(tree.id)}"
                class="block h-48 rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group focus:outline-none focus:ring-2 focus:ring-brand-500 animate-slide-up">
                <div class="h-2/3 bg-${color}-50 relative p-5 flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">
                            ${tree.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-slate-500">
                            ${new Date(tree.lastUpdated).toLocaleDateString()}
                        </span>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">
                        ${tree.name}
                    </h3>
                </div>
                <div class="h-1/3 p-4 flex items-center justify-between bg-white">
                    <span class="text-sm text-slate-500 flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        ${tree.nodeCount} Moments
                    </span>
                    <span class="text-brand-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
                        이어하기 &rarr;
                    </span>
                </div>
            </a>
            `;
        }).join('');

        elements.myTreesGrid.innerHTML = myTreesHTML;
    } else {
        elements.myTreesSection.classList.add('hidden');
    }
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
        langBtn: "English",
        myTreesTitle: "최근 방문한 트리",
        allTreesTitle: "모든 러브트리"
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
        langBtn: "한국어",
        myTreesTitle: "Recent Visits",
        allTreesTitle: "All LoveTrees"
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
    if (elements.myTreesTitle) elements.myTreesTitle.innerText = t.myTreesTitle;
    if (elements.allTreesTitle) elements.allTreesTitle.innerText = t.allTreesTitle;

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
        popularArtistsList: document.getElementById('popular-artists-list'),
        myTreesSection: document.getElementById('my-trees-section'),
        myTreesGrid: document.getElementById('my-trees-grid'),
        myTreesTitle: document.getElementById('my-trees-title'),
        allTreesTitle: document.getElementById('all-trees-title')
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
        loadMyTrees();
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

/**
 * Handle profile button click
 */
function handleProfileClick() {
    showError(isKorean ? '로그인 기능은 준비 중입니다.' : 'Login feature is coming soon.', 2000);
}

// Export functions for global access
window.toggleLanguage = toggleLanguage;
window.openCreateModal = openCreateModal;
window.handleCreate = handleCreate;
window.handleProfileClick = handleProfileClick;
// closeModal, hideError already exposed via shared.js