(function () {
    function isValidSortKey(v) {
        return v === 'updated_desc'
            || v === 'updated_asc'
            || v === 'name_asc'
            || v === 'name_desc'
            || v === 'nodes_desc'
            || v === 'likes_desc'
            || v === 'views_desc';
    }

    function parseOwnerUiStateFromUrl(urlKeys) {
        const params = new URLSearchParams(window.location.search || '');
        const result = {};
        let hasAny = false;

        const q = params.get(urlKeys.query);
        if (q != null) {
            result.query = String(q);
            hasAny = true;
        }

        const sortKey = params.get(urlKeys.sortKey);
        if (sortKey && isValidSortKey(sortKey)) {
            result.sortKey = sortKey;
            hasAny = true;
        }

        const size = params.get(urlKeys.pageSize);
        if (size) {
            const n = parseInt(String(size), 10);
            if (!isNaN(n) && (n === 10 || n === 20 || n === 50)) {
                result.pageSize = n;
                hasAny = true;
            }
        }

        const page = params.get(urlKeys.pageIndex);
        if (page) {
            const n = parseInt(String(page), 10);
            if (!isNaN(n) && n >= 1) {
                result.pageIndex = n - 1;
                hasAny = true;
            }
        }

        return { hasAny: hasAny, state: result };
    }

    function applyOwnerUiStatePatch(state, patch) {
        if (!patch || typeof patch !== 'object') return state;
        if (typeof patch.query === 'string') state.query = patch.query;
        if (typeof patch.sortKey === 'string' && isValidSortKey(patch.sortKey)) state.sortKey = patch.sortKey;
        if (typeof patch.pageSize === 'number' && (patch.pageSize === 10 || patch.pageSize === 20 || patch.pageSize === 50)) state.pageSize = patch.pageSize;
        if (typeof patch.pageIndex === 'number' && patch.pageIndex >= 0) state.pageIndex = patch.pageIndex;
        return state;
    }

    function buildOwnerViewUrlFromState(state, urlKeys) {
        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();

        const q = String(state.query || '').trim();
        const sortKey = String(state.sortKey || 'updated_desc');
        const size = state.pageSize || 20;
        const page = (state.pageIndex || 0) + 1;

        if (q) params.set(urlKeys.query, q);
        if (sortKey && sortKey !== 'updated_desc') params.set(urlKeys.sortKey, sortKey);
        if (size && size !== 20) params.set(urlKeys.pageSize, String(size));
        if (page && page !== 1) params.set(urlKeys.pageIndex, String(page));

        const qs = params.toString();
        return qs ? (base + '?' + qs) : base;
    }

    function updateOwnerUrlFromState(state, urlKeys) {
        try {
            const url = buildOwnerViewUrlFromState(state, urlKeys);
            window.history.replaceState({}, '', url);
        } catch (e) {
        }
    }

    function loadOwnerUiStateFromStorage(state, storageKey) {
        const saved = safeLocalStorageGet(storageKey, null);
        if (!saved || typeof saved !== 'object') return state;

        if (typeof saved.pageIndex === 'number' && saved.pageIndex >= 0) state.pageIndex = saved.pageIndex;
        if (typeof saved.pageSize === 'number' && saved.pageSize > 0) state.pageSize = saved.pageSize;
        if (typeof saved.sortKey === 'string') state.sortKey = saved.sortKey;
        if (typeof saved.query === 'string') state.query = saved.query;
        return state;
    }

    function applyOwnerUiStateToControls(state) {
        const searchInput = document.getElementById('tree-search');
        if (searchInput && typeof state.query === 'string') searchInput.value = state.query;

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect && state.sortKey) sortSelect.value = state.sortKey;

        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect && state.pageSize) pageSizeSelect.value = String(state.pageSize);
    }

    function scheduleSaveOwnerUiState(options) {
        try {
            if (options.getTimer()) window.clearTimeout(options.getTimer());
        } catch (e) {
        }

        const nextTimer = window.setTimeout(function () {
            safeLocalStorageSet(options.storageKey, {
                pageIndex: options.state.pageIndex || 0,
                pageSize: options.state.pageSize || 20,
                sortKey: options.state.sortKey || 'updated_desc',
                query: options.state.query || ''
            });

            updateOwnerUrlFromState(options.state, options.urlKeys);
        }, 200);

        options.setTimer(nextTimer);
    }

    function setOwnerAuthUi(user) {
        const loginBtn = document.getElementById('owner-login-btn');
        const logoutBtn = document.getElementById('owner-logout-btn');
        const subtitle = document.getElementById('owner-subtitle');

        if (user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (subtitle) subtitle.textContent = user.email ? ('로그인됨: ' + user.email) : '로그인됨';
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (subtitle) subtitle.textContent = '로그인이 필요합니다. (본인 트리만 표시)';
        }
    }

    window.OwnerUiStateHelpers = {
        isValidSortKey: isValidSortKey,
        parseOwnerUiStateFromUrl: parseOwnerUiStateFromUrl,
        applyOwnerUiStatePatch: applyOwnerUiStatePatch,
        buildOwnerViewUrlFromState: buildOwnerViewUrlFromState,
        updateOwnerUrlFromState: updateOwnerUrlFromState,
        loadOwnerUiStateFromStorage: loadOwnerUiStateFromStorage,
        applyOwnerUiStateToControls: applyOwnerUiStateToControls,
        scheduleSaveOwnerUiState: scheduleSaveOwnerUiState,
        setOwnerAuthUi: setOwnerAuthUi
    };
})();
