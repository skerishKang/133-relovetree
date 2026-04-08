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

// ================== SEARCH (MVP) ==================

let SEARCH_MODE = 'all';
let SEARCH_QUERY = '';
let SEARCH_PAGE = 1;
const SEARCH_PAGE_SIZE = 8;

let myTreesCache = [];
let recentCreatedTreesCache = [];
let searchAllCache = [];
const homeSettings = (typeof window !== 'undefined' && window.ReloveIndexSettings) ? window.ReloveIndexSettings : {};

function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;

    try {
        if (typeof modal.showModal === 'function') {
            modal.showModal();
        } else {
            modal.setAttribute('open', 'open');
        }
    } catch (e) {
    }

    try {
        const input = document.getElementById('search-input');
        if (input) {
            input.focus();
        }
    } catch (e) {
    }

    setSearchMode(SEARCH_MODE || 'all');
}

function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    try {
        if (typeof modal.close === 'function') {
            modal.close();
        } else {
            modal.removeAttribute('open');
        }
    } catch (e) {
    }
}

function openSearchModalFromMy() {
    try {
        if (typeof closeModal === 'function') {
            closeModal('settings-modal');
        }
    } catch (e) {
    }

    window.setTimeout(function () {
        openSearchModal();
    }, 50);
}

function setSearchMode(mode) {
    SEARCH_MODE = mode === 'my' ? 'my' : 'all';
    SEARCH_PAGE = 1;

    const tabAll = document.getElementById('search-tab-all');
    const tabMy = document.getElementById('search-tab-my');
    if (tabAll) {
        tabAll.className = SEARCH_MODE === 'all'
            ? 'search-tab-btn search-tab-btn-active'
            : 'search-tab-btn';
    }
    if (tabMy) {
        tabMy.className = SEARCH_MODE === 'my'
            ? 'search-tab-btn search-tab-btn-active'
            : 'search-tab-btn';
    }

    runSearch(SEARCH_QUERY, SEARCH_MODE, SEARCH_PAGE);
}

function runSearchFromUI() {
    const input = document.getElementById('search-input');
    const q = input ? String(input.value || '').trim() : '';
    SEARCH_QUERY = q;
    SEARCH_PAGE = 1;
    runSearch(SEARCH_QUERY, SEARCH_MODE, SEARCH_PAGE);
}

function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
}

function filterTreesByQuery(trees, query) {
    const q = normalizeSearchText(query);
    if (!q) return [];
    const list = Array.isArray(trees) ? trees : [];
    return list.filter((t) => {
        const name = normalizeSearchText(t && t.name);
        const id = normalizeSearchText(t && t.id);
        return name.includes(q) || id.includes(q);
    });
}

function getTreeMetaSummary(tree) {
    const nodeCount = typeof tree.nodeCount === 'number' ? tree.nodeCount : 0;
    const viewCount = typeof tree.viewCount === 'number' ? tree.viewCount : 0;
    const likeCount = typeof tree.likeCount === 'number' ? tree.likeCount : 0;
    const shareCount = typeof tree.shareCount === 'number' ? tree.shareCount : 0;
    return `${nodeCount}개의 순간 · 조회 ${viewCount} · 좋아요 ${likeCount} · 공유 ${shareCount}`;
}

