(function () {
    const COMMUNITY_COLLECTION = 'community_posts';

    async function isAdminUserForCommunity(ctx, user) {
        try {
            if (!user) return false;
            const email = String(user.email || '').toLowerCase();

            try {
                if (typeof AUTH_CONFIG !== 'undefined' && AUTH_CONFIG && Array.isArray(AUTH_CONFIG.adminEmails)) {
                    const list = AUTH_CONFIG.adminEmails.map((x) => String(x || '').toLowerCase());
                    if (email && list.includes(email)) return true;
                }
            } catch (e) {
            }

            const db = ctx.getDb();
            if (!db) return false;
            const snap = await db.collection('users').doc(user.uid).get();
            if (!snap.exists) return false;
            const data = snap.data() || {};
            return String(data.role || '').toLowerCase() === 'admin';
        } catch (e) {
            return false;
        }
    }

    function isOwnerOfPost(user, postData) {
        try {
            if (!user || !postData) return false;
            return String(postData.authorId || '') === String(user.uid || '');
        } catch (e) {
            return false;
        }
    }

    async function loadCommunityPosts(ctx) {
        const db = ctx.getDb();
        if (!db) return;

        const listEl = document.getElementById('community-post-list');
        if (!listEl) return;
        listEl.innerHTML = '<div class="text-sm text-slate-400">불러오는 중...</div>';

        const emptyEl = document.getElementById('community-empty-state');
        if (emptyEl) emptyEl.classList.add('is-hidden');

        try {
            let query = db.collection(COMMUNITY_COLLECTION);
            if (ctx.getSortMode() === 'popular') {
                query = query.orderBy('commentCount', 'desc');
            } else {
                query = query.orderBy('createdAt', 'desc');
            }

            const snapshot = await query
                .where('isDeleted', '==', false)
                .limit(30)
                .get();

            const posts = [];
            snapshot.forEach(doc => {
                posts.push({ id: doc.id, data: doc.data() || {} });
            });

            ctx.setPostsCache(posts);
            ctx.renderPostList();
        } catch (e) {
            console.error('커뮤니티 글 로딩 실패:', e);
            listEl.innerHTML = '<div class="text-sm text-red-500">글을 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    async function handleCreatePostSubmit(ctx, event) {
        event.preventDefault();

        const db = ctx.getDb();
        if (!db) return;

        const user = ctx.getCurrentUser();
        if (!user) {
            showError('로그인이 필요합니다. 상단의 로그인 버튼을 눌러 주세요.', 4000);
            return;
        }

        const titleInput = document.getElementById('community-title');
        const contentInput = document.getElementById('community-content');
        const treeIdInput = document.getElementById('community-tree-id');
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        const treeId = treeIdInput ? treeIdInput.value.trim() : '';

        const mediaInput = document.getElementById('community-media-url');
        const mediaUrl = normalizeCommunityMediaUrl(mediaInput ? mediaInput.value : ctx.getCreateMediaUrl());

        const validation = window.CommunityFlowHelpers.validateCommunityCreatePostSubmit({
            title: title,
            content: content,
            treeId: treeId,
            mediaUrl: mediaUrl,
            titleInput: titleInput,
            contentInput: contentInput,
            lastSubmitAtMs: ctx.getLastPostSubmitAtMs(),
            lastContentSig: ctx.getLastPostContentSig(),
            lastContentSigAtMs: ctx.getLastPostContentSigAtMs()
        });
        if (!validation || !validation.ok) return;

        ctx.setLastPostSubmitAtMs(validation.nowMs);
        ctx.setLastPostContentSig(validation.postSig);
        ctx.setLastPostContentSigAtMs(validation.nowMs);

        try {
            const ytId = validation.mediaUrl ? parseYouTubeVideoIdFromUrl(validation.mediaUrl) : '';

            await db.collection(COMMUNITY_COLLECTION).add({
                title: validation.title,
                content: validation.content,
                treeId: validation.treeId || '',
                mediaUrl: validation.mediaUrl || '',
                mediaType: ytId ? 'youtube' : (validation.mediaUrl ? 'link' : ''),
                authorId: user.uid,
                authorDisplayName: (user.displayName && user.displayName.trim()) || '러브트리 사용자',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
                isDeleted: false
            });

            await window.CommunityWriteHelpers.finalizeCommunityCreatePostSuccess({
                resetMediaPicker: resetCommunityMediaPicker,
                reloadPosts: ctx.loadPosts
            });
        } catch (e) {
            console.error('글 작성 실패:', e);
            showError('글 작성 중 오류가 발생했습니다.', 4000);
        }
    }

    async function openCommunityPostDetail(ctx, postId) {
        const db = ctx.getDb();
        if (!db) return;

        const detailEls = window.CommunityRuntimeHelpers.getCommunityDetailElements();
        const dialog = detailEls.dialog;
        if (!dialog || !detailEls.titleEl || !detailEls.metaEl || !detailEls.contentEl) return;

        window.CommunityRuntimeHelpers.resetCommunityDetailModalState(detailEls);

        try {
            const doc = await db.collection(COMMUNITY_COLLECTION).doc(postId).get();
            if (!doc.exists) {
                showError('게시글을 찾을 수 없습니다.', 3000);
                return;
            }

            const data = doc.data() || {};
            ctx.setCurrentPostId(doc.id);
            ctx.setCurrentTreeId(data && data.treeId ? String(data.treeId || '').trim() : '');
            ctx.setCurrentPostData(data);

            const currentUser = ctx.getCurrentUser();
            const isOwner = isOwnerOfPost(currentUser, data);
            const isAdmin = await isAdminUserForCommunity(ctx, currentUser);
            const canEditOrDelete = !!(isOwner || isAdmin);

            const detailPrepared = window.CommunityUiHelpers.prepareCommunityDetailAfterLoad({
                data: data,
                currentPostId: ctx.getCurrentPostId(),
                currentTreeId: ctx.getCurrentTreeId(),
                isAdmin: isAdmin,
                canEditOrDelete: canEditOrDelete,
                getCurrentPostId: ctx.getCurrentPostId,
                getCurrentUser: ctx.getCurrentUser,
                isOwner: isOwnerOfPost,
                isAdminCheck: function (user) {
                    return isAdminUserForCommunity(ctx, user);
                },
                setEditMode: window.CommunityRenderHelpers.setCommunityPostEditMode,
                setActionUiVisible: window.CommunityRenderHelpers.setCommunityPostActionUiVisible,
                getCurrentPostData: ctx.getCurrentPostData,
                setCurrentPostData: ctx.setCurrentPostData,
                updatePostById: (id, patch) => window.CommunityWriteHelpers.updateCommunityPostById({
                    db: ctx.getDb(),
                    postId: id,
                    patch: patch
                }),
                reloadPosts: ctx.loadPosts,
                openDeleteReasonModal: window.CommunityModerationHelpers.openDeleteReasonModal,
                logModeration: ctx.logModeration,
                fetchTreeSummary: window.CommunityComposeHelpers.fetchTreeSummaryForCommunity
            });
            if (!detailPrepared || detailPrepared.hidden) return;

            await window.CommunitySyncHelpers.finalizeCommunityDetailOpen({
                dialog: dialog,
                postId: doc.id,
                loadComments: ctx.loadComments
            });
        } catch (e) {
            console.error('게시글 상세 로딩 실패:', e);
            showError('게시글을 불러오는 중 오류가 발생했습니다.', 4000);
        }
    }

    async function loadCommunityComments(ctx, postId) {
        const db = ctx.getDb();
        if (!db) return;

        const listEl = document.getElementById('comment-list');
        if (!listEl) return;

        window.CommunityWriteHelpers.setCommunityCommentListState(listEl, 'loading');

        try {
            const snapshot = await db.collection(COMMUNITY_COLLECTION)
                .doc(postId)
                .collection('comments')
                .orderBy('createdAt', 'asc')
                .limit(100)
                .get();

            const comments = [];
            snapshot.forEach(doc => {
                comments.push({ id: doc.id, data: doc.data() || {} });
            });

            const currentUser = ctx.getCurrentUser();
            const isAdmin = await isAdminUserForCommunity(ctx, currentUser);

            window.CommunityFlowHelpers.renderCommunityCommentsSuccess({
                listEl,
                comments,
                currentUser,
                isAdmin,
                onDelete: async (commentId) => {
                    await window.CommunitySyncHelpers.handleCommunityCommentDelete({
                        postId: postId,
                        commentId: commentId,
                        getCurrentUser: ctx.getCurrentUser,
                        openDeleteReasonModal: openDeleteReasonModal,
                        softDelete: async (targetPostId, targetCommentId, options) => {
                            return window.CommunityWriteHelpers.softDeleteCommunityComment(Object.assign({}, options || {}, {
                                db: ctx.getDb(),
                                postId: targetPostId,
                                commentId: targetCommentId
                            }));
                        },
                        logModeration: ctx.logModeration,
                        reloadComments: ctx.loadComments,
                        reloadPosts: ctx.loadPosts
                    });
                }
            });
        } catch (e) {
            console.error('댓글 로딩 실패:', e);
            window.CommunityWriteHelpers.setCommunityCommentListState(listEl, 'error');
        }
    }

    async function handleCommentFormSubmit(ctx, event) {
        event.preventDefault();

        const db = ctx.getDb();
        if (!db) return;

        if (!ctx.getCurrentPostId()) {
            showError('선택된 게시글이 없습니다.', 3000);
            return;
        }

        const user = ctx.getCurrentUser();
        if (!user) {
            showError('로그인이 필요합니다. 상단의 로그인 버튼을 눌러 주세요.', 4000);
            return;
        }

        const input = document.getElementById('comment-input');
        const content = input ? input.value.trim() : '';

        if (!content) {
            showError('댓글 내용을 입력해 주세요.', 3000);
            input && input.focus();
            return;
        }

        if (content.length > 500) {
            showError('댓글은 500자 이하로 입력해 주세요.', 3000);
            input && input.focus();
            return;
        }

        const nowMs = Date.now();
        if (nowMs - ctx.getLastCommentSubmitAtMs() < 3000) {
            showError('잠시 후 다시 시도해 주세요.', 2000);
            return;
        }
        ctx.setLastCommentSubmitAtMs(nowMs);

        const commentSig = (String(ctx.getCurrentPostId() || '') + '\n' + content).trim();

        if (commentSig && commentSig === ctx.getLastCommentContentSig() && (nowMs - ctx.getLastCommentContentSigAtMs()) < 30000) {
            showError('동일한 댓글이 반복되고 있습니다. 잠시 후 다시 시도해 주세요.', 3000);
            return;
        }
        ctx.setLastCommentContentSig(commentSig);
        ctx.setLastCommentContentSigAtMs(nowMs);

        try {
            await db.collection(COMMUNITY_COLLECTION)
                .doc(ctx.getCurrentPostId())
                .collection('comments')
                .add({
                    content,
                    authorId: user.uid,
                    authorDisplayName: (user.displayName && user.displayName.trim()) || '러브트리 사용자',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isDeleted: false
                });

            await db.collection(COMMUNITY_COLLECTION)
                .doc(ctx.getCurrentPostId())
                .update({
                    commentCount: firebase.firestore.FieldValue.increment(1)
                });

            if (input) input.value = '';
            await ctx.loadComments(ctx.getCurrentPostId());
        } catch (e) {
            console.error('댓글 작성 실패:', e);
            showError('댓글 작성 중 오류가 발생했습니다.', 4000);
        }
    }

    function initCommunityPage(ctx) {
        window.CommunityUiHelpers.bindCommunityTopControls({
            onOpenCreate: window.CommunityComposeHelpers.openCreatePostModal,
            onSubmitCreate: function (event) {
                return ctx.handleCreatePostSubmit(event);
            },
            onBindMediaPicker: bindCommunityMediaPicker,
            onSubmitComment: function (event) {
                return ctx.handleCommentFormSubmit(event);
            },
            onChangeSort: (nextMode) => {
                ctx.setSortMode(nextMode === 'popular' ? 'popular' : 'latest');
                window.CommunityUiHelpers.updateCommunitySortButtons(ctx.getSortMode());
                ctx.loadPosts();
            },
            onSearchInput: (value) => {
                ctx.setSearchQuery(value || '');
                ctx.renderPostList();
            },
            onSearchClear: (searchInput) => {
                ctx.setSearchQuery('');
                if (searchInput) searchInput.value = '';
                ctx.renderPostList();
            }
        });

        window.CommunityRuntimeHelpers.bootstrapCommunityAuth({
            getCurrentUser: ctx.getCurrentUser,
            onReady: (user) => {
                window.CommunitySyncHelpers.syncCommunityBootstrapState({
                    user: user,
                    setCurrentUser: ctx.setCurrentUser,
                    updateSortButtons: function () {
                        return window.CommunityUiHelpers.updateCommunitySortButtons(ctx.getSortMode());
                    },
                    loadPosts: ctx.loadPosts,
                    bindTreePicker: window.CommunityComposeHelpers.bindCommunityTreePicker,
                    loadMyTrees: window.CommunityComposeHelpers.loadMyTreesForCommunity
                });
            },
            onFallback: (user) => {
                window.CommunitySyncHelpers.syncCommunityBootstrapState({
                    user: user || null,
                    setCurrentUser: function (nextUser) {
                        ctx.setCurrentUser(nextUser || null);
                    },
                    updateSortButtons: function () {
                        return window.CommunityUiHelpers.updateCommunitySortButtons(ctx.getSortMode());
                    },
                    loadPosts: ctx.loadPosts,
                    bindTreePicker: window.CommunityComposeHelpers.bindCommunityTreePicker,
                    loadMyTrees: window.CommunityComposeHelpers.loadMyTreesForCommunity
                });
            }
        });
    }

    window.CommunityEntryFlowHelpers = {
        loadCommunityPosts,
        handleCreatePostSubmit,
        openCommunityPostDetail,
        loadCommunityComments,
        handleCommentFormSubmit,
        initCommunityPage
    };
})();
