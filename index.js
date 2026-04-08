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
    },
    {
        id: 'newjeans',
        name: '뉴진스',
        englishName: 'NewJeans',
        category: 'Group',
        videoId: 'js1CtxSY38I',
        moments: 74,
        lastUpdate: '어제',
        color: 'pink'
    },
    {
        id: 'lesserafim',
        name: '르세라핌',
        englishName: 'LE SSERAFIM',
        category: 'Group',
        videoId: 'pyf8cbqyfPs',
        moments: 68,
        lastUpdate: '3일 전',
        color: 'red'
    },
    {
        id: 'ive',
        name: '아이브',
        englishName: 'IVE',
        category: 'Group',
        videoId: 'Y8JFxS1HlDo',
        moments: 81,
        lastUpdate: '5일 전',
        color: 'blue'
    },
    {
        id: 'aespa',
        name: '에스파',
        englishName: 'aespa',
        category: 'Group',
        videoId: 'ZeerrnuLi5E',
        moments: 59,
        lastUpdate: '1주 전',
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

// Removed: createArtistCard, renderArtistCards - now in src/index-render.js

// (Removed createPopularArtistItem as it's no longer used in the new design)

// (Removed renderRecentTreesFromList - now in src/index-render.js)

// (Removed renderMyTreesGrid - now in src/index-render.js)

/**
 * Load and display "Recent Trees" from LocalStorage (비로그인/백업용)
 */
function loadRecentTrees() {
    if (!elements.recentTreesScroll || !elements.recentSection) return;

    const myTrees = [];
    const STORAGE_PREFIX = 'relovetree_data_';

    // Scan LocalStorage for tree data
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
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

    // 나의 러브트리 그리드 및 최근 방문 스토리 동시 갱신
    // 비로그인/로그아웃 상태에서는 나의 러브트리 목록은 항상 비워두고,
    // 최근 방문한 트리 섹션만 로컬스토리지 기준으로 표시한다.
    IndexRender.renderMyTreesGrid([], renderHomeTreeCard);
    if (myTrees.length > 0) {
        IndexRender.renderRecentTreesFromList(myTrees);
    } else {
        // 로컬에도 아무 데이터가 없으면 플레이스홀더만 유지
        if (elements.recentTreesScroll.children.length === 0) {
            elements.recentTreesScroll.innerHTML = '<div class="text-sm text-slate-400 py-4 px-2">최근 방문 기록이 없습니다.</div>';
        }
    }
}

/**
 * Firestore에서 현재 사용자(ownerId 기준) 트리를 불러오기
 */
async function loadUserTreesFromFirestore(user) {
    if (!user) {
        loadRecentTrees();
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        loadRecentTrees();
        return;
    }

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('trees')
            .where('ownerId', '==', user.uid)
            .limit(100)
            .get();

        const myTrees = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            let lastUpdated = data.lastUpdated;

            // Timestamp 타입과 문자열 모두 처리
            if (lastUpdated && typeof lastUpdated.toDate === 'function') {
                lastUpdated = lastUpdated.toDate().toISOString();
            } else if (!lastUpdated) {
                lastUpdated = new Date().toISOString();
            }

            const nodes = Array.isArray(data.nodes) ? data.nodes : [];
            const nodeCount = typeof data.nodeCount === 'number'
                ? data.nodeCount
                : nodes.length;

            const likeCount = typeof data.likeCount === 'number'
                ? data.likeCount
                : (Array.isArray(data.likes) ? data.likes.length : 0);

            const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
            const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

            myTrees.push({
                id: doc.id,
                name: data.name || decodeURIComponent(doc.id),
                lastUpdated,
                nodeCount,
                likeCount,
                viewCount,
                shareCount
            });
        });

        if (elements.localMigrationBanner) {
            const existingIds = new Set(myTrees.map(t => t.id));
            const STORAGE_PREFIX = 'relovetree_data_';
            let localOnlyCount = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    const treeId = key.replace(STORAGE_PREFIX, '');
                    if (!existingIds.has(treeId)) {
                        localOnlyCount++;
                    }
                }
            }

            if (localOnlyCount > 0) {
                elements.localMigrationBanner.classList.remove('hidden');
                const textEl = document.getElementById('local-migration-text');
                if (textEl) {
                    textEl.textContent = '이 기기에만 저장된 러브트리 ' + localOnlyCount + '개를 계정으로 가져올 수 있습니다.';
                }
            } else {
                elements.localMigrationBanner.classList.add('hidden');
            }
        }

        // lastUpdated 기준으로 최신 순 정렬 (문자열/Date 모두 처리)
        myTrees.sort(function (a, b) {
            return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        });

        // Firestore 기준으로 나의 러브트리 그리드와 최근 방문 스토리를 동시에 갱신
        IndexRender.renderMyTreesGrid(myTrees, renderHomeTreeCard);
        IndexRender.renderRecentTreesFromList(myTrees);
        myTreesCache = myTrees.slice();
    } catch (error) {
        console.error('Failed to load trees from Firestore:', error);
        loadRecentTrees();
    }
}