function renderHomeTreeCard(tree, options) {
    const card = tree || {};
    const opts = options || {};
    const name = card.name || card.id || '?';
    const initial = name.charAt(0).toUpperCase();
    const href = opts.href || `editor.html?id=${encodeURIComponent(card.id || '')}`;
    const subtitle = opts.subtitle || '';
    const title = opts.title || name;
    const likeCount = typeof card.likeCount === 'number' ? card.likeCount : 0;
    const baseClass = opts.compact
        ? 'tree-card-base tree-card-base-compact'
        : 'tree-card-base';
    const topbarClass = opts.compact
        ? 'tree-card-topbar tree-card-topbar-padded'
        : 'tree-card-topbar';
    const identityClass = opts.compact
        ? 'tree-card-identity tree-card-identity-tight'
        : 'tree-card-identity';
    const avatarClass = opts.compact
        ? 'initials-avatar initials-avatar-sm'
        : 'initials-avatar';
    const metaClass = opts.compact
        ? 'tree-card-meta tree-card-meta-padded'
        : 'tree-card-meta';

    return `
        <a href="${href}" class="${baseClass}" title="${title}">
            <div class="${topbarClass}">
                <div class="${identityClass}">
                    <div class="${avatarClass}">
                        ${initial}
                    </div>
                    <div class="tree-card-body">
                        <p class="tree-card-title">${name}</p>
                        <p class="tree-card-subtitle">${subtitle}</p>
                    </div>
                </div>
                ${opts.showLikeBadge ? `
                    <div class="tree-card-likebar">
                        <span class="tree-card-likeicon">♥</span>
                        <span>${likeCount}</span>
                    </div>
                ` : ''}
            </div>
            <p class="${metaClass}">
                ${getTreeMetaSummary(card)}
            </p>
        </a>
    `;
}

function renderSearchResults(items, page, total) {
    const container = document.getElementById('search-result');
    if (!container) return;

    if (!SEARCH_QUERY) {
        container.innerHTML = `
            <div class="search-empty">
                <div class="search-empty-icon">
                    <svg class="search-empty-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <div class="search-empty-copy">
                    <p class="search-empty-title">궁금한 아티스트나 트리를 검색해 보세요</p>
                </div>
            </div>
        `;
        updateSearchPagination(0, 0);
        return;
    }

    if (!items.length) {
        container.innerHTML = `
            <div class="search-empty">
                <div class="search-empty-icon">
                    <svg class="search-empty-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="search-empty-copy">
                    <p class="search-empty-title-strong">'${SEARCH_QUERY}'에 대한 결과가 없습니다</p>
                    <p class="search-empty-desc">다른 검색어를 입력하거나 오타를 확인해 보세요</p>
                </div>
            </div>
        `;
        updateSearchPagination(0, 0);
        return;
    }

    container.innerHTML = items.map((tree) => {
        const name = tree.name || tree.id || '?';
        const sub = tree.updated ? String(tree.updated).slice(0, 10) : (tree.lastUpdated ? String(tree.lastUpdated).slice(0, 10) : '');
        const href = `editor.html?id=${encodeURIComponent(tree.id || '')}`;
        return `
            <a href="${href}" class="search-result-card">
                <div class="search-result-row">
                    <div class="search-result-copy">
                        <div class="search-result-title">${name}</div>
                        <div class="search-result-meta">
                            <div class="search-result-date">${sub}</div>
                            <div class="search-result-status">러브트리</div>
                        </div>
                    </div>
                    <div class="search-result-open search-result-cta">열기</div>
                </div>
            </a>
        `;
    }).join('');

    updateSearchPagination(page, total);
}

function updateSearchPagination(page, total) {
    const wrap = document.getElementById('search-pagination');
    const info = document.getElementById('search-page-info');
    if (!wrap || !info) return;

    if (!total || total <= SEARCH_PAGE_SIZE) {
        wrap.classList.add('hidden');
        info.textContent = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
    wrap.classList.remove('hidden');
    info.textContent = `${page} / ${totalPages} · ${total}개`;
}

function searchPrevPage() {
    if (SEARCH_PAGE <= 1) return;
    SEARCH_PAGE -= 1;
    runSearch(SEARCH_QUERY, SEARCH_MODE, SEARCH_PAGE);
}

function searchNextPage() {
    SEARCH_PAGE += 1;
    runSearch(SEARCH_QUERY, SEARCH_MODE, SEARCH_PAGE);
}

async function ensureAllSearchCacheLoaded() {
    if (searchAllCache && searchAllCache.length > 0) return;
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('trees')
            .orderBy('lastUpdated', 'desc')
            .limit(50)
            .get();

        const trees = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            let lastUpdated = data.lastUpdated;
            if (lastUpdated && typeof lastUpdated.toDate === 'function') {
                lastUpdated = lastUpdated.toDate().toISOString();
            } else if (typeof lastUpdated !== 'string') {
                lastUpdated = '';
            }
            trees.push({
                id: doc.id,
                name: data.name || decodeURIComponent(doc.id),
                lastUpdated
            });
        });
        searchAllCache = trees;
    } catch (e) {
        console.error('전체 검색 캐시 로드 실패:', e);
    }
}

