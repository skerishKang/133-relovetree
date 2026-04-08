(function () {
    function bindCommunityTopControls(options) {
        const opts = options || {};
        const createBtn = document.getElementById('btn-open-create-post');
        const createForm = document.getElementById('create-post-form');
        const commentForm = document.getElementById('comment-form');
        const sortLatestBtn = document.getElementById('community-sort-latest');
        const sortPopularBtn = document.getElementById('community-sort-popular');
        const searchInput = document.getElementById('community-search');
        const searchClearBtn = document.getElementById('community-search-clear');

        if (createBtn && typeof opts.onOpenCreate === 'function') {
            createBtn.addEventListener('click', opts.onOpenCreate);
        }
        if (createForm && typeof opts.onSubmitCreate === 'function') {
            createForm.addEventListener('submit', opts.onSubmitCreate);
        }
        if (typeof opts.onBindMediaPicker === 'function') {
            opts.onBindMediaPicker();
        }
        if (commentForm && typeof opts.onSubmitComment === 'function') {
            commentForm.addEventListener('submit', opts.onSubmitComment);
        }

        if (sortLatestBtn && sortPopularBtn && typeof opts.onChangeSort === 'function') {
            sortLatestBtn.addEventListener('click', function () {
                opts.onChangeSort('latest');
            });
            sortPopularBtn.addEventListener('click', function () {
                opts.onChangeSort('popular');
            });
        }

        if (searchInput && typeof opts.onSearchInput === 'function') {
            searchInput.addEventListener('input', function () {
                opts.onSearchInput(searchInput.value || '');
            });
        }

        if (searchClearBtn && typeof opts.onSearchClear === 'function') {
            searchClearBtn.addEventListener('click', function () {
                opts.onSearchClear(searchInput || null);
            });
        }
    }

    function updateCommunitySortButtons(sortMode) {
        const latestBtn = document.getElementById('community-sort-latest');
        const popularBtn = document.getElementById('community-sort-popular');

        if (!latestBtn || !popularBtn) return;

        const activeClass = 'px-3 py-1 rounded-full bg-white text-slate-800 font-semibold shadow-sm';
        const inactiveClass = 'px-3 py-1 rounded-full text-slate-500 hover:text-slate-800';

        if (sortMode === 'popular') {
            popularBtn.className = activeClass;
            latestBtn.className = inactiveClass;
        } else {
            latestBtn.className = activeClass;
            popularBtn.className = inactiveClass;
        }
    }

    function enhanceCommunityDetailModal(options) {
        const opts = options || {};
        const data = opts.data || {};
        const currentPostId = String(opts.currentPostId || '');
        const currentTreeId = String(opts.currentTreeId || '');

        const titleEl = document.getElementById('detail-title');
        const contentEl = document.getElementById('detail-content');
        const treeActionsEl = document.getElementById('detail-tree-actions');
        const treeOpenEl = document.getElementById('detail-tree-open');
        const treeForkBtn = document.getElementById('detail-tree-fork');
        const postActionsWrap = document.getElementById('detail-post-actions');
        const postEditBtn = document.getElementById('detail-post-edit');
        const postDeleteBtn = document.getElementById('detail-post-delete');
        const imagesWrap = document.getElementById('detail-images');

        if (typeof opts.setEditMode === 'function') {
            opts.setEditMode(false);
        }
        if (typeof opts.setActionUiVisible === 'function') {
            opts.setActionUiVisible(false);
            opts.setActionUiVisible(!!opts.canEditOrDelete);
        }

        if (imagesWrap && window.CommunityRenderHelpers && typeof window.CommunityRenderHelpers.renderCommunityDetailMedia === 'function') {
            try {
                window.CommunityRenderHelpers.renderCommunityDetailMedia(data);
            } catch (e) {
            }
        }

        if (treeActionsEl && treeOpenEl && treeForkBtn && window.CommunityRenderHelpers && typeof window.CommunityRenderHelpers.setupCommunityTreeActions === 'function') {
            try {
                window.CommunityRenderHelpers.setupCommunityTreeActions({
                    treeId: currentTreeId,
                    postId: currentPostId,
                    fetchTreeSummary: opts.fetchTreeSummary,
                    getCurrentPostId: function () {
                        return (typeof opts.getCurrentPostId === 'function') ? opts.getCurrentPostId() : currentPostId;
                    }
                });
            } catch (e) {
            }
        }

        try {
            window.CommunityFlowHelpers.bindCommunityDetailActionHandlers({
                data: data,
                currentPostId: currentPostId,
                canEditOrDelete: opts.canEditOrDelete,
                titleEl: titleEl,
                contentEl: contentEl,
                postActionsWrap: postActionsWrap,
                postEditBtn: postEditBtn,
                postDeleteBtn: postDeleteBtn,
                getCurrentUser: opts.getCurrentUser,
                isOwner: opts.isOwner,
                isAdmin: opts.isAdmin,
                setEditMode: opts.setEditMode,
                setActionUiVisible: opts.setActionUiVisible,
                getCurrentPostData: opts.getCurrentPostData,
                setCurrentPostData: opts.setCurrentPostData,
                updatePostById: opts.updatePostById,
                reloadPosts: opts.reloadPosts,
                openDeleteReasonModal: opts.openDeleteReasonModal,
                logModeration: opts.logModeration
            });
        } catch (e) {
            if (typeof opts.setActionUiVisible === 'function') {
                opts.setActionUiVisible(false);
            }
        }
    }

    function prepareCommunityDetailAfterLoad(options) {
        const opts = options || {};
        const data = opts.data || {};

        if (!opts.isAdmin && data && data.isDeleted === true) {
            showError('삭제된 게시글입니다.', 3000);
            closeModal('post-detail-modal');
            return { ok: false, hidden: true };
        }

        if (window.CommunityRenderHelpers && typeof window.CommunityRenderHelpers.fillCommunityPostDetail === 'function') {
            window.CommunityRenderHelpers.fillCommunityPostDetail(data, {
                isAdmin: !!opts.isAdmin
            });
        }

        enhanceCommunityDetailModal({
            data: data,
            currentPostId: opts.currentPostId,
            currentTreeId: opts.currentTreeId,
            canEditOrDelete: opts.canEditOrDelete,
            getCurrentPostId: opts.getCurrentPostId,
            getCurrentUser: opts.getCurrentUser,
            isOwner: opts.isOwner,
            isAdmin: opts.isAdminCheck,
            setEditMode: opts.setEditMode,
            setActionUiVisible: opts.setActionUiVisible,
            getCurrentPostData: opts.getCurrentPostData,
            setCurrentPostData: opts.setCurrentPostData,
            updatePostById: opts.updatePostById,
            reloadPosts: opts.reloadPosts,
            openDeleteReasonModal: opts.openDeleteReasonModal,
            logModeration: opts.logModeration,
            fetchTreeSummary: opts.fetchTreeSummary
        });

        return { ok: true, hidden: false };
    }

    window.CommunityUiHelpers = {
        bindCommunityTopControls: bindCommunityTopControls,
        updateCommunitySortButtons: updateCommunitySortButtons,
        enhanceCommunityDetailModal: enhanceCommunityDetailModal,
        prepareCommunityDetailAfterLoad: prepareCommunityDetailAfterLoad
    };
})();
