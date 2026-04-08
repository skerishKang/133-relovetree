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
            ? 'inline-flex items-center text-sm font-semibold text-brand-600'
            : 'inline-flex items-center text-sm font-medium text-slate-600 hover:text-brand-600';
        const ownerClass = isOwner
            ? 'inline-flex items-center text-sm font-semibold text-brand-600'
            : 'inline-flex items-center text-sm font-medium text-slate-600 hover:text-brand-600';

        return `
    <nav data-global-header="1" class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40" role="navigation" aria-label="메인 네비게이션">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <a href="index.html" class="flex items-center gap-3 hover:opacity-95 transition">
                    <div class="w-8 h-8 rounded-2xl bg-brand-500 text-white text-sm font-bold flex items-center justify-center shadow-sm" aria-hidden="true">L</div>
                    <div class="flex flex-col leading-tight">
                        <span class="text-sm font-semibold tracking-tight text-slate-800">LoveTree</span>
                        <span class="hidden sm:block text-xs text-slate-500 leading-tight">나의 덕질 타임라인</span>
                    </div>
                </a>
                <a href="community.html" class="${communityClass}">커뮤니티</a>
                <a href="owner.html" class="${ownerClass}">내 트리 관리</a>
            </div>
            <div class="flex items-center gap-2">
                <a href="index.html#search" class="flex items-center justify-center w-9 h-9 rounded-full bg-white/80 border border-slate-200 shadow-sm hover:bg-slate-100 text-slate-600 hover:text-brand-600 transition-colors" title="검색" aria-label="검색">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </a>
                <button id="global-settings-btn" type="button" class="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors" title="로그인 및 설정" aria-label="로그인 및 설정">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span class="hidden sm:inline">로그인</span>
                </button>
            </div>
        </div>
    </nav>
    `;
    }

    function buildGlobalMyModalHTML() {
        return `
    <dialog id="settings-modal" class="p-0 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-slate-900">마이</h3>
                <button type="button" onclick="closeModal('settings-modal')" class="text-slate-400 hover:text-slate-600 transition-colors" aria-label="마이 닫기">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-6">
                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">계정</label>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div class="flex flex-col gap-2">
                            <button id="login-btn" type="button" class="w-full px-4 py-3 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">구글로 로그인</button>
                            <a id="email-login-link" href="login.html" class="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-center">이메일로 로그인</a>
                            <div id="user-menu" class="hidden flex flex-col gap-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <img id="user-avatar" src="" alt="Profile" class="w-10 h-10 rounded-full bg-white border border-slate-200" />
                                        <div class="min-w-0">
                                            <p class="text-sm font-bold text-slate-800 truncate" id="user-name"></p>
                                            <p class="text-xs text-slate-500 truncate">로그인됨</p>
                                        </div>
                                    </div>
                                    <a href="admin.html" id="admin-link" class="hidden text-xs font-bold text-slate-500 hover:text-brand-600">관리자</a>
                                </div>
                                <button id="logout-btn" type="button" class="w-full px-4 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-red-500 transition-colors">로그아웃</button>
                            </div>
                        </div>
                        <p class="mt-3 text-xs text-slate-500">로그인하면 내가 만든 러브트리를 계정에 저장하고, 다른 기기에서도 이어서 볼 수 있어요.</p>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">메뉴</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <a href="index.html#search" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left sm:col-span-2">검색</a>
                        <a href="index.html#recent-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">최근 방문한 트리</a>
                        <a href="index.html#discovery-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">지금 뜨는 러브트리</a>
                        <a href="index.html#my-created-trees-section" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">내 러브트리</a>
                        <a href="owner.html" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">내 트리 관리</a>
                        <a href="community.html" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left">커뮤니티</a>
                        <a href="index.html#my-theme-anchor" class="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors text-left sm:col-span-2">테마 설정</a>
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

    const api = {
        shouldInjectGlobalLayout: shouldInjectGlobalLayout,
        buildGlobalHeaderHTML: buildGlobalHeaderHTML,
        buildGlobalMyModalHTML: buildGlobalMyModalHTML,
        ensureGlobalLayoutInjected: ensureGlobalLayoutInjected
    };

    window.ReloveSharedLayout = api;
    window.shouldInjectGlobalLayout = shouldInjectGlobalLayout;
    window.buildGlobalHeaderHTML = buildGlobalHeaderHTML;
    window.buildGlobalMyModalHTML = buildGlobalMyModalHTML;
    window.ensureGlobalLayoutInjected = ensureGlobalLayoutInjected;
})();