/**
 * 최근 만들어진 러브트리 섹션용 그리드 렌더러 (전역 최신 트리 기준)
 */
async function loadRecentCreatedTrees() {
    const section = document.getElementById('recent-created-section');
    const grid = document.getElementById('recent-created-grid');

    if (!section || !grid) return;

    // 기본적으로 섹션은 숨겨두고, 실제 데이터가 있을 때만 노출
    section.classList.add('hidden');

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        // Firebase를 사용할 수 없을 때는 기본 플레이스홀더만 표시
        return;
    }

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('trees')
            .orderBy('lastUpdated', 'desc')
            .limit(12)
            .get();

        if (snapshot.empty) {
            // 아무 트리도 없으면 섹션을 숨긴 채로 유지
            return;
        }

        const trees = [];

        snapshot.forEach((doc) => {
            const data = doc.data() || {};

            let lastUpdated = data.lastUpdated;
            if (lastUpdated && typeof lastUpdated.toDate === 'function') {
                lastUpdated = lastUpdated.toDate().toISOString();
            } else if (typeof lastUpdated !== 'string') {
                lastUpdated = '';
            }

            const nodes = Array.isArray(data.nodes) ? data.nodes : [];
            const nodeCount = typeof data.nodeCount === 'number'
                ? data.nodeCount
                : nodes.length;

            const likeCount = typeof data.likeCount === 'number'
                ? data.likeCount
                : (Array.isArray(data.likes) ? data.likes.length : 0);

            const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
            const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

            trees.push({
                id: doc.id,
                name: data.name || decodeURIComponent(doc.id),
                lastUpdated,
                nodeCount,
                likeCount,
                viewCount,
                shareCount
            });
        });

        recentCreatedTreesCache = trees.slice();

        if (trees.length === 0) {
            return;
        }

        const cardsHTML = trees.map((tree) => {
            const updatedDate = (tree.lastUpdated || '').slice(0, 10);
            return renderHomeTreeCard(tree, {
                title: `${tree.name || '?'} 러브트리 보기`,
                subtitle: `최근 업데이트: ${updatedDate}`
            });
        }).join('');

        grid.innerHTML = cardsHTML;
        section.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load recently created trees:', error);
    }
}

async function migrateLocalTreesToAccount() {
    const user = getCurrentUser();
    if (!user) {
        const message = isKorean
            ? '로그인이 필요합니다. 하단의 [마이] 탭에서 먼저 로그인해 주세요.'
            : 'Login is required. Please sign in from the [My] tab first.';
        showError(message, 4000);
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        showError(isKorean ? '저장소 초기화 중입니다. 잠시 후 다시 시도해 주세요.' : 'Storage is not ready. Please try again.', 4000);
        return;
    }

    const confirmed = window.confirm('이 기기에만 저장된 러브트리를 현재 계정으로 모두 가져올까요?\n같은 ID의 트리가 이미 계정에 있으면 건너뜁니다.');
    if (!confirmed) return;

    const db = firebase.firestore();
    const STORAGE_PREFIX = 'relovetree_data_';
    const migratedNames = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

        const treeId = key.replace(STORAGE_PREFIX, '');
        let data;
        try {
            data = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            continue;
        }

        if (!data || (!data.nodes && !data.edges)) continue;

        try {
            const docRef = db.collection('trees').doc(treeId);
            const snap = await docRef.get();
            if (snap.exists) {
                const existing = snap.data() || {};
                if (!existing.ownerId) {
                    const claimedName = existing.name || data.name || decodeURIComponent(treeId);
                    await docRef.set({
                        ownerId: user.uid,
                        lastUpdated: new Date().toISOString()
                    }, { merge: true });
                    migratedNames.push(claimedName);
                }
                continue;
            }

            const nodes = Array.isArray(data.nodes) ? data.nodes : [];
            const likes = Array.isArray(data.likes) ? data.likes : [];

            const payload = {
                name: data.name || decodeURIComponent(treeId),
                nodes: nodes,
                edges: data.edges || [],
                ownerId: user.uid,
                lastUpdated: new Date().toISOString(),
                nodeCount: typeof data.nodeCount === 'number' ? data.nodeCount : nodes.length,
                viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
                shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
                likeCount: typeof data.likeCount === 'number' ? data.likeCount : likes.length
            };

            await docRef.set(payload, { merge: true });
            migratedNames.push(payload.name);
        } catch (e) {
            console.error('Local tree migrate failed:', e);
        }
    }

    if (migratedNames.length > 0) {
        const message = isKorean
            ? '로컬 러브트리 ' + migratedNames.length + '개를 계정으로 가져왔습니다.'
            : 'Imported ' + migratedNames.length + ' local trees into your account.';
        showError(message, 4000);
        await loadUserTreesFromFirestore(user);
    } else {
        const message = isKorean
            ? '가져올 로컬 러브트리를 찾지 못했습니다.'
            : 'No local trees to import.';
        showError(message, 3000);
    }
}

