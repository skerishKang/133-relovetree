(function () {
    function setCommunityCommentListState(listEl, state) {
        if (!listEl) return;
        const next = String(state || '');
        listEl.dataset.commentState = next || '';

        if (next === 'loading') {
            listEl.innerHTML = '<div class="community-comment-state">댓글을 불러오는 중...</div>';
            return;
        }

        if (next === 'error') {
            listEl.innerHTML = '<div class="community-comment-state is-error">댓글을 불러오는 중 오류가 발생했습니다.</div>';
            return;
        }

        if (next === 'empty') {
            listEl.innerHTML = '<div class="community-comment-state">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>';
        }
    }

    async function updateCommunityPostById(options) {
        const opts = options || {};
        const db = opts.db;
        const postId = String(opts.postId || '');
        const patch = opts.patch || {};

        if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
        if (!postId) return { ok: false, error: '게시글이 선택되지 않았습니다.' };

        try {
            await db.collection('community_posts')
                .doc(postId)
                .update(Object.assign({}, patch, {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }));
            return { ok: true };
        } catch (e) {
            console.error('게시글 업데이트 실패:', e);
            return { ok: false, error: '업데이트 실패' };
        }
    }

    async function updateCommunityCommentById(options) {
        const opts = options || {};
        const db = opts.db;
        const postId = String(opts.postId || '');
        const commentId = String(opts.commentId || '');
        const patch = opts.patch || {};

        if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
        if (!postId || !commentId) return { ok: false, error: '댓글을 찾을 수 없습니다.' };

        try {
            await db.collection('community_posts')
                .doc(postId)
                .collection('comments')
                .doc(commentId)
                .update(Object.assign({}, patch));
            return { ok: true };
        } catch (e) {
            console.error('댓글 업데이트 실패:', e);
            return { ok: false, error: '댓글 업데이트 실패' };
        }
    }

    async function softDeleteCommunityComment(options) {
        const opts = options || {};
        const db = opts.db;
        const postId = String(opts.postId || '');
        const commentId = String(opts.commentId || '');
        const deletedByUid = opts.deletedByUid ? String(opts.deletedByUid || '') : '';
        const deletedByEmail = opts.deletedByEmail ? String(opts.deletedByEmail || '') : '';
        const deletedReason = opts.deletedReason ? String(opts.deletedReason || '') : '';

        if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
        if (!postId || !commentId) return { ok: false, error: '댓글을 찾을 수 없습니다.' };

        try {
            await db.runTransaction(async function (tx) {
                const postRef = db.collection('community_posts').doc(postId);
                const commentRef = postRef.collection('comments').doc(commentId);

                const commentSnap = await tx.get(commentRef);
                if (!commentSnap.exists) {
                    throw new Error('comment_not_found');
                }

                const cData = commentSnap.data() || {};
                if (cData.isDeleted === true) {
                    return;
                }

                tx.update(commentRef, {
                    isDeleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deletedBy: deletedByUid || '',
                    deletedByEmail: deletedByEmail || '',
                    deletedReason: deletedReason || ''
                });
                tx.update(postRef, { commentCount: firebase.firestore.FieldValue.increment(-1) });
            });

            return { ok: true };
        } catch (e) {
            console.error('댓글 삭제 트랜잭션 실패:', e);
            return { ok: false, error: '댓글 삭제 실패' };
        }
    }

    async function finalizeCommunityCreatePostSuccess(options) {
        const opts = options || {};
        if (typeof closeModal === 'function') {
            closeModal('create-post-modal');
        }
        if (typeof opts.resetMediaPicker === 'function') {
            opts.resetMediaPicker();
        }
        if (typeof opts.reloadPosts === 'function') {
            await opts.reloadPosts();
        }
    }

    window.CommunityWriteHelpers = {
        setCommunityCommentListState: setCommunityCommentListState,
        updateCommunityPostById: updateCommunityPostById,
        updateCommunityCommentById: updateCommunityCommentById,
        softDeleteCommunityComment: softDeleteCommunityComment,
        finalizeCommunityCreatePostSuccess: finalizeCommunityCreatePostSuccess
    };
})();
