(function () {
    function getCommunityDetailElements() {
        return {
            dialog: document.getElementById('post-detail-modal'),
            titleEl: document.getElementById('detail-title'),
            metaEl: document.getElementById('detail-meta'),
            contentEl: document.getElementById('detail-content'),
            treeActionsEl: document.getElementById('detail-tree-actions'),
            treeOpenEl: document.getElementById('detail-tree-open'),
            treeForkBtn: document.getElementById('detail-tree-fork'),
            treeSummaryEl: document.getElementById('detail-tree-summary'),
            imagesWrap: document.getElementById('detail-images'),
            postActionsWrap: document.getElementById('detail-post-actions'),
            postEditBtn: document.getElementById('detail-post-edit'),
            postDeleteBtn: document.getElementById('detail-post-delete')
        };
    }

    function resetCommunityDetailModalState(elements) {
        const refs = elements || {};
        if (refs.titleEl) refs.titleEl.textContent = '';
        if (refs.metaEl) refs.metaEl.textContent = '';
        if (refs.contentEl) refs.contentEl.textContent = '';
        if (refs.treeActionsEl) refs.treeActionsEl.classList.add('hidden');
        if (refs.treeSummaryEl) {
            refs.treeSummaryEl.classList.add('hidden');
            refs.treeSummaryEl.innerHTML = '';
        }
        if (refs.imagesWrap) {
            refs.imagesWrap.classList.add('hidden');
            refs.imagesWrap.innerHTML = '';
        }
        if (refs.postActionsWrap) refs.postActionsWrap.classList.add('hidden');
    }

    function bootstrapCommunityAuth(options) {
        const opts = options || {};
        const onReady = typeof opts.onReady === 'function' ? opts.onReady : function () {};
        const onFallback = typeof opts.onFallback === 'function' ? opts.onFallback : function () {};
        const getCurrentUser = typeof opts.getCurrentUser === 'function' ? opts.getCurrentUser : function () { return null; };

        if (typeof waitForAuth === 'function') {
            waitForAuth().then(function (user) {
                onReady(user);
            }).catch(function (e) {
                console.error('waitForAuth 실패:', e);
                onFallback(null);
            });
            return;
        }

        onFallback(getCurrentUser());
    }

    function runCommunityReloadSequence(options) {
        const opts = options || {};
        const user = opts.user || null;

        if (typeof opts.setCurrentUser === 'function') {
            opts.setCurrentUser(user);
        }
        if (typeof opts.updateSortButtons === 'function') {
            opts.updateSortButtons();
        }
        if (typeof opts.loadPosts === 'function') {
            opts.loadPosts();
        }
        if (typeof opts.bindTreePicker === 'function') {
            opts.bindTreePicker();
        }
        if (typeof opts.loadMyTrees === 'function') {
            opts.loadMyTrees(user);
        }
    }

    window.CommunityRuntimeHelpers = {
        getCommunityDetailElements: getCommunityDetailElements,
        resetCommunityDetailModalState: resetCommunityDetailModalState,
        bootstrapCommunityAuth: bootstrapCommunityAuth,
        runCommunityReloadSequence: runCommunityReloadSequence
    };
})();