async function runSearch(query, mode, page) {
    const q = String(query || '').trim();
    const currentMode = mode === 'my' ? 'my' : 'all';
    const currentPage = Math.max(1, Number(page) || 1);

    if (!q) {
        renderSearchResults([], 1, 0);
        return;
    }

    if (currentMode === 'my') {
        const filtered = filterTreesByQuery(myTreesCache, q);
        const total = filtered.length;
        const start = (currentPage - 1) * SEARCH_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + SEARCH_PAGE_SIZE);
        renderSearchResults(pageItems, currentPage, total);
        return;
    }

    await ensureAllSearchCacheLoaded();
    const base = (searchAllCache && searchAllCache.length > 0)
        ? searchAllCache
        : (Array.isArray(recentCreatedTreesCache) ? recentCreatedTreesCache : []);

    const filtered = filterTreesByQuery(base, q);
    const total = filtered.length;
    const start = (currentPage - 1) * SEARCH_PAGE_SIZE;
    const pageItems = filtered.slice(start, start + SEARCH_PAGE_SIZE);
    renderSearchResults(pageItems, currentPage, total);
}

// 현재 로그인한 Firebase 사용자를 안전하게 가져오기
function getCurrentUser() {
    try {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
            return null;
        }
        return firebase.auth().currentUser;
    } catch (e) {
        console.warn('getCurrentUser failed:', e);
        return null;
    }
}

