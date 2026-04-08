(function () {
    function updateResultsSummary(options) {
        const el = document.getElementById('results-summary');
        if (!el) return;
        if (!options.ownerUser) {
            el.textContent = '';
            return;
        }
        if (options.ownerUiState.query) {
            el.textContent = '검색 결과 ' + options.filteredCount + '개 / 전체 ' + options.totalCount + '개';
        } else {
            el.textContent = '총 ' + options.totalCount + '개';
        }
    }

    function updatePagination(options) {
        const label = document.getElementById('pagination-label');
        const firstBtn = document.getElementById('page-first');
        const prevBtn = document.getElementById('page-prev');
        const nextBtn = document.getElementById('page-next');
        const lastBtn = document.getElementById('page-last');

        const pageSize = options.ownerUiState.pageSize || 20;
        const totalPages = Math.max(1, Math.ceil((options.filteredCount || 0) / pageSize));
        const pageIndex = options.ownerUiState.pageIndex || 0;

        if (label) {
            label.textContent = options.ownerUser ? ('페이지 ' + (pageIndex + 1) + ' / ' + totalPages) : '';
        }

        const disableAll = !options.ownerUser || (options.filteredCount || 0) === 0;
        const isFirst = pageIndex <= 0;
        const isLast = pageIndex >= totalPages - 1;

        if (firstBtn) firstBtn.disabled = disableAll || isFirst;
        if (prevBtn) prevBtn.disabled = disableAll || isFirst;
        if (nextBtn) nextBtn.disabled = disableAll || isLast;
        if (lastBtn) lastBtn.disabled = disableAll || isLast;
    }

    function updateCreateUi(options) {
        const createBtn = document.getElementById('create-tree-btn');
        const input = document.getElementById('new-tree-name');
        if (!createBtn) return;

        const name = input ? String(input.value || '').trim() : '';
        createBtn.disabled = !options.ownerUser || !name;
    }

    function renderOwnerEmptyState(options) {
        const tbody = options.tbody || document.getElementById('owner-tree-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-slate-400 text-sm">' + options.message + '</td></tr>';
    }

    function finalizeOwnerTreeRender(options) {
        updateResultsSummary({
            ownerUser: options.ownerUser,
            ownerUiState: options.ownerUiState,
            totalCount: options.totalCount,
            filteredCount: options.filteredCount
        });
        updatePagination({
            ownerUser: options.ownerUser,
            ownerUiState: options.ownerUiState,
            filteredCount: options.filteredCount
        });
        updateCreateUi({
            ownerUser: options.ownerUser
        });
        if (typeof options.scheduleSaveOwnerUiState === 'function') {
            options.scheduleSaveOwnerUiState();
        }
        if (typeof options.updateForkCheckAllButtonUi === 'function') {
            options.updateForkCheckAllButtonUi();
        }
        if (typeof options.scheduleOwnerForkAutoCheck === 'function') {
            options.scheduleOwnerForkAutoCheck(options.visibleForkIds || []);
        }
    }

    window.OwnerListUi = {
        updateResultsSummary: updateResultsSummary,
        updatePagination: updatePagination,
        updateCreateUi: updateCreateUi,
        renderOwnerEmptyState: renderOwnerEmptyState,
        finalizeOwnerTreeRender: finalizeOwnerTreeRender
    };
})();
