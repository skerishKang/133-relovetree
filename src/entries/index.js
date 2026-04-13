/**
 * Lovetree - Main Index Page Logic
 * 모듈: index-i18n.js, index-artists.js, index-utils.js, index-data.js, index-render.js, index-settings.js, index-search.js, index-runtime.js
 * 중복 함수는 index-runtime.js를 사용
 */

// ================== DATA AND CONSTANTS (Delegated) ==================
// POPULAR_ARTISTS now in src/index-artists.js -> window.IndexArtists.POPULAR_ARTISTS
// DEFAULT_THUMBNAIL now in src/index-artists.js -> window.IndexArtists.DEFAULT_THUMBNAIL

// ================== DATA ORCHESTRATION (Delegated to index-runtime.js) ==================
// loadRecentTrees -> window.IndexRuntime.loadRecentTrees
// loadUserTrees -> window.IndexRuntime.loadUserTrees
// loadRecentTrees -> window.IndexRuntime.loadRecentTreesFromDb
// Mobile menu helpers -> window.IndexRuntime

/**
 * Migrate local trees to account (user action handler)
 */
async function migrateLocalTreesToAccount() {
    const user = getCurrentUser();
    if (!user) {
        showError(window.IndexI18n.getMessage('loginRequiredMyTab'), 4000);
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        showError(window.IndexI18n.getMessage('storageNotReady'), 4000);
        return;
    }

    const confirmed = window.confirm('이 기기에만 저장된 러브트리를 현재 계정으로 모두 가져올까요?\n같은 ID의 트리가 이미 계정에 있으면 건너뜜니다.');
    if (!confirmed) return;

    const migratedNames = await window.IndexDataLoader.migrateLocalTrees(user);

    if (migratedNames.length > 0) {
        showError(window.IndexI18n.formatMessage('importLocalTreesSuccess', migratedNames.length), 4000);
        await window.IndexRuntime.loadUserTrees(user);
    } else {
        showError(window.IndexI18n.getMessage('importLocalTreesEmpty'), 3000);
    }
}

// ================== INITIALIZATION ==================

/**
 * Initialize the page
 */
function initPage() {
    window.IndexUtils.showLoading();

    try {
        window.IndexUtils.cacheElements();
        window.IndexI18n.loadLanguagePreference();

        window.IndexRender.renderArtistCards(window.IndexArtists.POPULAR_ARTISTS);
        loadPopularTrees();
        window.IndexRuntime.loadRecentCreatedTrees();
        window.IndexRuntime.loadRecentTrees();
        window.IndexI18n.updateUIText();

        window.IndexUtils.initializeLazyLoading();

        const artistNameInput = document.getElementById('artist-name');
        if (artistNameInput) {
            artistNameInput.addEventListener('input', window.IndexUtils.debounce((e) => {
                const value = e.target.value.trim();
                const error = validateArtistName(value, window.IndexI18n.isKorean);

                e.target.classList.remove('border-red-500');

                if (error) {
                    e.target.classList.add('border-red-500');
                }
            }, 300));
        }

        window.IndexUtils.bindClickIfExists('settings-btn', window.homeSettings.openSettingsModal);
        window.IndexUtils.bindClickIfExists('mobile-settings-btn', window.homeSettings.openSettingsModal);
        window.IndexUtils.bindClickIfExists('search-btn', window.openSearchModal);

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', function (e) {
                if (e && e.key === 'Enter') {
                    e.preventDefault();
                    window.runSearchFromUI();
                }
            });
        }

        if (typeof window.homeSettings.initBackgroundFileControls === 'function') {
            window.homeSettings.initBackgroundFileControls();
        }

    } catch (error) {
        console.error('Page initialization error:', error);
        showError(window.IndexI18n.getMessage('pageLoadError'), 3000);
    } finally {
        window.IndexUtils.hideLoading();
    }
}

// ================== EVENT LISTENERS ==================

function handleDomReady() {
    initPage();
    if (typeof window.homeSettings.loadBackgroundPreference === 'function') {
        window.homeSettings.loadBackgroundPreference();
    }
}

window.IndexUtils.onDomReady(handleDomReady);

// Handle page visibility change for performance
document.addEventListener('visibilitychange', () => {
  // Pause/resume page operations on visibility change
});

/**
 * Handle profile button click
 */
function handleProfileClick() {
    showError(window.IndexI18n.getMessage('loginComingSoon'), 2000);
}

/**
 * Handle Pro Upgrade Click
 */
function handleProUpgrade() {
    const user = getCurrentUser();
    if (!user) {
        alert(window.IndexI18n.getMessage('loginRequired'));
        return;
    }
    requestPayment(user.email, user.displayName);
}

Object.assign(window, {
    toggleLanguage: window.IndexI18n.toggleLanguage,
    handleProfileClick: handleProfileClick,
    handleProUpgrade: handleProUpgrade,
    toggleMobileMenu: window.IndexRuntime.toggleMobileMenu,
    navigateToHome: window.IndexRuntime.navigateToHome,
    scrollToMyTrees: window.IndexRuntime.scrollToMyTrees,
    scrollToAllTrees: window.IndexRuntime.scrollToAllTrees,
    openSearchModal: window.openSearchModal,
    closeSearchModal: window.closeSearchModal,
    openSearchModalFromMy: window.openSearchModalFromMy,
    setSearchMode: window.setSearchMode,
    runSearchFromUI: window.runSearchFromUI,
    searchPrevPage: window.searchPrevPage,
    searchNextPage: window.searchNextPage,
    migrateLocalTreesToAccount: migrateLocalTreesToAccount
});

// Auth 모듈에서 호출하는 전역 콜백: 로그인/로그아웃 시점에 최근 트리 목록을 갱신
window.onAuthReady = function (user) {
    if (user) {
        window.IndexRuntime.loadUserTrees(user);
    } else {
        window.IndexRuntime.loadRecentTrees();
    }
};

// closeModal, hideError already exposed via shared.js
