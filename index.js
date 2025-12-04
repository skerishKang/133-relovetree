/**
 * Relovetree - Main Index Page Logic
 * 공유 유틸리티는 shared.js에서 로드됨
 */

// ================== UTILITIES ==================

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

    // Feed Style Card (Large)
    return `
        <a href="editor.html?id=${artist.id}"
            data-artist-id="${artist.id}"
            class="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow h-full">
            
            <!-- Header (User Info style) -->
            <div class="flex items-center justify-between p-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-${artist.color}-100 flex items-center justify-center text-xs font-bold text-${artist.color}-600">
                        ${artist.name.charAt(0)}
                    </div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-900 truncate">${artist.name}</p>
                        <p class="text-xs text-slate-500 truncate">${artist.englishName}</p>
                    </div>
                </div>
                <button class="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                </button>
            </div>

            <!-- Thumbnail (Large) -->
            <div class="aspect-video bg-slate-100 relative">
                <img src="${thumbnailSrc}" alt="${artist.name}"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}';">
                <div class="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                    <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <svg class="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="px-4 py-3 flex items-center gap-4">
                <button class="flex items-center gap-1 text-slate-600 hover:text-red-500 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <button class="flex items-center gap-1 text-slate-600 hover:text-blue-500 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </button>
                <button class="flex items-center gap-1 text-slate-600 hover:text-green-500 transition-colors ml-auto">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </button>
            </div>

            <!-- Footer Info -->
            <div class="px-4 pb-4 mt-auto">
                <p class="text-sm font-bold text-slate-900 mb-1">${artist.moments}개의 순간이 기록됨</p>
                <p class="text-xs text-slate-500">${artist.lastUpdate} 업데이트</p>
            </div>
        </a>
    `;
}

// (Removed createPopularArtistItem as it's no longer used in the new design)

function renderArtistCards() {
    const feedContainer = document.getElementById('popular-feed');
    if (!feedContainer) return;

    const cardsHTML = POPULAR_ARTISTS.map((artist) => createArtistCard(artist)).join('');
    feedContainer.innerHTML = cardsHTML;
    // attachArtistCardEvents(); // Links are now direct <a> tags
}

function renderPopularArtistsList() {
    // Deprecated in new design
}

/**
 * Load and display "Recent Trees" from LocalStorage
 */
function loadRecentTrees() {
    if (!elements.recentTreesScroll || !elements.recentSection) return;

    const myTrees = [];
    const STORAGE_PREFIX = 'relovetree_data_';

    // Scan LocalStorage for tree data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(STORAGE_PREFIX)) {
            try {
                const treeId = key.replace(STORAGE_PREFIX, '');
                const data = JSON.parse(localStorage.getItem(key));

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
        elements.recentSection.classList.remove('hidden');

        // Render as Stories (Circles)
        const myTreesHTML = myTrees.map(tree => {
            const colors = ['purple', 'blue', 'red', 'green', 'pink', 'indigo', 'teal'];
            const colorIndex = tree.id.length % colors.length;
            const color = colors[colorIndex];

            return `
            <a href="editor.html?id=${encodeURIComponent(tree.id)}"
                class="flex-shrink-0 w-20 flex flex-col items-center gap-2 snap-start group">
                <div class="w-16 h-16 rounded-full bg-${color}-100 border-2 border-${color}-200 p-1 group-hover:border-${color}-500 transition-colors overflow-hidden">
                    <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-${color}-500">
                        ${tree.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <span class="text-xs font-medium text-slate-700 text-center truncate w-full px-1">${tree.name}</span>
            </a>
            `;
        }).join('');

        elements.recentTreesScroll.innerHTML = myTreesHTML;

    } else {
        // If no recent trees, show placeholder or hide? 
        // The HTML has a placeholder "No recent visits". We can just leave it or show it.
        // For now, let's just show the placeholder text if empty.
        if (elements.recentTreesScroll.children.length === 0) {
            elements.recentTreesScroll.innerHTML = '<div class="text-sm text-slate-400 py-4 px-2">최근 방문 기록이 없습니다.</div>';
        }
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
        // Sections
        artistCardsContainer: document.getElementById('popular-feed'),
        popularArtistsList: document.getElementById('popular-artists-list'),
        recentTreesScroll: document.getElementById('recent-trees-scroll'),
        recentSection: document.getElementById('recent-section'),
        myCreatedTreesSection: document.getElementById('my-created-trees-section'),
        myTreesTitle: document.getElementById('my-trees-title'),
        allTreesTitle: document.getElementById('all-trees-title')
    };
}

