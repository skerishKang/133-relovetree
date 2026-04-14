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

    const LAYOUT_PAGE_ALLOWLIST = new Set(['home', 'lovetree', 'community', 'owner']);

    function shouldInjectGlobalLayout() {
        try {
            if (typeof document === 'undefined') return false;
            const page = document.body ? String(document.body.getAttribute('data-page') || '') : '';
            return LAYOUT_PAGE_ALLOWLIST.has(page);
        } catch (e) {
            return false;
        }
    }

    function buildGlobalHeaderHTML(active) {
        const a = active || '';
        const isHome = a === 'home';
        const isLovetree = a === 'lovetree';
        const isCommunity = a === 'community';
        const isOwner = a === 'owner';

        const homeClass = isHome ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';
        const lovetreeClass = isLovetree ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';
        const communityClass = isCommunity ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';
        const ownerClass = isOwner ? 'ui-link-nav ui-link-nav-active' : 'ui-link-nav';

// Standard GNB for home/lovetree/community/owner (with avatar dropdown support)
  // Auth buttons are hidden until Firebase confirms auth state (two-phase render - prevents flash)
  if (isHome || isLovetree || isCommunity || isOwner) {
    return `
    <nav data-global-header="1" class="gnb-v2" role="navigation" aria-label="메인 네비게이션">
      <div class="gnb-inner shell">
        <a href="/" class="gnb-logo">Lovetree</a>
        <div class="gnb-links">
          <a href="/pages/lovetree.html" class="${lovetreeClass}">러브트리</a>
          <a href="/pages/community.html" class="${communityClass}">커뮤니티</a>

          <div id="nav-auth-container" class="auth-pending">
            <!-- Login Button (Shown when logged out, revealed after Firebase confirms no user) -->
            <a href="/pages/login.html" class="btn-pill-auth is-hidden" id="nav-login-btn">로그인</a>

            <!-- User Group (Shown when logged in, revealed after Firebase confirms user) -->
            <div id="nav-user-group" class="gnb-user-group is-hidden">
                        <a href="/pages/my-trees.html" class="btn-pill-auth" style="background: #e11d48;">내 트리</a>
                        
                        <div class="avatar-container" style="position: relative;">
                            <button id="nav-avatar-btn" class="avatar-btn" aria-label="사용자 메뉴">
                                <img id="nav-avatar-img" src="/assets/image/default-avatar.png" alt="Profile">
                            </button>
                            
                            <div id="nav-dropdown" class="gnb-dropdown">
                                <a href="/pages/settings.html" class="dropdown-item">⚙️ 설정</a>
                                <button id="nav-logout-btn" class="dropdown-item dropdown-item-logout">🚪 로그아웃</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>
            `;
        }

        // Community/Owner style header (with search area)
        return `
    <nav data-global-header="1" class="top-nav" role="navigation" aria-label="메인 네비게이션">
        <div class="top-nav-inner">
            <div class="top-nav-group">
                <a href="/index.html" class="brand-link">
                    <div class="brand-mark brand-mark-sm" aria-hidden="true">L</div>
                    <div class="brand-copy">
                        <span class="brand-title">LoveTree</span>
                        <span class="brand-subtitle">나의 덕질 타임라인</span>
                    </div>
                </a>
                <a href="/pages/community.html" class="${communityClass}">커뮤니티</a>
                <a href="/pages/owner.html" class="${ownerClass}">내 트리 관리</a>
            </div>
            <div class="top-nav-actions">
                <a href="/index.html#search" class="ui-btn-icon" title="검색" aria-label="검색">
                    <svg class="ui-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </a>
                <button id="global-settings-btn" type="button" class="nav-user-btn" title="로그인 및 설정" aria-label="로그인 및 설정">
                    <svg class="ui-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span class="is-hidden ui-inline-desktop">로그인</span>
                </button>
            </div>
        </div>
    </nav>
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

    function ensureGlobalLayoutInjected() {
        try {
            if (!shouldInjectGlobalLayout()) return;
            if (!document.body) return;
            if (document.querySelector('nav[data-global-header="1"]')) return;

            const page = document.body ? String(document.body.getAttribute('data-page') || '') : '';
            // Map data-page to active state for GNB
            let active = '';
            if (page === 'home' || page === 'lovetree' || page === 'community' || page === 'owner') {
                active = page;
            }

            const headerHTML = buildGlobalHeaderHTML(active);
            const temp = document.createElement('div');
            temp.innerHTML = headerHTML;
            const nav = temp.firstElementChild;
            if (nav) {
                document.body.insertBefore(nav, document.body.firstChild);
            }

            if (!document.getElementById('settings-modal')) {
                const modalWrap = document.createElement('div');
                modalWrap.innerHTML = buildGlobalMyModalHTML();
                const modalEl = modalWrap.firstElementChild;
                if (modalEl) {
                    document.body.appendChild(modalEl);
                }
            }

            const btn = document.getElementById('global-settings-btn');
            if (btn) {
                btn.addEventListener('click', function () {
                    const modal = document.getElementById('settings-modal');
                    if (!modal) return;
                    try {
                        if (typeof modal.showModal === 'function') {
                            modal.showModal();
                        } else {
                            modal.setAttribute('open', 'open');
                        }
                    } catch (e) {
                    }
                });
            }

            const myModal = document.getElementById('settings-modal');
            if (myModal && !myModal.dataset.outsideClickBound) {
                myModal.dataset.outsideClickBound = '1';
                myModal.addEventListener('click', function (e) {
                    try {
                        const rect = myModal.getBoundingClientRect();
                        const x = e.clientX;
                        const y = e.clientY;
                        const isOutside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
                        if (isOutside) {
                            if (typeof myModal.close === 'function') {
                                myModal.close();
                            } else {
                                myModal.removeAttribute('open');
                            }
                        }
                    } catch (err) {
                    }
                });
            }
        } catch (e) {
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
        const avatarBtn = document.getElementById('nav-avatar-btn');
        const dropdown = document.getElementById('nav-dropdown');
        const logoutBtn = document.getElementById('nav-logout-btn');

        if (user) {
            if (loginBtn) loginBtn.classList.add('is-hidden');
            if (userGroup) {
                userGroup.classList.remove('is-hidden');
                // Bind dropdown events when user logs in and element becomes visible
                if (avatarBtn && dropdown) {
                    avatarBtn.onclick = function(e) {
                        e.stopPropagation();
                        dropdown.classList.toggle('active');
                    };
                }
                if (logoutBtn) {
                    logoutBtn.onclick = function() {
                        if (window.signOut) window.signOut();
                    };
                }
            }
            if (avatarImg && user.photoURL) {
                avatarImg.src = user.photoURL;
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('is-hidden');
            if (userGroup) userGroup.classList.add('is-hidden');
            if (dropdown) dropdown.classList.remove('active');
        }
        
        // Global outside click handler (always active)
        document.onclick = function(e) {
            if (dropdown && dropdown.classList.contains('active')) {
                if (!dropdown.contains(e.target) && (!avatarBtn || !avatarBtn.contains(e.target))) {
                    dropdown.classList.remove('active');
                }
            }
        };
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
                if (window.updateLTAuthUI) window.updateLTAuthUI(user);
            };
        }
        
        // 2. Fallback currentUser check after 1s (if not skipped)
        if (!options.skipCurrentUserCheck) {
            setTimeout(function() {
                if (window.firebase && firebase.auth().currentUser && window.updateLTAuthUI) {
                    window.updateLTAuthUI(firebase.auth().currentUser);
                }
            }, 1000);
        }
        
        // 3. Bind navigation events (legacy - now handled in updateLTAuthUI after login)
        if (!options.skipLogoutBinding) {
            // Old logout binding - kept for compatibility
            var logoutBtn = document.getElementById('nav-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (window.signOut) window.signOut();
                });
            }
        }
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
