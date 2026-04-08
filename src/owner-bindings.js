(function () {
    function bindOwnerEvents(runtime) {
        function addEvent(id, event, handler) {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        }

        const reRender = function () {
            runtime.setPageIndex(0);
            runtime.renderOwnerTrees();
        };

        addEvent('owner-login-btn', 'click', () => typeof signInWithGoogle === 'function' && signInWithGoogle());
        addEvent('owner-logout-btn', 'click', () => typeof signOut === 'function' && signOut());
        addEvent('refresh-btn', 'click', () => runtime.loadOwnerTrees());
        addEvent('fork-check-all-btn', 'click', () => runtime.forkCheckAll());

        addEvent('copy-view-link-btn', 'click', function () {
            const url = runtime.buildOwnerViewUrlFromState();
            runtime.copyTextToClipboard(url).then(function (ok) {
                runtime.ownerShowToast(ok ? '링크가 복사되었습니다' : '복사 실패');
            });
        });

        addEvent('reset-filters-btn', 'click', function () {
            runtime.resetOwnerUiState();
            if (typeof safeLocalStorageRemove === 'function') {
                safeLocalStorageRemove(runtime.ownerUiStateStorageKey);
            }
            runtime.applyOwnerUiStateToControls();
            runtime.renderOwnerTrees();
        });

        // Filter & Search
        addEvent('tree-search', 'input', reRender);
        addEvent('sort-select', 'change', reRender);
        addEvent('page-size', 'change', reRender);

        // Pagination
        addEvent('page-first', 'click', reRender);
        addEvent('page-prev', 'click', function () {
            runtime.setPageIndex(Math.max(0, (runtime.getOwnerUiState().pageIndex || 0) - 1));
            runtime.renderOwnerTrees();
        });
        addEvent('page-next', 'click', function () {
            runtime.setPageIndex((runtime.getOwnerUiState().pageIndex || 0) + 1);
            runtime.renderOwnerTrees();
        });
        addEvent('page-last', 'click', function () {
            const sizeEl = document.getElementById('page-size');
            const size = parseInt(String(sizeEl ? sizeEl.value : '20'), 10) || 20;
            const qEl = document.getElementById('tree-search');
            const nextIndex = window.OwnerRenderHelpers.computeLastPageIndex({
                items: runtime.getOwnerTreesCache(),
                pageSize: size,
                query: qEl ? String(qEl.value || '') : ''
            });
            runtime.setPageIndex(nextIndex);
            runtime.renderOwnerTrees();
        });

        // Create tree
        addEvent('create-tree-btn', 'click', function () {
            if (!runtime.getOwnerUser()) {
                runtime.ownerShowToast('로그인이 필요합니다.');
                return;
            }
            const input = document.getElementById('new-tree-name');
            const name = input ? String(input.value || '').trim() : '';
            if (name) window.location.href = 'editor.html?id=' + encodeURIComponent(name);
        });

        const createNameInput = document.getElementById('new-tree-name');
        if (createNameInput) {
            createNameInput.addEventListener('input', () => runtime.updateCreateUi());
            createNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('create-tree-btn');
                    if (btn && !btn.disabled) btn.click();
                }
            });
        }

        // Action delegation
        addEvent('owner-tree-tbody', 'click', function (e) {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (!action || !id) return;

            if (action === 'copy-id') {
                runtime.copyTextToClipboard(id).then(function (ok) {
                    runtime.ownerShowToast(ok ? '트리 ID가 복사되었습니다' : '복사 실패');
                });
            } else {
                const map = {
                    'fork-check': runtime.forkCheck,
                    'fork-sync': runtime.forkSync,
                    'rename': runtime.openRenameDialog,
                    'delete': runtime.openDeleteDialog
                };
                if (map[action]) map[action](id);
            }
        });

        // Dialogs
        addEvent('rename-cancel', 'click', runtime.closeRenameDialog);
        addEvent('rename-cancel-x', 'click', runtime.closeRenameDialog);
        addEvent('rename-save', 'click', runtime.saveRenameDialog);
        const renameInput = document.getElementById('rename-input');
        if (renameInput) {
            renameInput.addEventListener('keydown', (e) => e.key === 'Enter' && runtime.saveRenameDialog());
        }

        addEvent('delete-cancel', 'click', runtime.closeDeleteDialog);
        addEvent('delete-cancel-x', 'click', runtime.closeDeleteDialog);
        addEvent('delete-confirm', 'click', runtime.confirmDeleteDialog);
        const deleteInput = document.getElementById('delete-confirm-input');
        if (deleteInput) {
            deleteInput.addEventListener('input', runtime.updateDeleteConfirmUi);
            deleteInput.addEventListener('keydown', (e) => {
                const btn = document.getElementById('delete-confirm');
                if (e.key === 'Enter' && btn && !btn.disabled) runtime.confirmDeleteDialog();
            });
        }
    }


    window.OwnerBindings = {
        bindOwnerEvents: bindOwnerEvents
    };
})();
