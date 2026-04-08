/**
 * 커뮤니티 페이지 전용 스크립트
 * Firestore의 community_posts 컬렉션을 사용하여 글/댓글을 관리한다.
 */

const COMMUNITY_COLLECTION = 'community_posts';
let communityCurrentUser = null;
let communityCurrentPostId = null;
let communitySortMode = 'latest'; // 'latest' | 'popular'
let communityCurrentTreeId = '';

let communityCreateMediaUrl = '';

let communityCurrentPostData = null;

let communityPostsCache = [];
let communitySearchQuery = '';
let communityLastPostSubmitAtMs = 0;
let communityLastCommentSubmitAtMs = 0;
let communityLastPostContentSig = '';
let communityLastPostContentSigAtMs = 0;
let communityLastCommentContentSig = '';
let communityLastCommentContentSigAtMs = 0;

let communityMyTreesCache = [];
let communityMyTreesLoaded = false;
let communityTreePickerBound = false;

if (typeof window !== 'undefined') {
    window.__communityRuntime = {
        getCurrentUserForCommunity: getCurrentUserForCommunity,
        getFirestoreForCommunity: getFirestoreForCommunity,
        escapeHtml: escapeHtml,
        getCreateMediaUrl: function () {
            return communityCreateMediaUrl;
        },
        setCreateMediaUrl: function (value) {
            communityCreateMediaUrl = String(value || '').trim();
        },
        getCurrentUser: function () {
            return communityCurrentUser;
        },
        setCurrentUser: function (user) {
            communityCurrentUser = user || null;
        },
        getMyTreesCache: function () {
            return communityMyTreesCache;
        },
        setMyTreesCache: function (items) {
            communityMyTreesCache = Array.isArray(items) ? items : [];
        },
        isMyTreesLoaded: function () {
            return communityMyTreesLoaded;
        },
        setMyTreesLoaded: function (value) {
            communityMyTreesLoaded = !!value;
        },
        isTreePickerBound: function () {
            return communityTreePickerBound;
        },
        setTreePickerBound: function (value) {
            communityTreePickerBound = !!value;
        }
    };
}

/**
 * 현재 로그인한 사용자를 안전하게 반환하는 헬퍼 (커뮤니티 전용)
 */
function getCurrentUserForCommunity() {
    try {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
            return null;
        }

        return firebase.auth().currentUser;
    } catch (e) {
        console.warn('getCurrentUserForCommunity 실패:', e);
        return null;
    }
}

async function logCommunityModerationEvent(eventType, payload) {
    try {
        const db = getFirestoreForCommunity();
        if (!db) return;
        await db.collection('community_moderation_logs').add({
            eventType: String(eventType || ''),
            payload: payload || {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn('커뮤니티 moderation log 실패:', e);
    }
}

function normalizeSearchText(value) {
    return window.CommunityRenderHelpers.normalizeSearchText(value);
}

function buildCommunityThumbnailHTML(data) {
    return window.CommunityRenderHelpers.buildCommunityThumbnailHTML(data);
}

function filterCommunityPosts(posts, query) {
    return window.CommunityRenderHelpers.filterCommunityPosts(posts, query);
}

function renderCommunityPostList() {
    return window.CommunityRenderHelpers.renderCommunityPostList({
        posts: communityPostsCache,
        query: communitySearchQuery,
        onOpenPost: openCommunityPostDetail
    });
}

async function softDeleteCommunityComment(postId, commentId, options) {
    return window.CommunityWriteHelpers.softDeleteCommunityComment(Object.assign({}, options || {}, {
        db: getFirestoreForCommunity(),
        postId: postId,
        commentId: commentId
    }));
}

async function isAdminUserForCommunity(user) {
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

        const db = getFirestoreForCommunity();
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

function normalizeCommunityTreeItem(doc) {
    return window.CommunityComposeHelpers.normalizeCommunityTreeItem(doc);
}

function renderCommunityTreeSelectOptions(queryText) {
    return window.CommunityComposeHelpers.renderCommunityTreeSelectOptions(queryText);
}

function bindCommunityTreePicker() {
    return window.CommunityComposeHelpers.bindCommunityTreePicker();
}

async function loadMyTreesForCommunity(user) {
    return window.CommunityComposeHelpers.loadMyTreesForCommunity(user);
}

/**
 * Firestore 인스턴스를 안전하게 가져오는 헬퍼
 */
function getFirestoreForCommunity() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('Firebase Firestore 미초기화 상태입니다.');
        return null;
    }
    return firebase.firestore();
}

/**
 * 간단한 HTML 이스케이프 유틸리티 (XSS 방지용)
 */
function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/[&<>"']/g, function (ch) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return map[ch] || ch;
    });
}

