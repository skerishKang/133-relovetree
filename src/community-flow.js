(function () {
    function validateCommunityCreatePostSubmit(options) {
        const opts = options || {};
        const title = String(opts.title || '').trim();
        const content = String(opts.content || '').trim();
        const treeId = String(opts.treeId || '').trim();
        const mediaUrl = String(opts.mediaUrl || '').trim();
        const titleInput = opts.titleInput || null;
        const contentInput = opts.contentInput || null;
        const nowMs = Date.now();

        if (!title) {
            showError('제목을 입력해 주세요.', 3000);
            if (titleInput && typeof titleInput.focus === 'function') titleInput.focus();
            return { ok: false };
        }
        if (!content) {
            showError('내용을 입력해 주세요.', 3000);
            if (contentInput && typeof contentInput.focus === 'function') contentInput.focus();
            return { ok: false };
        }

        if (title.length > 80) {
            showError('제목은 80자 이하로 입력해 주세요.', 3000);
            return { ok: false };
        }
        if (content.length > 2000) {
            showError('내용은 2000자 이하로 입력해 주세요.', 3000);
            return { ok: false };
        }

        if (nowMs - Number(opts.lastSubmitAtMs || 0) < 8000) {
            showError('잠시 후 다시 시도해 주세요.', 2000);
            return { ok: false };
        }

        const postSig = (title + '\n' + content + '\n' + (treeId || '') + '\n' + (mediaUrl || '')).trim();
        if (
            postSig &&
            postSig === String(opts.lastContentSig || '') &&
            (nowMs - Number(opts.lastContentSigAtMs || 0)) < 60000
        ) {
            showError('동일한 내용이 반복되고 있습니다. 잠시 후 다시 시도해 주세요.', 3000);
            return { ok: false };
        }

        return {
            ok: true,
            title: title,
            content: content,
            treeId: treeId,
            mediaUrl: mediaUrl,
            nowMs: nowMs,
            postSig: postSig
        };
    }

    function bindCommunityDetailActionHandlers(options) {
        const opts = options || {};
        const currentPostId = String(opts.currentPostId || '');
        const data = opts.data || {};
        const titleEl = opts.titleEl || null;
        const contentEl = opts.contentEl || null;
        const postActionsWrap = opts.postActionsWrap || null;
        const postEditBtn = opts.postEditBtn || null;
        const postDeleteBtn = opts.postDeleteBtn || null;

        if (typeof opts.setActionUiVisible === 'function') {
            opts.setActionUiVisible(false);
            opts.setActionUiVisible(!!opts.canEditOrDelete);
        }

        try {
            if (!opts.canEditOrDelete && postActionsWrap) {
                postActionsWrap.classList.add('hidden');
            }

            if (!postEditBtn || !postDeleteBtn || !opts.canEditOrDelete) return;

            let editing = false;

            postEditBtn.onclick = async function () {
                try {
                    const currentUser = typeof opts.getCurrentUser === 'function' ? opts.getCurrentUser() : null;
                    if (!currentUser) {
                        showError('로그인이 필요합니다.', 3000);
                        return;
                    }

                    const currentData = typeof opts.getCurrentPostData === 'function' ? (opts.getCurrentPostData() || {}) : data;
                    const latestIsOwner = !!(typeof opts.isOwner === 'function' && opts.isOwner(currentUser, currentData));
                    const latestIsAdmin = !!(typeof opts.isAdmin === 'function' && await opts.isAdmin(currentUser));
                    if (!latestIsOwner && !latestIsAdmin) {
                        showError('권한이 없습니다.', 3000);
                        return;
                    }

                    if (!editing) {
                        editing = true;
                        if (typeof opts.setEditMode === 'function') {
                            opts.setEditMode(true, currentData);
                        }
                        return;
                    }

                    const newTitle = (titleEl && titleEl.textContent ? titleEl.textContent : '').trim();
                    const newContent = (contentEl && contentEl.textContent ? contentEl.textContent : '').trim();

                    if (!newTitle) {
                        showError('제목을 입력해 주세요.', 3000);
                        return;
                    }
                    if (!newContent) {
                        showError('내용을 입력해 주세요.', 3000);
                        return;
                    }

                    const res = await opts.updatePostById(currentPostId, {
                        title: newTitle,
                        content: newContent
                    });
                    if (!res || !res.ok) {
                        showError((res && res.error) ? res.error : '저장 실패', 4000);
                        return;
                    }

                    if (typeof opts.setCurrentPostData === 'function') {
                        opts.setCurrentPostData(Object.assign({}, currentData, {
                            title: newTitle,
                            content: newContent
                        }));
                    }

                    editing = false;
                    if (typeof opts.setEditMode === 'function') {
                        opts.setEditMode(false);
                    }
                    showError('저장되었습니다.', 2000);
                    if (typeof opts.reloadPosts === 'function') {
                        await opts.reloadPosts();
                    }
                } catch (e) {
                    console.error('게시글 수정 실패:', e);
                    showError('수정 실패', 4000);
                }
            };

            postDeleteBtn.onclick = async function () {
                try {
                    const currentData = typeof opts.getCurrentPostData === 'function' ? (opts.getCurrentPostData() || {}) : data;
                    if (editing) {
                        editing = false;
                        if (titleEl) titleEl.textContent = currentData && currentData.title ? currentData.title : '';
                        if (contentEl) contentEl.textContent = currentData && currentData.content ? currentData.content : '';
                        if (typeof opts.setEditMode === 'function') {
                            opts.setEditMode(false);
                        }
                        return;
                    }

                    const currentUser = typeof opts.getCurrentUser === 'function' ? opts.getCurrentUser() : null;
                    if (!currentUser) {
                        showError('로그인이 필요합니다.', 3000);
                        return;
                    }

                    const latestIsOwner = !!(typeof opts.isOwner === 'function' && opts.isOwner(currentUser, currentData));
                    const latestIsAdmin = !!(typeof opts.isAdmin === 'function' && await opts.isAdmin(currentUser));
                    if (!latestIsOwner && !latestIsAdmin) {
                        showError('권한이 없습니다.', 3000);
                        return;
                    }

                    const ok = confirm('이 게시글을 삭제할까요?');
                    if (!ok) return;

                    const modalRes = await opts.openDeleteReasonModal({
                        title: '게시글 삭제',
                        desc: '삭제 사유를 입력해 주세요. (선택)'
                    });
                    if (!modalRes || modalRes.canceled) return;
                    const reason = modalRes.reason || '';

                    const res = await opts.updatePostById(currentPostId, {
                        isDeleted: true,
                        deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        deletedBy: String(currentUser.uid || ''),
                        deletedByEmail: String(currentUser.email || ''),
                        deletedReason: reason
                    });
                    if (!res || !res.ok) {
                        showError((res && res.error) ? res.error : '삭제 실패', 4000);
                        return;
                    }

                    if (typeof opts.logModeration === 'function') {
                        await opts.logModeration('post_delete', {
                            postId: String(currentPostId || ''),
                            deletedBy: String(currentUser.uid || ''),
                            deletedByEmail: String(currentUser.email || ''),
                            deletedReason: reason
                        });
                    }

                    closeModal('post-detail-modal');
                    if (typeof opts.reloadPosts === 'function') {
                        await opts.reloadPosts();
                    }
                } catch (e) {
                    console.error('게시글 삭제 실패:', e);
                    showError('삭제 실패', 4000);
                }
            };
        } catch (e) {
            if (typeof opts.setActionUiVisible === 'function') {
                opts.setActionUiVisible(false);
            }
        }
    }

    function renderCommunityCommentsSuccess(options) {
        const opts = options || {};
        const listEl = opts.listEl || null;
        const comments = Array.isArray(opts.comments) ? opts.comments : [];
        if (!comments.length) {
            window.CommunityWriteHelpers.setCommunityCommentListState(listEl, 'empty');
            return;
        }
        if (listEl) {
            listEl.dataset.commentState = 'ready';
        }
        window.CommunityCommentsHelpers.renderCommunityComments(opts);
    }

    window.CommunityFlowHelpers = {
        validateCommunityCreatePostSubmit: validateCommunityCreatePostSubmit,
        bindCommunityDetailActionHandlers: bindCommunityDetailActionHandlers,
        renderCommunityCommentsSuccess: renderCommunityCommentsSuccess
    };
})();
