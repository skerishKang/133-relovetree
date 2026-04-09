// ================== SEARCH (MVP) ==================

var SEARCH_MODE = 'all';
var SEARCH_QUERY = '';
var SEARCH_PAGE = 1;
const SEARCH_PAGE_SIZE = 8;

var myTreesCache = [];
var recentCreatedTreesCache = [];
var searchAllCache = [];
var homeSettings = (typeof window !== 'undefined' && window.ReloveIndexSettings) ? window.ReloveIndexSettings : {};

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
    const href = opts.href || `/pages/editor.html?id=${encodeURIComponent(card.id || '')}`;
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
        const href = `/pages/editor.html?id=${encodeURIComponent(tree.id || '')}`;
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
        wrap.classList.add('is-hidden');
        info.textContent = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
    wrap.classList.remove('is-hidden');
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
        const db = window.postgresDB;
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
        doFallbackRender();
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        doFallbackRender();
        return;
    }

    try {
        const db = window.postgresDB;
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

        if (!trees || trees.length === 0) {
            doFallbackRender();
            return;
        }

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
        doFallbackRender();
    }
}

function doFallbackRender() {
    const container = document.getElementById('popular-feed');
    if (!container) {
        console.warn('Fallback: popular-feed container not found');
        return;
    }
    
    if (typeof window.renderArtistCards === 'function') {
        window.renderArtistCards(window.IndexArtists.POPULAR_ARTISTS);
    } else if (typeof window.IndexRender !== 'undefined' && typeof window.IndexRender.renderArtistCards === 'function') {
        window.IndexRender.renderArtistCards(window.IndexArtists.POPULAR_ARTISTS);
    } else {
        console.error('Fallback renderArtistCards function not found');
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


// Global exports for /src/entries/index.js
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
window.openSearchModalFromMy = openSearchModalFromMy;
window.setSearchMode = setSearchMode;
window.runSearchFromUI = runSearchFromUI;
window.searchPrevPage = searchPrevPage;
window.searchNextPage = searchNextPage;
window.renderHomeTreeCard = renderHomeTreeCard;
window.getCurrentUser = getCurrentUser;
window.ensureLoggedIn = ensureLoggedIn;
window.loadPopularTrees = loadPopularTrees;
window.filterTreesByQuery = filterTreesByQuery;
window.renderSearchResults = renderSearchResults;
window.updateSearchPagination = updateSearchPagination;
window.ensureAllSearchCacheLoaded = ensureAllSearchCacheLoaded;
window.runSearch = runSearch;
window.getTreeMetaSummary = getTreeMetaSummary;

// Attach state variables to window for safety
window.SEARCH_MODE = SEARCH_MODE;
window.SEARCH_QUERY = SEARCH_QUERY;
window.SEARCH_PAGE = SEARCH_PAGE;
window.SEARCH_PAGE_SIZE = SEARCH_PAGE_SIZE;
window.myTreesCache = myTreesCache;
window.recentCreatedTreesCache = recentCreatedTreesCache;
window.searchAllCache = searchAllCache;
window.homeSettings = homeSettings;