/**
 * Firestore Timestamp 또는 Date를 사람이 읽기 좋은 문자열로 변환
 */
function formatCommunityDate(value) {
    try {
        let date = value;
        if (!value) return '';
        if (value.toDate && typeof value.toDate === 'function') {
            date = value.toDate();
        } else if (!(value instanceof Date)) {
            date = new Date(value);
        }
        return date.toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

/**
 * 게시글 카드 HTML 생성
 */
function renderCommunityPostCard(id, data) {
    return window.CommunityRenderHelpers.renderCommunityPostCard(id, data);
}

/**
 * Firestore에서 커뮤니티 게시글 목록을 불러와 렌더링
 */
async function loadCommunityPosts() {
    const db = getFirestoreForCommunity();
    if (!db) return;

    const listEl = document.getElementById('community-post-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-sm text-slate-400">불러오는 중...</div>';

    const emptyEl = document.getElementById('community-empty-state');
    if (emptyEl) emptyEl.classList.add('hidden');

    try {
        let query = db.collection(COMMUNITY_COLLECTION);
        if (communitySortMode === 'popular') {
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

        communityPostsCache = posts;
        renderCommunityPostList();
    } catch (e) {
        console.error('커뮤니티 글 로딩 실패:', e);
        listEl.innerHTML = '<div class="text-sm text-red-500">글을 불러오는 중 오류가 발생했습니다.</div>';
    }
}

/**
 * 정렬 모드(최신순/인기순)에 따라 상단 정렬 버튼 스타일을 토글
 */
function updateCommunitySortButtons() {
    return window.CommunityUiHelpers.updateCommunitySortButtons(communitySortMode);
}

/**
 * 새 글 작성 모달 열기
 */
function openCreatePostModal() {
    return window.CommunityComposeHelpers.openCreatePostModal();
}

/**
 * 새 글 작성 폼 제출 처리
 */
async function handleCreatePostSubmit(event) {
    event.preventDefault();

    const db = getFirestoreForCommunity();
    if (!db) return;

    const user = getCurrentUserForCommunity();
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
    const mediaUrl = normalizeCommunityMediaUrl(mediaInput ? mediaInput.value : communityCreateMediaUrl);

    const validation = window.CommunityFlowHelpers.validateCommunityCreatePostSubmit({
        title: title,
        content: content,
        treeId: treeId,
        mediaUrl: mediaUrl,
        titleInput: titleInput,
        contentInput: contentInput,
        lastSubmitAtMs: communityLastPostSubmitAtMs,
        lastContentSig: communityLastPostContentSig,
        lastContentSigAtMs: communityLastPostContentSigAtMs
    });
    if (!validation || !validation.ok) return;

    communityLastPostSubmitAtMs = validation.nowMs;
    communityLastPostContentSig = validation.postSig;
    communityLastPostContentSigAtMs = validation.nowMs;

    try {
        const ytId = validation.mediaUrl ? parseYouTubeVideoIdFromUrl(validation.mediaUrl) : '';

        await db.collection(COMMUNITY_COLLECTION).add({
            title: validation.title,
            content: validation.content,
            treeId: validation.treeId || '',
            mediaUrl: validation.mediaUrl || '',
            mediaType: ytId ? 'youtube' : (validation.mediaUrl ? 'link' : ''),
            authorId: user.uid,
            authorDisplayName: user.displayName || user.email || '익명',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likeCount: 0,
            commentCount: 0,
            isDeleted: false
        });

        await window.CommunityWriteHelpers.finalizeCommunityCreatePostSuccess({
            resetMediaPicker: resetCommunityMediaPicker,
            reloadPosts: loadCommunityPosts
        });
    } catch (e) {
        console.error('글 작성 실패:', e);
        showError('글 작성 중 오류가 발생했습니다.', 4000);
    }
}

/**
 * 특정 게시글 상세 + 댓글 로딩 후 모달 열기
 */
async function openCommunityPostDetail(postId) {
    const db = getFirestoreForCommunity();
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
        communityCurrentPostId = doc.id;
        communityCurrentTreeId = data && data.treeId ? String(data.treeId || '').trim() : '';

        communityCurrentPostData = data;

        const currentUser = getCurrentUserForCommunity();
        const isOwner = isOwnerOfPost(currentUser, data);
        const isAdmin = await isAdminUserForCommunity(currentUser);
        const canEditOrDelete = !!(isOwner || isAdmin);

        const detailPrepared = window.CommunityUiHelpers.prepareCommunityDetailAfterLoad({
            data: data,
            currentPostId: communityCurrentPostId,
            currentTreeId: communityCurrentTreeId,
            isAdmin: isAdmin,
            canEditOrDelete: canEditOrDelete,
            getCurrentPostId: () => communityCurrentPostId,
            getCurrentUser: getCurrentUserForCommunity,
            isOwner: isOwnerOfPost,
            isAdminCheck: isAdminUserForCommunity,
            setEditMode: window.CommunityRenderHelpers.setCommunityPostEditMode,
            setActionUiVisible: window.CommunityRenderHelpers.setCommunityPostActionUiVisible,
            getCurrentPostData: () => communityCurrentPostData,
            setCurrentPostData: (next) => {
                communityCurrentPostData = next;
            },
            updatePostById: (id, patch) => window.CommunityWriteHelpers.updateCommunityPostById({
                db: getFirestoreForCommunity(),
                postId: id,
                patch: patch
            }),
            reloadPosts: loadCommunityPosts,
            openDeleteReasonModal: window.CommunityModerationHelpers.openDeleteReasonModal,
            logModeration: logCommunityModerationEvent,
            fetchTreeSummary: window.CommunityComposeHelpers.fetchTreeSummaryForCommunity
        });
        if (!detailPrepared || detailPrepared.hidden) return;

        await window.CommunitySyncHelpers.finalizeCommunityDetailOpen({
            dialog: dialog,
            postId: doc.id,
            loadComments: loadCommunityComments
        });
    } catch (e) {
        console.error('게시글 상세 로딩 실패:', e);
        showError('게시글을 불러오는 중 오류가 발생했습니다.', 4000);
    }
}

/**
 * 특정 게시글의 댓글 목록을 로딩하여 렌더링
 */
async function loadCommunityComments(postId) {
    const db = getFirestoreForCommunity();
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

        const currentUser = getCurrentUserForCommunity();
        const isAdmin = await isAdminUserForCommunity(currentUser);

        window.CommunityFlowHelpers.renderCommunityCommentsSuccess({
            listEl,
            comments,
            currentUser,
            isAdmin,
            onDelete: async (commentId) => {
                await window.CommunitySyncHelpers.handleCommunityCommentDelete({
                    postId: postId,
                    commentId: commentId,
                    getCurrentUser: getCurrentUserForCommunity,
                    openDeleteReasonModal: openDeleteReasonModal,
                    softDelete: softDeleteCommunityComment,
                    logModeration: logCommunityModerationEvent,
                    reloadComments: loadCommunityComments,
                    reloadPosts: loadCommunityPosts
                });
            }
        });
    } catch (e) {
        console.error('댓글 로딩 실패:', e);
        window.CommunityWriteHelpers.setCommunityCommentListState(listEl, 'error');
    }
}

/**
 * 댓글 작성 폼 처리
 */
async function handleCommentFormSubmit(event) {
    event.preventDefault();

    const db = getFirestoreForCommunity();
    if (!db) return;

    if (!communityCurrentPostId) {
        showError('선택된 게시글이 없습니다.', 3000);
        return;
    }

    const user = getCurrentUserForCommunity();
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
    if (nowMs - communityLastCommentSubmitAtMs < 3000) {
        showError('잠시 후 다시 시도해 주세요.', 2000);
        return;
    }
    communityLastCommentSubmitAtMs = nowMs;

    const commentSig = (String(communityCurrentPostId || '') + '\n' + content).trim();
    if (commentSig && commentSig === communityLastCommentContentSig && (nowMs - communityLastCommentContentSigAtMs) < 30000) {
        showError('동일한 댓글이 반복되고 있습니다. 잠시 후 다시 시도해 주세요.', 3000);
        return;
    }
    communityLastCommentContentSig = commentSig;
    communityLastCommentContentSigAtMs = nowMs;

    try {
        await db.collection(COMMUNITY_COLLECTION)
            .doc(communityCurrentPostId)
            .collection('comments')
            .add({
                content,
                authorId: user.uid,
                authorDisplayName: user.displayName || user.email || '익명',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isDeleted: false
            });

        await db.collection(COMMUNITY_COLLECTION)
            .doc(communityCurrentPostId)
            .update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

        if (input) input.value = '';
        await loadCommunityComments(communityCurrentPostId);
    } catch (e) {
        console.error('댓글 작성 실패:', e);
        showError('댓글 작성 중 오류가 발생했습니다.', 4000);
    }
}

/**
 * 커뮤니티 페이지 초기화
 */
function initCommunityPage() {
    window.CommunityUiHelpers.bindCommunityTopControls({
        onOpenCreate: openCreatePostModal,
        onSubmitCreate: handleCreatePostSubmit,
        onBindMediaPicker: bindCommunityMediaPicker,
        onSubmitComment: handleCommentFormSubmit,
        onChangeSort: (nextMode) => {
            communitySortMode = nextMode === 'popular' ? 'popular' : 'latest';
            updateCommunitySortButtons();
            loadCommunityPosts();
        },
        onSearchInput: (value) => {
            communitySearchQuery = value || '';
            renderCommunityPostList();
        },
        onSearchClear: (searchInput) => {
            communitySearchQuery = '';
            if (searchInput) searchInput.value = '';
            renderCommunityPostList();
        }
    });

    window.CommunityRuntimeHelpers.bootstrapCommunityAuth({
        getCurrentUser: getCurrentUserForCommunity,
        onReady: (user) => {
            window.CommunitySyncHelpers.syncCommunityBootstrapState({
                user: user,
                setCurrentUser: function (nextUser) {
                    communityCurrentUser = nextUser;
                },
                updateSortButtons: updateCommunitySortButtons,
                loadPosts: loadCommunityPosts,
                bindTreePicker: bindCommunityTreePicker,
                loadMyTrees: loadMyTreesForCommunity
            });
        },
        onFallback: (user) => {
            window.CommunitySyncHelpers.syncCommunityBootstrapState({
                user: user || null,
                setCurrentUser: function (nextUser) {
                    communityCurrentUser = nextUser || null;
                },
                updateSortButtons: updateCommunitySortButtons,
                loadPosts: loadCommunityPosts,
                bindTreePicker: bindCommunityTreePicker,
                loadMyTrees: loadMyTreesForCommunity
            });
        }
    });
}

try {
    window.onAuthReady = function (user) {
        window.CommunitySyncHelpers.syncCommunityAuthState(user, {
            setCurrentUser: function (nextUser) {
                communityCurrentUser = nextUser;
            },
            resetMyTrees: function () {
                communityMyTreesCache = [];
                communityMyTreesLoaded = false;
            },
            loadMyTrees: loadMyTreesForCommunity
        });
    };
} catch (e) {
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommunityPage);
} else {
    initCommunityPage();
}
