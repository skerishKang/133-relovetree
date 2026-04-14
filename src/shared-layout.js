/**
 * =============================================================================
 * Lovetree Shared Layout Module
 * =============================================================================
 * 
 * This module provides TWO DISTINCT responsibilities:
 * 
 * 1. GLOBAL LAYOUT INJECTION (lines 1-178)
 *    - Injects top navigation header and settings modal into specific pages
 *    - Currently applies ONLY to pages with data-page="community" or "owner"
 *    - Uses LAYOUT_PAGE_ALLOWLIST to control which pages get the injected layout
 *    - This is separate from the GNB used in most standard pages
 * 
 * 2. STANDARD AUTH UI INITIALIZATION (lines 180-246)
 *    - Centralized auth state management for all standard pages
 *    - Used by: index.html, lovetree.html, community.html, my-trees.html
 *    - NOT used by editor pages (editor has its own auth handling)
 * 
 * IMPORTANT: Editor pages do NOT use initStandardAuthUI.
 * They have their own runtime/auth flow in editor-runtime.js and editor-data.js.
 * =============================================================================
 */

(function () {
    /**
     * =============================================================================
     * PART 1: GLOBAL LAYOUT INJECTION
     * =============================================================================
     * 
     * This section handles dynamic injection of top navigation and settings modal
     * into pages that request it via data-page attribute.
     * 
     * Affected pages:
     * - Pages with data-page="home" → gets standard GNB (index.html)
     * - Pages with data-page="lovetree" → gets standard GNB (lovetree.html)
     * - Pages with data-page="community" → gets community-style header
     * - Pages with data-page="owner" → gets owner-style header
     * 
     * This provides a unified GNB across all standard pages without hardcoding.
     */

    const LAYOUT_PAGE_ALLOWLIST = new Set(['home', 'lovetree', 'community', 'owner', 'my-trees', 'settings', 'admin', 'memory-detail']);
    const ASSET_VERSION = '20260414_v10';

    function shouldInjectGlobalLayout() {
        try {
            if (typeof document === 'undefined') return false;
            const page = document.body ? String(document.body.getAttribute('data-page') || '') : '';
            if (LAYOUT_PAGE_ALLOWLIST.has(page)) return true;
            
            // Fallback for subpages
            const path = window.location.pathname;
            if (path.includes('community.html') || path.includes('my-trees.html') || path.includes('settings.html')) return true;
            
            return false;
        } catch (e) {
            return false;
        }
    }

    function buildGlobalHeaderHTML(active) {
        const a = active || '';
        const isLovetree = a === 'lovetree' || window.location.pathname.includes('lovetree.html');
        const isCommunity = a === 'community' || window.location.pathname.includes('community.html');

        const lovetreeClass = isLovetree ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';
        const communityClass = isCommunity ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';

        // Flicker Fix: Check if we have a cached login state
        let cachedUser = null;
        try {
            const stored = sessionStorage.getItem('lt_auth_cache');
            if (stored) cachedUser = JSON.parse(stored);
        } catch(e) {}

        const userGroupClass = cachedUser ? 'gnb-user-group' : 'gnb-user-group is-hidden';
        const loginBtnClass = cachedUser ? 'btn-pill-auth is-hidden' : 'btn-pill-auth';
        const avatarSrc = (cachedUser && cachedUser.photoURL) ? cachedUser.photoURL : '/assets/image/default-avatar.png';

        // Unified Modern GNB (Flicker-free via cache)
        return `
        <nav data-global-header="1" class="gnb-v2" role="navigation" aria-label="메인 네비게이션">
          <div class="gnb-inner shell">
            <a href="/" class="gnb-logo">Lovetree</a>
            <div class="gnb-links">
              <a href="/pages/lovetree.html" class="${lovetreeClass}">러브트리</a>
              <a href="/pages/community.html" class="${communityClass}">커뮤니티</a>

              <div id="nav-auth-container" class="${cachedUser ? '' : 'auth-pending'}">
                <!-- Login Button -->
                <a href="/pages/login.html" class="${loginBtnClass}" id="nav-login-btn">로그인</a>

                <!-- User Group (Pathway Restored: Settings, My Trees) -->
                <div id="nav-user-group" class="${userGroupClass}">
                    <a href="/pages/my-trees.html" class="btn-pill-auth" style="background: #e11d48;">내 트리</a>
                    
                    <div class="avatar-container" style="position: relative;">
                        <button id="nav-avatar-btn" class="avatar-btn" aria-label="사용자 메뉴">
                            <img id="nav-avatar-img" src="${avatarSrc}" alt="Profile" onerror="this.src='/assets/image/default-avatar.png'">
                        </button>
                        
    `;
    }

    function buildGlobalMyModalHTML() {
        return `
    <dialog id="settings-modal" class="modal-shell modal-shell-sm">
        <div class="modal-panel">
            <div class="modal-header modal-header-roomy">
                <h3 class="modal-title">마이</h3>
                <button type="button" onclick="closeModal('settings-modal')" class="modal-close" aria-label="마이 닫기">
                    <svg class="ui-icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-6">
                <div>
                    <label class="menu-section-label">계정</label>
                    <div class="auth-panel">
                        <div class="auth-panel-stack">
                            <button id="login-btn" type="button" class="auth-primary-btn">구글로 로그인</button>
                            <a id="email-login-link" href="/pages/login.html" class="auth-secondary-link">이메일로 로그인</a>
                            <div id="user-menu" class="user-menu-stack">
                                <div class="user-summary-row">
                                    <div class="user-summary-main">
                                        <img id="user-avatar" src="" alt="Profile" class="user-avatar-sm" />
                                        <div class="min-w-0">
                                            <p class="user-summary-name" id="user-name"></p>
                                            <p class="user-summary-status">로그인됨</p>
                                        </div>
                                    </div>
                                    <a href="/pages/admin.html" id="admin-link" class="is-hidden user-admin-link">관리자</a>
                                </div>
                                <button id="logout-btn" type="button" class="logout-btn">로그아웃</button>
                            </div>
                        </div>
                        <p class="auth-panel-copy">로그인하면 내가 만든 러브트리를 계정에 저장하고, 다른 기기에서도 이어서 볼 수 있어요.</p>
                    </div>
                </div>

                <div>
                    <label class="menu-section-label">메뉴</label>
                    <div class="menu-grid">
                        <a href="/index.html#search" class="menu-link-card menu-link-card-wide">검색</a>
                        <a href="/index.html#recent-section" class="menu-link-card">최근 방문한 트리</a>
                        <a href="/index.html#discovery-section" class="menu-link-card">지금 뜨는 러브트리</a>
                        <a href="/index.html#my-created-trees-section" class="menu-link-card">내 러브트리</a>
                        <a href="/pages/owner.html" class="menu-link-card">내 트리 관리</a>
                        <a href="/pages/community.html" class="menu-link-card">커뮤니티</a>
                        <a href="/index.html#my-theme-anchor" class="menu-link-card menu-link-card-wide">테마 설정</a>
                    </div>
                </div>
            </div>
        </div>
    </dialog>
    `;
    }

    function buildMobileBottomNavHTML() {
        const path = window.location.pathname;
        const isHome = path === '/' || path.includes('index.html');
        const isComm = path.includes('community.html');
        const isMy = path.includes('my-trees.html');
        const isSet = path.includes('settings.html');

        return `
        <nav class="gnb-mobile-bottom" role="navigation" aria-label="모바일 하단 네비게이션">
          <div class="mob-nav-inner">
            <a href="/" class="mob-nav-item ${isHome ? 'active' : ''}">
              <span class="nav-icon">🏠</span><span class="nav-label">홈</span>
            </a>
            <a href="/pages/community.html" class="mob-nav-item ${isComm ? 'active' : ''}">
              <span class="nav-icon">🧭</span><span class="nav-label">탐색</span>
            </a>
            <a href="/pages/my-trees.html" class="mob-nav-item ${isMy ? 'active' : ''}">
              <span class="nav-icon">🌱</span><span class="nav-label">내 트리</span>
            </a>
            <a href="/pages/settings.html" class="mob-nav-item ${isSet ? 'active' : ''}">
              <span class="nav-icon">⚙️</span><span class="nav-label">설정</span>
            </a>
          </div>
        </nav>
        `;
    }

    function ensureGlobalLayoutInjected() {
        try {
            // Intelligent Redirect for Mobile Users
            if (window.isMobileDevice && window.isMobileDevice()) {
                const path = window.location.pathname;
                if (path.includes('community-tree-detail.html')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const treeId = urlParams.get('treeId');
                    if (treeId) {
                        window.location.href = `/pages/mobile-tree.html?treeId=${encodeURIComponent(treeId)}&v=20260414_v10`;
                        return;
                    }
                }
            }

            if (!shouldInjectGlobalLayout()) return;
            if (!document.body) return;
            
            // Unification: Ensure we don't have multiple headers
            const existingHeader = document.querySelector('nav[data-global-header="1"]');
            if (existingHeader) existingHeader.remove();

            const headerHTML = buildGlobalHeaderHTML();
            const tempHeader = document.createElement('div');
            tempHeader.innerHTML = headerHTML;
            const nav = tempHeader.firstElementChild;
            if (nav) {
                document.body.insertBefore(nav, document.body.firstChild);
            }

            // Mobile specific: Inject Bottom Tab Bar
            if (window.isMobileDevice && window.isMobileDevice()) {
                const existingBottom = document.querySelector('.gnb-mobile-bottom');
                if (!existingBottom) {
                    const bottomHTML = buildMobileBottomNavHTML();
                    const tempBottom = document.createElement('div');
                    tempBottom.innerHTML = bottomHTML;
                    const bnav = tempBottom.firstElementChild;
                    if (bnav) document.body.appendChild(bnav);
                }
            }

            // Bind Dropdown Toggle (Pathway Fixed)
            document.addEventListener('click', function(e) {
                const btn = document.getElementById('nav-avatar-btn');
                const menu = document.getElementById('nav-dropdown');
                if (btn && btn.contains(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (menu) menu.classList.toggle('active');
                } else if (menu && menu.classList.contains('active')) {
                    if (!menu.contains(e.target)) {
                        menu.classList.remove('active');
                    }
                }
            });
        } catch (e) {
            console.warn('Layout injection failed:', e);
        }
    }

    /**
     * =============================================================================
     * PART 2: STANDARD AUTH UI
     * =============================================================================
     * 
     * Centralized Auth UI Handler for STANDARD PAGES ONLY.
     * 
     * Which pages use this:
     * - index.html (landing/home page)
     * - pages/lovetree.html (product intro)
     * - pages/community.html (discovery)
     * - pages/my-trees.html (dashboard)
     * 
     * Which pages DO NOT use this:
     * - pages/editor.html, pages/editor-desktop.html (editor has own auth handling)
     * - pages/login.html (has separate auth logic)
     * 
     * What this function does:
     * - Updates GNB (global navigation bar) based on auth state
     * - Changes "로그인" → "내 트리" when logged in
     * - Shows/hides logout button
     * - Updates link href to point to /pages/my-trees.html when logged in
     * 
     * DOM Elements expected:
     * - #nav-auth-item: The login/my-tree link in GNB
     * - #nav-logout-btn: The logout button in GNB
     * - .btn-pill-auth: Alternative selector for auth link (fallback)
     */
    function updateLTAuthUI(user) {
        const loginBtn = document.getElementById('nav-login-btn');
        const userGroup = document.getElementById('nav-user-group');
        const avatarImg = document.getElementById('nav-avatar-img');
        const logoutBtn = document.getElementById('nav-logout-btn');

        if (user) {
            // Flicker Fix: Cache the successful auth state
            try {
                sessionStorage.setItem('lt_auth_cache', JSON.stringify({
                    uid: user.uid,
                    photoURL: user.photoURL
                }));
            } catch(e) {}

            if (loginBtn) loginBtn.classList.add('is-hidden');
            if (userGroup) {
                userGroup.classList.remove('is-hidden');
                if (logoutBtn) {
                    logoutBtn.onclick = function() {
                        sessionStorage.removeItem('lt_auth_cache');
                        if (window.signOut) window.signOut();
                    };
                }
            }
            if (avatarImg && user.photoURL) {
                avatarImg.src = user.photoURL;
            }
        } else {
            sessionStorage.removeItem('lt_auth_cache');
            if (loginBtn) loginBtn.classList.remove('is-hidden');
            if (userGroup) userGroup.classList.add('is-hidden');
        }
    }

    /**
     * Standard Auth UI Initialization
     * 
     * Centralizes auth wiring for all standard (non-editor) pages.
     * This replaces the old pattern of having duplicate auth code in each HTML file.
     * 
     * WHAT THIS FUNCTION DOES:
     * 1. Registers window.onAuthReady callback → calls updateLTAuthUI(user) when auth state changes
     * 2. Checks currentUser after 1s timeout (fallback for page load race condition)
     * 3. Binds click handler for #nav-logout-btn → calls window.signOut()
     * 
     * OPTIONS:
     * - options.skipOnAuthReady: true → skip registering onAuthReady callback
     *   (Use when page has its own onAuthReady handler, like my-trees.js via FlowShared)
     * - options.skipCurrentUserCheck: true → skip the 1s timeout check
     *   (Use when page handles initial auth state differently)
     * - options.skipLogoutBinding: true → skip binding logout click handler
     *   (Use when page has no logout button, like index.html)
     * 
     * USAGE BY PAGE:
     * - index.html: initStandardAuthUI({ skipLogoutBinding: true }) // no logout btn
     * - lovetree.html: initStandardAuthUI() // standard flow
     * - community.html: initStandardAuthUI() // standard flow
     * - my-trees.js calls: initStandardAuthUI({ skipOnAuthReady: true, skipCurrentUserCheck: true })
     *                      // FlowShared.requireAuth handles primary auth
     * 
     * @param {Object} options - Configuration options (all optional)
     */
    function initStandardAuthUI(options) {
        options = options || {};
        
        // 1. Register onAuthReady callback (if not skipped)
        if (!options.skipOnAuthReady) {
window.onAuthReady = function(user) {
    // Remove auth-pending class to reveal auth buttons
    var authContainer = document.getElementById('nav-auth-container');
    if (authContainer) authContainer.classList.remove('auth-pending');
    if (window.updateLTAuthUI) window.updateLTAuthUI(user);
  };
        }
        
// 2. Fallback currentUser check after 1s (if not skipped)
  // Also removes auth-pending to reveal auth buttons regardless of auth state
  if (!options.skipCurrentUserCheck) {
    setTimeout(function() {
      var authContainer = document.getElementById('nav-auth-container');
      if (authContainer) authContainer.classList.remove('auth-pending');
      if (window.firebase && firebase.auth().currentUser && window.updateLTAuthUI) {
        window.updateLTAuthUI(firebase.auth().currentUser);
      }
    }, 1000);
  }
        
        // 3. Logout binding is handled in updateLTAuthUI (single source of truth)
  // No separate binding needed here
    }

    const api = {
        shouldInjectGlobalLayout: shouldInjectGlobalLayout,
        buildGlobalHeaderHTML: buildGlobalHeaderHTML,
        buildGlobalMyModalHTML: buildGlobalMyModalHTML,
        ensureGlobalLayoutInjected: ensureGlobalLayoutInjected,
        updateLTAuthUI: updateLTAuthUI,
        initStandardAuthUI: initStandardAuthUI
    };

    window.ReloveSharedLayout = api;
    window.shouldInjectGlobalLayout = shouldInjectGlobalLayout;
    window.buildGlobalHeaderHTML = buildGlobalHeaderHTML;
    window.buildGlobalMyModalHTML = buildGlobalMyModalHTML;
    window.ensureGlobalLayoutInjected = ensureGlobalLayoutInjected;
    window.updateLTAuthUI = updateLTAuthUI;
    window.initStandardAuthUI = initStandardAuthUI;
})();
