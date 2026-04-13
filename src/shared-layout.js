(function () {
    const LAYOUT_PAGE_ALLOWLIST = new Set(['community', 'owner']);

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
        const isCommunity = a === 'community';
        const isOwner = a === 'owner';

        const communityClass = isCommunity
            ? 'ui-link-nav ui-link-nav-active'
            : 'ui-link-nav';
        const ownerClass = isOwner
            ? 'ui-link-nav ui-link-nav-active'
            : 'ui-link-nav';

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
            const active = page === 'community' ? 'community' : (page === 'owner' ? 'owner' : '');

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
     * Centralized Auth UI Handler 
     * Handles the GNB login/logout button states across all standard pages.
     */
    function updateLTAuthUI(user) {
        const authItem = document.getElementById('nav-auth-item') || document.querySelector('.btn-pill-auth');
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (!authItem) return;

        if (user) {
            authItem.textContent = '내 트리';
            authItem.href = '/pages/my-trees.html';
            authItem.classList.add('logged-in');
            if (logoutBtn) logoutBtn.classList.remove('is-hidden');
            
            // For community page active state
            const commItem = document.getElementById('nav-community-item');
            if (commItem && window.location.pathname.includes('community')) {
                commItem.classList.add('active');
            }
        } else {
            authItem.textContent = '로그인';
            authItem.href = '/pages/login.html';
            authItem.classList.remove('logged-in');
            if (logoutBtn) logoutBtn.classList.add('is-hidden');
        }
    }

    /**
     * Standard Auth UI Initialization
     * Consolidates auth wiring from all standard pages.
     * Handles: onAuthReady callback, currentUser check, logout button binding
     * 
     * @param {Object} options - Configuration options
     * @param {boolean} options.skipOnAuthReady - Skip onAuthReady callback registration
     * @param {boolean} options.skipCurrentUserCheck - Skip setTimeout currentUser check
     * @param {boolean} options.skipLogoutBinding - Skip nav-logout-btn click binding
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
        
        // 3. Bind logout button (if not skipped)
        if (!options.skipLogoutBinding) {
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
