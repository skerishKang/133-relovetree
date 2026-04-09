(function () {
    function openRenameDialog(options) {
        if (!options.ownerUser) return;
        const dlg = document.getElementById('rename-dialog');
        const subtitle = document.getElementById('rename-dialog-subtitle');
        const input = document.getElementById('rename-input');
        if (!dlg || !input) return;

        const item = options.findTree(options.treeId);
        const currentName = item ? String(item.name || '') : '';
        options.setRenameTargetTreeId(options.treeId);
        if (subtitle) subtitle.textContent = options.treeId;
        input.value = currentName;

        try {
            if (typeof dlg.showModal === 'function') dlg.showModal();
            else dlg.setAttribute('open', '');
        } catch (e) {
        }

        setTimeout(function () {
            try {
                input.focus();
                input.select();
            } catch (e) {
            }
        }, 30);
    }

    async function saveRenameDialog(options) {
        if (!options.ownerUser) return;
        const treeId = options.getRenameTargetTreeId();
        if (!treeId) return;

        const input = document.getElementById('rename-input');
        const dlg = document.getElementById('rename-dialog');
        const nextName = input ? String(input.value || '').trim() : '';
        if (!nextName) return;

        try {
            const db = window.postgresDB;
            await db.collection('trees').doc(treeId).set({
                name: nextName,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            options.showToast('저장되었습니다');
            if (dlg && typeof dlg.close === 'function') dlg.close();
            options.setRenameTargetTreeId('');
            await options.loadOwnerTrees();
        } catch (e) {
            console.error('saveRenameDialog failed:', e);
            options.showToast('저장 실패');
        }
    }

    function closeRenameDialog(setRenameTargetTreeId) {
        const dlg = document.getElementById('rename-dialog');
        if (dlg && typeof dlg.close === 'function') dlg.close();
        setRenameTargetTreeId('');
    }

    function openDeleteDialog(options) {
        if (!options.ownerUser) return;
        const dlg = document.getElementById('delete-dialog');
        const subtitle = document.getElementById('delete-dialog-subtitle');
        const input = document.getElementById('delete-confirm-input');
        const confirmBtn = document.getElementById('delete-confirm');
        if (!dlg || !input || !confirmBtn) return;

        const item = options.findTree(options.treeId);
        const name = item ? String(item.name || '') : '';

        options.setDeleteTargetTreeId(options.treeId);
        if (subtitle) subtitle.textContent = name ? (name + ' · ' + options.treeId) : options.treeId;
        input.value = '';
        confirmBtn.disabled = true;

        try {
            if (typeof dlg.showModal === 'function') dlg.showModal();
            else dlg.setAttribute('open', '');
        } catch (e) {
        }

        setTimeout(function () {
            try {
                input.focus();
            } catch (e) {
            }
        }, 30);
    }

    function closeDeleteDialog(setDeleteTargetTreeId) {
        const dlg = document.getElementById('delete-dialog');
        if (dlg && typeof dlg.close === 'function') dlg.close();
        setDeleteTargetTreeId('');
        const input = document.getElementById('delete-confirm-input');
        if (input) input.value = '';
    }

    function updateDeleteConfirmUi(deleteTargetTreeId) {
        const input = document.getElementById('delete-confirm-input');
        const btn = document.getElementById('delete-confirm');
        if (!input || !btn) return;
        const typed = String(input.value || '').trim();
        btn.disabled = !deleteTargetTreeId || typed !== deleteTargetTreeId;
    }

    async function confirmDeleteDialog(options) {
        if (!options.ownerUser) return;
        const treeId = options.getDeleteTargetTreeId();
        if (!treeId) return;

        const input = document.getElementById('delete-confirm-input');
        const typed = input ? String(input.value || '').trim() : '';
        if (typed !== treeId) return;

        try {
            const db = window.postgresDB;
            await db.collection('trees').doc(treeId).delete();
            try {
                delete options.ownerForkStatusCache[treeId];
                options.saveForkStatusCache();
            } catch (e) {
            }
            options.showToast('삭제되었습니다');
            closeDeleteDialog(options.setDeleteTargetTreeId);
            await options.loadOwnerTrees();
        } catch (e) {
            console.error('confirmDeleteDialog failed:', e);
            options.showToast('삭제 실패');
        }
    }

    window.OwnerDialogs = {
        openRenameDialog: openRenameDialog,
        saveRenameDialog: saveRenameDialog,
        closeRenameDialog: closeRenameDialog,
        openDeleteDialog: openDeleteDialog,
        closeDeleteDialog: closeDeleteDialog,
        updateDeleteConfirmUi: updateDeleteConfirmUi,
        confirmDeleteDialog: confirmDeleteDialog
    };
})();
