/**
 * Relovetree - Main Index Page Logic
 * 모듈: index-i18n.js, index-artists.js, index-utils.js, index-data.js, index-render.js, index-settings.js, index-search.js, index-runtime.js
 * 중복 함수는 index-runtime.js를 사용
 */

// ================== DATA AND CONSTANTS (Delegated) ==================
// POPULAR_ARTISTS now in src/index-artists.js -> window.IndexArtists.POPULAR_ARTISTS
// DEFAULT_THUMBNAIL now in src/index-artists.js -> window.IndexArtists.DEFAULT_THUMBNAIL

// ================== DATA ORCHESTRATION (Delegated to index-runtime.js) ==================
// loadRecentTrees -> window.IndexRuntime.loadRecentTrees
// loadUserTreesFromFirestore -> window.IndexRuntime.loadUserTreesFromFirestore
// loadRecentCreatedTrees -> window.IndexRuntime.loadRecentCreatedTrees
// Mobile menu helpers -> window.IndexRuntime

/**
 * Migrate local trees to account (user action handler)
 */
async function migrateLocalTreesToAccount() {
    const user = getCurrentUser();
    if (!user) {
        const message = window.IndexI18n.isKorean
            ? '로그인이 필요합니다. 하단의 [마이] 탭에서 먼저 로그인해 주세요.'
            : 'Login is required. Please sign in from the [My] tab first.';
        showError(message, 4000);
        return;
    }

    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        showError(window.IndexI18n.isKorean ? '저장소 초기화 중입니다. 잠시 후 다시 시도해 주세요.' : 'Storage is not ready. Please try again.', 4000);
        return;
    }

    const confirmed = window.confirm('이 기기에만 저장된 러브트리를 현재 계정으로 모두 가져올까요?\n같은 ID의 트리가 이미 계정에 있으면 건너뜜니다.');
    if (!confirmed) return;

    const migratedNames = await window.IndexDataLoader.migrateLocalTrees(user);

    if (migratedNames.length > 0) {
        const message = window.IndexI18n.isKorean
            ? '로컬 러브트리 ' + migratedNames.length + '개를 계정으로 가져왔습니다.'
            : 'Imported ' + migratedNames.length + ' local trees into your account.';
        showError(message, 4000);
        await window.IndexRuntime.loadUserTreesFromFirestore(user);
    } else {
        const message = window.IndexI18n.isKorean
            ? '가져올 로컬 러브트리를 찾지 못했습니다.'
            : 'No local trees to import.';
        showError(message, 3000);
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

        const settingsBtn = document.getElementById('settings-btn');
        const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
        const searchBtn = document.getElementById('search-btn');

        if (settingsBtn && typeof window.homeSettings.openSettingsModal === 'function') {
            settingsBtn.addEventListener('click', window.homeSettings.openSettingsModal);
        }

        if (mobileSettingsBtn && typeof window.homeSettings.openSettingsModal === 'function') {
            mobileSettingsBtn.addEventListener('click', window.homeSettings.openSettingsModal);
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', window.openSearchModal);
        }

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
        showError('페이지 로딩 중 오류가 발생했습니다.', 3000);
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
    if (document.hidden) {
        console.log('Page hidden - pausing operations');
    } else {
        console.log('Page visible - resuming operations');
    }
});

/**
 * Handle profile button click
 */
function handleProfileClick() {
    showError(window.IndexI18n.isKorean ? '로그인 기능은 준비 중입니다.' : 'Login feature is coming soon.', 2000);
}

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
        window.IndexRuntime.loadUserTreesFromFirestore(user);
    } else {
        window.IndexRuntime.loadRecentTrees();
    }
};

// closeModal, hideError already exposed via shared.js
