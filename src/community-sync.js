(function () {
    function syncCommunityAuthState(user, options) {
        const opts = options || {};
        if (typeof opts.setCurrentUser === 'function') {
            opts.setCurrentUser(user || null);
        }
        if (typeof opts.resetMyTrees === 'function') {
            opts.resetMyTrees();
        }
        if (typeof opts.loadMyTrees === 'function') {
            return opts.loadMyTrees(user || null);
        }
        return Promise.resolve();
    }

    async function finalizeCommunityDetailOpen(options) {
        const opts = options || {};
        if (typeof opts.loadComments === 'function') {
            await opts.loadComments(opts.postId);
        }

        const dialog = opts.dialog;
        if (!dialog) return;

        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', 'open');
        }
    }

    function syncCommunityBootstrapState(options) {
        const opts = options || {};
        if (window.CommunityRuntimeHelpers && typeof window.CommunityRuntimeHelpers.runCommunityReloadSequence === 'function') {
            window.CommunityRuntimeHelpers.runCommunityReloadSequence({
                user: opts.user || null,
                setCurrentUser: opts.setCurrentUser,
                updateSortButtons: opts.updateSortButtons,
                loadPosts: opts.loadPosts,
                bindTreePicker: opts.bindTreePicker,
                loadMyTrees: opts.loadMyTrees
            });
        }
    }

    async function handleCommunityCommentDelete(options) {
        const opts = options || {};
        try {
            const currentUser = typeof opts.getCurrentUser === 'function' ? opts.getCurrentUser() : null;
            if (!currentUser) {
                showError('로그인이 필요합니다.', 3000);
                return;
            }

            const commentId = String(opts.commentId || '');
            const postId = String(opts.postId || '');
            if (!commentId || !postId) return;

            const ok = confirm('이 댓글을 삭제할까요?');
            if (!ok) return;

            const modalRes = await opts.openDeleteReasonModal({
                title: '댓글 삭제',
                desc: '삭제 사유를 입력해 주세요. (선택)'
            });
            if (!modalRes || modalRes.canceled) return;
            const reason = modalRes.reason || '';

            const res = await opts.softDelete(postId, commentId, {
                deletedByUid: String(currentUser.uid || ''),
                deletedByEmail: String(currentUser.email || ''),
                deletedReason: reason
            });
            if (!res || !res.ok) {
                showError((res && res.error) ? res.error : '삭제 실패', 4000);
                return;
            }

            if (typeof opts.logModeration === 'function') {
                await opts.logModeration('comment_delete', {
                    postId: postId,
                    commentId: commentId,
                    deletedBy: String(currentUser.uid || ''),
                    deletedByEmail: String(currentUser.email || ''),
                    deletedReason: reason
                });
            }

            if (typeof opts.reloadComments === 'function') {
                await opts.reloadComments(postId);
            }
            if (typeof opts.reloadPosts === 'function') {
                await opts.reloadPosts();
            }
        } catch (err) {
            console.error('댓글 삭제 실패:', err);
            showError('댓글 삭제 실패', 4000);
        }
    }

    window.CommunitySyncHelpers = {
        syncCommunityAuthState: syncCommunityAuthState,
        finalizeCommunityDetailOpen: finalizeCommunityDetailOpen,
        syncCommunityBootstrapState: syncCommunityBootstrapState,
        handleCommunityCommentDelete: handleCommunityCommentDelete
    };
})();