// Firestore에서 좋아요 수 기준으로 인기 트리를 불러와 상단 디스커버리 섹션에 렌더링
async function loadPopularTrees() {
    const container = document.getElementById('popular-feed');
    if (!container) {
        // 컨테이너가 없으면 기존 정적 카드 렌더로 대체
        renderArtistCards();
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        // Firebase를 사용할 수 없을 때는 정적 인기 아티스트 카드 사용
        renderArtistCards();
        return;
    }

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('trees')
            .orderBy('likeCount', 'desc')
            .limit(8)
            .get();

        const trees = [];
        snapshot.forEach((doc) => {
            const data = doc.data() || {};
            const rawLikeCount = typeof data.likeCount === 'number'
                ? data.likeCount
                : (Array.isArray(data.likes) ? data.likes.length : 0);

            let updated = '';
            const lastUpdated = data.lastUpdated;
            if (lastUpdated && typeof lastUpdated.toDate === 'function') {
                updated = lastUpdated.toDate().toISOString().slice(0, 10);
            } else if (typeof lastUpdated === 'string') {
                updated = lastUpdated.slice(0, 10);
            }

            const nodes = Array.isArray(data.nodes) ? data.nodes : [];
            const nodeCount = typeof data.nodeCount === 'number'
                ? data.nodeCount
                : nodes.length;

            const viewCount = typeof data.viewCount === 'number' ? data.viewCount : 0;
            const shareCount = typeof data.shareCount === 'number' ? data.shareCount : 0;

            // likeCount를 가장 강하게 반영하되, 조회/공유도 약하게 반영하는 인기 점수
            const popularityScore = (rawLikeCount || 0) * 1000 + viewCount * 3 + shareCount * 5;

            trees.push({
                id: doc.id,
                name: data.name || decodeURIComponent(doc.id),
                likeCount: rawLikeCount,
                updated,
                nodeCount,
                viewCount,
                shareCount,
                popularityScore
            });
        });

        if (trees.length === 0) {
            // 아직 인기 데이터가 없으면 기존 정적 카드 사용
            renderArtistCards();
            return;
        }

        // likeCount를 우선하면서 조회/공유를 보조 지표로 사용하는 정렬
        trees.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

        const cardsHTML = trees.map((tree) => {
            return renderHomeTreeCard(tree, {
                compact: true,
                subtitle: tree.updated || '',
                showLikeBadge: true
            });
        }).join('');

        container.innerHTML = cardsHTML;
    } catch (error) {
        console.error('Failed to load popular trees:', error);
        // 오류 시에도 기존 정적 카드로 fallback
        renderArtistCards();
    }
}
// 특정 액션 전에 로그인을 보장하는 헬퍼
function ensureLoggedIn() {
    const user = getCurrentUser();
    if (user) return user;

    const messageKo = '로그인이 필요합니다. 하단의 [마이] 탭에서 로그인해 주세요.';
    const messageEn = 'Login is required. Please open the [My] tab and sign in.';
    showError(isKorean ? messageKo : messageEn, 5000);

    try {
        if (typeof openSettingsModal === 'function') {
            openSettingsModal();
        }
        window.setTimeout(function () {
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.focus();
        }, 50);
    } catch (e) {
        console.warn('자동 로그인 플로우 실행 실패:', e);
    }

    return null;
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

function createArtistCard(artist) {
    const fallbackColor = getFallbackColor(artist.color);
    const thumbnailSrc = resolveArtistThumbnail(artist);

    // Feed Style Card (Large)
    return `
        <a href="editor.html?id=${artist.id}"
            data-artist-id="${artist.id}"
            class="artist-card">
            
            <!-- Header (User Info style) -->
            <div class="artist-card-header">
                <div class="artist-card-profile">
                    <div class="artist-card-avatar bg-${artist.color}-100 text-${artist.color}-600">
                        ${artist.name.charAt(0)}
                    </div>
                    <div class="artist-card-copy">
                        <p class="artist-card-name">${artist.name}</p>
                        <p class="artist-card-subtitle">${artist.englishName}</p>
                    </div>
                </div>
                <button class="artist-card-menu">
                    <svg class="icon-svg-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                </button>
            </div>

            <!-- Thumbnail (Large) -->
            <div class="artist-card-thumb group/thumb">
                <img src="${thumbnailSrc}" alt="${artist.name}의 러브트리 썸네일"
                    class="artist-card-thumb-image"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${DEFAULT_THUMBNAIL}';">
                <div class="artist-card-thumb-overlay">
                    <div class="artist-card-play">
                        <svg class="icon-svg-md icon-svg-nudge text-slate-900" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                        <span class="sr-only">러브트리 열기</span>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="artist-card-actions">
                <button type="button" class="artist-card-action artist-card-action-like group/btn" title="좋아요" aria-label="좋아요">
                    <svg class="artist-card-action-icon group-hover/btn:fill-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <button type="button" class="artist-card-action artist-card-action-comment group/btn" title="댓글" aria-label="댓글">
                    <svg class="artist-card-action-icon group-hover/btn:fill-blue-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </button>
                <button type="button" class="artist-card-action artist-card-action-share group/btn" title="공유하기" aria-label="공유하기">
                    <svg class="artist-card-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                </button>
            </div>

            <!-- Footer Info -->
            <div class="artist-card-footer">
                <p class="artist-card-footer-title">${artist.moments}개의 순간이 기록됨</p>
                <p class="artist-card-footer-meta">${artist.lastUpdate} 업데이트</p>
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
    renderMyTreesGrid([]);
    if (myTrees.length > 0) {
        renderRecentTreesFromList(myTrees);
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
        renderMyTreesGrid(myTrees);
        renderRecentTreesFromList(myTrees);
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

/**
 * 공통 렌더러: 최근/나의 트리 목록을 스토리 형태로 표시
 */
function renderRecentTreesFromList(myTrees) {
    if (!elements.recentTreesScroll || !elements.recentSection) return;

    if (!myTrees || myTrees.length === 0) {
        // 최근 방문이 없어도 섹션 자체는 보여주되, 시각화된 빈 상태 표시
        elements.recentSection.classList.remove('hidden');
        elements.recentTreesScroll.innerHTML = `
            <div class="home-recent-empty">
                <div class="initials-avatar mb-2">
                    <svg class="icon-svg-md icon-svg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <span class="home-recent-empty-label">방문 기록 없음</span>
            </div>
        `;
        return;
    }

    elements.recentSection.classList.remove('hidden');

    const myTreesHTML = myTrees.map(tree => {
        const colors = ['purple', 'blue', 'red', 'green', 'pink', 'indigo', 'teal'];
        const colorIndex = tree.id.length % colors.length;
        const color = colors[colorIndex];

        return `
            <a href="editor.html?id=${encodeURIComponent(tree.id)}"
                class="home-recent-item group">
                <div class="home-recent-avatar-shell bg-${color}-100 border-${color}-200 group-hover:border-${color}-500">
                    <div class="home-recent-avatar-core text-${color}-500">
                        ${tree.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <span class="home-recent-name">${tree.name}</span>
            </a>
        `;
    }).join('');

    elements.recentTreesScroll.innerHTML = myTreesHTML;
}

/**
 * 나의 러브트리 섹션용 그리드 렌더러
 */
function renderMyTreesGrid(myTrees) {
    const grid = document.getElementById('my-created-grid');
    const placeholder = document.getElementById('my-created-list');
    if (!grid) return;

    if (!myTrees || myTrees.length === 0) {
        updateMyCreatedTreesPlaceholder();
        grid.classList.add('hidden');
        grid.innerHTML = '';
        if (placeholder) placeholder.classList.remove('hidden');
        return;
    }

    const cardsHTML = myTrees.map(tree => {
        const updated = (tree.lastUpdated || '').slice(0, 10);
        return renderHomeTreeCard(tree, {
            title: `${tree.name} 러브트리 계속 편집하기`,
            subtitle: `최근 업데이트: ${updated}`
        });
    }).join('');

    grid.innerHTML = cardsHTML;
    grid.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
}

function updateMyCreatedTreesPlaceholder() {
    const titleEl = document.getElementById('my-created-placeholder-title');
    const descEl = document.getElementById('my-created-placeholder-desc');
    const loginBtn = document.getElementById('my-created-login-btn');
    const createBtn = document.getElementById('my-created-create-btn');
    const iconBtn = document.getElementById('my-created-placeholder-icon');

    const user = getCurrentUser();
    const loggedIn = !!user;

    if (loggedIn) {
        if (titleEl) titleEl.textContent = isKorean ? '나만의 러브트리를 시작해 보세요' : 'Start your first LoveTree';
        if (descEl) {
            descEl.textContent = isKorean
                ? '아직 만들어진 트리가 없습니다. 좋아하는 아티스트의 첫 번째 순간을 지금 기록해 보세요!'
                : 'No trees created yet. Capture the first moment of your favorite artist now!';
        }

        if (loginBtn) loginBtn.classList.add('hidden');
        if (createBtn) {
            createBtn.classList.remove('hidden');
            createBtn.textContent = isKorean ? '+ 첫 트리 만들기' : '+ Create First Tree';
        }
        if (iconBtn) iconBtn.onclick = openCreateModal;
        return;
    }

    if (titleEl) titleEl.textContent = isKorean ? '내 러브트리를 안전하게 보관하세요' : 'Keep your LoveTrees safe';
    if (descEl) {
        descEl.textContent = isKorean
            ? '로그인하면 내가 만든 트리를 모든 기기에서 확인하고 관리할 수 있습니다.'
            : 'Sign in to sync and manage your trees across all your devices.';
    }

    if (loginBtn) {
        loginBtn.classList.remove('hidden');
        loginBtn.textContent = isKorean ? '지금 로그인하기' : 'Sign In Now';
    }
    if (createBtn) createBtn.classList.add('hidden');
    if (iconBtn) {
        iconBtn.onclick = function () {
            try {
                if (typeof openSettingsModal === 'function') {
                    openSettingsModal();
                } else {
                    ensureLoggedIn();
                }
            } catch (e) {
                console.warn('마이 모달 열기 실패:', e);
            }
        };
    }
}

// ================== LANGUAGE AND TRANSLATIONS ==================

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

// ================== MODAL HANDLERS ==================

/**
 * Open create modal
 */
function openCreateModal() {
    hideError();

    // 새 트리 생성은 로그인 필수
    const user = ensureLoggedIn();
    if (!user) return;

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

    // 안전장치: 폼 제출 시에도 로그인 여부 재확인
    const user = ensureLoggedIn();
    if (!user) return;

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
        // Firestore 기준 인기 트리 섹션을 우선 시도하고, 실패 시 정적 카드로 대체
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
