(function () {
    function createOwnerRuntime(options) {
        return {
            ownerUiStateStorageKey: options.ownerUiStateStorageKey,
            getOwnerUser: function () { return options.getOwnerUser(); },
            getOwnerTreesCache: function () { return options.getOwnerTreesCache(); },
            getOwnerUiState: function () { return options.getOwnerUiState(); },
            getOwnerForkStatusCache: function () { return options.getOwnerForkStatusCache(); },
            setPageIndex: function (value) { return options.setPageIndex(value); },
            resetOwnerUiState: function () { return options.resetOwnerUiState(); },
            buildOwnerViewUrlFromState: function () { return options.buildOwnerViewUrlFromState(); },
            applyOwnerUiStateToControls: function () { return options.applyOwnerUiStateToControls(); },
            renderOwnerTrees: function () { return options.renderOwnerTrees(); },
            updateCreateUi: function () { return options.updateCreateUi(); },
            loadOwnerTrees: function () { return options.loadOwnerTrees(); },
            forkCheckAll: function () { return options.forkCheckAll(); },
            copyTextToClipboard: function (text) { return options.copyTextToClipboard(text); },
            ownerShowToast: function (message) { return options.ownerShowToast(message); },
            forkCheck: function (id) { return options.forkCheck(id); },
            forkSync: function (id) { return options.forkSync(id); },
            openRenameDialog: function (id) { return options.openRenameDialog(id); },
            openDeleteDialog: function (id) { return options.openDeleteDialog(id); },
            closeRenameDialog: function () { return options.closeRenameDialog(); },
            saveRenameDialog: function () { return options.saveRenameDialog(); },
            closeDeleteDialog: function () { return options.closeDeleteDialog(); },
            confirmDeleteDialog: function () { return options.confirmDeleteDialog(); },
            updateDeleteConfirmUi: function () { return options.updateDeleteConfirmUi(); }
        };
    }

    window.OwnerRuntimeHelpers = {
        createOwnerRuntime: createOwnerRuntime
    };
})();
