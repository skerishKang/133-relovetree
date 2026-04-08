(function () {
    function bindOwnerEvents(runtime) {
        const loginBtn = document.getElementById('owner-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function () {
                if (typeof signInWithGoogle === 'function') signInWithGoogle();
            });
        }

        const logoutBtn = document.getElementById('owner-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                if (typeof signOut === 'function') signOut();
            });
        }

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function () {
                runtime.loadOwnerTrees();
            });
        }

        const forkCheckAllBtn = document.getElementById('fork-check-all-btn');
        if (forkCheckAllBtn) {
            forkCheckAllBtn.addEventListener('click', function () {
                runtime.forkCheckAll();
            });
        }

        const copyViewLinkBtn = document.getElementById('copy-view-link-btn');
        if (copyViewLinkBtn) {
            copyViewLinkBtn.addEventListener('click', function () {
                const url = runtime.buildOwnerViewUrlFromState();
                runtime.copyTextToClipboard(url).then(function (ok) {
                    runtime.ownerShowToast(ok ? '링크가 복사되었습니다' : '복사 실패');
                });
            });
        }

        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function () {
                runtime.resetOwnerUiState();
                safeLocalStorageRemove(runtime.ownerUiStateStorageKey);
                runtime.applyOwnerUiStateToControls();
                runtime.renderOwnerTrees();
            });
        }

        const searchInput = document.getElementById('tree-search');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                runtime.setPageIndex(0);
                runtime.renderOwnerTrees();
            });
        }

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                runtime.setPageIndex(0);
                runtime.renderOwnerTrees();
            });
        }

        const pageSizeSelect = document.getElementById('page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', function () {
                runtime.setPageIndex(0);
                runtime.renderOwnerTrees();
            });
        }

        const pageFirst = document.getElementById('page-first');
        if (pageFirst) {
            pageFirst.addEventListener('click', function () {
                runtime.setPageIndex(0);
                runtime.renderOwnerTrees();
            });
        }

        const pagePrev = document.getElementById('page-prev');
        if (pagePrev) {
            pagePrev.addEventListener('click', function () {
                runtime.setPageIndex(Math.max(0, (runtime.getOwnerUiState().pageIndex || 0) - 1));
                runtime.renderOwnerTrees();
            });
        }

        const pageNext = document.getElementById('page-next');
        if (pageNext) {
            pageNext.addEventListener('click', function () {
                runtime.setPageIndex((runtime.getOwnerUiState().pageIndex || 0) + 1);
                runtime.renderOwnerTrees();
            });
        }

        const pageLast = document.getElementById('page-last');
        if (pageLast) {
            pageLast.addEventListener('click', function () {
                const sizeEl = document.getElementById('page-size');
                const parsed = sizeEl ? parseInt(String(sizeEl.value || '20'), 10) : 20;
                const size = (!isNaN(parsed) && parsed > 0) ? parsed : 20;
                const qEl = document.getElementById('tree-search');
                const q = qEl ? String(qEl.value || '') : '';
                const nextIndex = window.OwnerRenderHelpers.computeLastPageIndex({
                    items: runtime.getOwnerTreesCache(),
                    pageSize: size,
                    query: q
                });
                runtime.setPageIndex(nextIndex);
                runtime.renderOwnerTrees();
            });
        }

        const createBtn = document.getElementById('create-tree-btn');
        if (createBtn) {
            createBtn.addEventListener('click', function () {
                if (!runtime.getOwnerUser()) {
                    runtime.ownerShowToast('로그인이 필요합니다.');
                    return;
                }
                const input = document.getElementById('new-tree-name');
                const name = input ? String(input.value || '').trim() : '';
                if (!name) return;
                window.location.href = 'editor.html?id=' + encodeURIComponent(name);
            });
        }

        const createNameInput = document.getElementById('new-tree-name');
        if (createNameInput) {
            createNameInput.addEventListener('input', function () {
                runtime.updateCreateUi();
            });
            createNameInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('create-tree-btn');
                    if (btn && !btn.disabled) btn.click();
                }
            });
        }

        const tbody = document.getElementById('owner-tree-tbody');
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                if (!action || !id) return;

                if (action === 'copy-id') {
                    runtime.copyTextToClipboard(id).then(function (ok) {
                        runtime.ownerShowToast(ok ? '트리 ID가 복사되었습니다' : '복사 실패');
                    });
                } else if (action === 'fork-check') {
                    runtime.forkCheck(id);
                } else if (action === 'fork-sync') {
                    runtime.forkSync(id);
                } else if (action === 'rename') {
                    runtime.openRenameDialog(id);
                } else if (action === 'delete') {
                    runtime.openDeleteDialog(id);
                }
            });
        }

        const renameCancel = document.getElementById('rename-cancel');
        if (renameCancel) renameCancel.addEventListener('click', runtime.closeRenameDialog);
        const renameCancelX = document.getElementById('rename-cancel-x');
        if (renameCancelX) renameCancelX.addEventListener('click', runtime.closeRenameDialog);
        const renameSave = document.getElementById('rename-save');
        if (renameSave) renameSave.addEventListener('click', runtime.saveRenameDialog);
        const renameInput = document.getElementById('rename-input');
        if (renameInput) {
            renameInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') runtime.saveRenameDialog();
            });
        }

        const deleteCancel = document.getElementById('delete-cancel');
        if (deleteCancel) deleteCancel.addEventListener('click', runtime.closeDeleteDialog);
        const deleteCancelX = document.getElementById('delete-cancel-x');
        if (deleteCancelX) deleteCancelX.addEventListener('click', runtime.closeDeleteDialog);
        const deleteConfirm = document.getElementById('delete-confirm');
        if (deleteConfirm) deleteConfirm.addEventListener('click', runtime.confirmDeleteDialog);
        const deleteInput = document.getElementById('delete-confirm-input');
        if (deleteInput) {
            deleteInput.addEventListener('input', runtime.updateDeleteConfirmUi);
            deleteInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('delete-confirm');
                    if (btn && !btn.disabled) runtime.confirmDeleteDialog();
                }
            });
        }
    }

    window.OwnerBindings = {
        bindOwnerEvents: bindOwnerEvents
    };
})();