// Global elements object
let elements = {};

// ================== MOBILE SHELL / MENU HELPERS ==================

/**
 * 모바일 햄버거 메뉴 열기/닫기
 */
function setMobileMenuVisible(visible) {
    const panel = document.getElementById('mobile-menu-panel');
    if (!panel) return;
    if (visible) {
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
    }
}

function toggleMobileMenu() {
    const panel = document.getElementById('mobile-menu-panel');
    if (!panel) return;
    const isHidden = panel.classList.contains('hidden');
    setMobileMenuVisible(isHidden);
}

function navigateToHome() {
    setMobileMenuVisible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToMyTrees() {
    setMobileMenuVisible(false);
    const section = document.getElementById('my-created-trees-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function scrollToAllTrees() {
    setMobileMenuVisible(false);
    const section = document.getElementById('discovery-section');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ================== BACKGROUND PREFERENCES ==================

const BG_STORAGE_KEY = 'relovetree_background';

function applyBackgroundConfig(config) {
    const body = document.body;
    if (!body || !config) return;

    if (config.type === 'image' && config.value) {
        body.style.backgroundImage = `url('${config.value}')`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
    } else if (config.type === 'color' && config.value) {
        body.style.backgroundImage = '';
        body.style.backgroundColor = config.value;
    }
}

function setBackground(type, value) {
    const config = { type, value };
    applyBackgroundConfig(config);
    safeLocalStorageSet(BG_STORAGE_KEY, config);
}

function resetBackground() {
    const defaultConfig = { type: 'color', value: '#f8fafc' };
    applyBackgroundConfig(defaultConfig);
    safeLocalStorageRemove(BG_STORAGE_KEY);
}

function applyCustomBackground() {
    const input = document.getElementById('custom-bg-url');
    if (!input) return;
    const url = input.value.trim();
    if (!url) return;
    setBackground('image', url);
}

function loadBackgroundPreference() {
    const saved = safeLocalStorageGet(BG_STORAGE_KEY, null);
    if (saved && (saved.type === 'image' || saved.type === 'color')) {
        applyBackgroundConfig(saved);
    } else {
        applyBackgroundConfig({ type: 'color', value: '#f8fafc' });
    }
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        // showModal을 지원하지 않는 경우 fallback
        modal.setAttribute('open', 'open');
    }
}

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
        // renderPopularArtistsList(); // Deprecated
        loadRecentTrees();
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

        // Add event listeners for settings buttons
        const settingsBtn = document.getElementById('settings-btn');
        const mobileSettingsBtn = document.getElementById('mobile-settings-btn');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', openSettingsModal);
        }

        if (mobileSettingsBtn) {
            mobileSettingsBtn.addEventListener('click', openSettingsModal);
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
    document.addEventListener('DOMContentLoaded', () => {
        initPage();
        loadBackgroundPreference();
    });
} else {
    initPage();
    loadBackgroundPreference();
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

/**
 * Handle Pro Upgrade Click
 */
function handleProUpgrade() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('로그인이 필요합니다.');
        return;
    }
    requestPayment(user.email, user.displayName);
}
window.handleProUpgrade = handleProUpgrade;
window.toggleMobileMenu = toggleMobileMenu;
window.navigateToHome = navigateToHome;
window.scrollToMyTrees = scrollToMyTrees;
window.scrollToAllTrees = scrollToAllTrees;
window.openSettingsModal = openSettingsModal;
window.loadBackgroundPreference = loadBackgroundPreference;
// closeModal, hideError already exposed via shared.js