// (Removed: renderRecentTreesFromList and renderMyTreesGrid - now in src/index-render.js)

// (Removed updateMyCreatedTreesPlaceholder - now in src/index-render.js)

// ================== INITIALIZATION ==================

/**
 * Translations for UI text
 */
const translations = {
    ko: {
        title: "사랑에 빠진 모든 순간을 기록해 보세요",
        subtitle: "나의 러브트리로 좋아하는 아티스트의 모든 순간을 한 곳에 차곡차곡 모아 보세요.",
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
        title: "Capture every moment you fall in love.",
        subtitle: "Gather all your stan moments into a single LoveTree.",
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

    updateMyCreatedTreesPlaceholder();
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
        allTreesTitle: document.getElementById('all-trees-title'),
        localMigrationBanner: document.getElementById('local-migration-banner'),
        recentCreatedSection: document.getElementById('recent-created-section'),
        recentCreatedGrid: document.getElementById('recent-created-grid')
    };
}

// Global elements object
let elements = {};

// ================== MOBILE SHELL / MENU HELPERS ==================

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

function scrollToTop() {
    navigateToHome();
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
        // 인기 섹션은 정적 썸네일 카드를 먼저 보여주고, 비동기 조회 결과로 교체한다.
        IndexRender.renderArtistCards(POPULAR_ARTISTS);
        // Firestore 기준 인기 트리 섹션을 우선 시도하고, 실패 시 정적 카드로 유지
        loadPopularTrees();
        // 최근 만들어진 러브트리(전역 최신 트리) 섹션 로드
        loadRecentCreatedTrees();
        // renderPopularArtistsList(); // Deprecated
        // 최근 트리는 auth.js에서 onAuthReady(user)를 통해 Firestore 기준으로 재로드되며,
        // 여기서는 로컬스토리지 기반 fallback만 먼저 호출
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
        const searchBtn = document.getElementById('search-btn');

        if (settingsBtn && typeof homeSettings.openSettingsModal === 'function') {
            settingsBtn.addEventListener('click', homeSettings.openSettingsModal);
        }

        if (mobileSettingsBtn && typeof homeSettings.openSettingsModal === 'function') {
            mobileSettingsBtn.addEventListener('click', homeSettings.openSettingsModal);
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', openSearchModal);
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', function (e) {
                if (e && e.key === 'Enter') {
                    e.preventDefault();
                    runSearchFromUI();
                }
            });
        }

        // 배경 파일 업로드/드래그앤드롭 컨트롤 초기화
        if (typeof homeSettings.initBackgroundFileControls === 'function') {
            homeSettings.initBackgroundFileControls();
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
        if (typeof homeSettings.loadBackgroundPreference === 'function') {
            homeSettings.loadBackgroundPreference();
        }
    });
} else {
    initPage();
    if (typeof homeSettings.loadBackgroundPreference === 'function') {
        homeSettings.loadBackgroundPreference();
    }
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
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.openSearchModalFromMy = openSearchModalFromMy;
window.setSearchMode = setSearchMode;
window.runSearchFromUI = runSearchFromUI;
window.searchPrevPage = searchPrevPage;
window.searchNextPage = searchNextPage;
window.migrateLocalTreesToAccount = migrateLocalTreesToAccount;
// Auth 모듈에서 호출하는 전역 콜백: 로그인/로그아웃 시점에 최근 트리 목록을 갱신
window.onAuthReady = function (user) {
    if (user) {
        loadUserTreesFromFirestore(user);
    } else {
        loadRecentTrees();
    }
};
// closeModal, hideError already exposed via shared.js
