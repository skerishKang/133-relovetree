/**
 * 커뮤니티 페이지 전용 스크립트
 * Firestore의 community_posts 컬렉션을 사용하여 글/댓글을 관리한다.
 */

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
        getPostgresForCommunity: getPostgresForCommunity,
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
        const db = getPostgresForCommunity();
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

function getCommunityEntryContext() {
    return {
        getDb: getPostgresForCommunity,
        getCurrentUser: getCurrentUserForCommunity,
        setCurrentUser: function (user) {
            communityCurrentUser = user || null;
        },
        getSortMode: function () {
            return communitySortMode;
        },
        setSortMode: function (mode) {
            communitySortMode = mode === 'popular' ? 'popular' : 'latest';
        },
        getSearchQuery: function () {
            return communitySearchQuery;
        },
        setSearchQuery: function (query) {
            communitySearchQuery = String(query || '');
        },
        getPostsCache: function () {
            return communityPostsCache;
        },
        setPostsCache: function (posts) {
            communityPostsCache = Array.isArray(posts) ? posts : [];
        },
        getCurrentPostId: function () {
            return communityCurrentPostId;
        },
        setCurrentPostId: function (postId) {
            communityCurrentPostId = postId || null;
        },
        getCurrentTreeId: function () {
            return communityCurrentTreeId;
        },
        setCurrentTreeId: function (treeId) {
            communityCurrentTreeId = String(treeId || '').trim();
        },
        getCurrentPostData: function () {
            return communityCurrentPostData;
        },
        setCurrentPostData: function (data) {
            communityCurrentPostData = data || null;
        },
        getCreateMediaUrl: function () {
            return communityCreateMediaUrl;
        },
        getLastPostSubmitAtMs: function () {
            return communityLastPostSubmitAtMs;
        },
        setLastPostSubmitAtMs: function (value) {
            communityLastPostSubmitAtMs = Number(value || 0);
        },
        getLastPostContentSig: function () {
            return communityLastPostContentSig;
        },
        setLastPostContentSig: function (value) {
            communityLastPostContentSig = String(value || '');
        },
        getLastPostContentSigAtMs: function () {
            return communityLastPostContentSigAtMs;
        },
        setLastPostContentSigAtMs: function (value) {
            communityLastPostContentSigAtMs = Number(value || 0);
        },
        getLastCommentSubmitAtMs: function () {
            return communityLastCommentSubmitAtMs;
        },
        setLastCommentSubmitAtMs: function (value) {
            communityLastCommentSubmitAtMs = Number(value || 0);
        },
        getLastCommentContentSig: function () {
            return communityLastCommentContentSig;
        },
        setLastCommentContentSig: function (value) {
            communityLastCommentContentSig = String(value || '');
        },
        getLastCommentContentSigAtMs: function () {
            return communityLastCommentContentSigAtMs;
        },
        setLastCommentContentSigAtMs: function (value) {
            communityLastCommentContentSigAtMs = Number(value || 0);
        },
        renderPostList: renderCommunityPostList,
        logModeration: logCommunityModerationEvent,
        loadPosts: loadCommunityPosts,
        loadComments: loadCommunityComments,
        handleCreatePostSubmit: handleCreatePostSubmit,
        handleCommentFormSubmit: handleCommentFormSubmit
    };
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

/**
 * PostgreSQL community_posts 테이블을 사용하여 글/댓글을 관리한다.
 */
function getPostgresForCommunity() {
    if (!window.postgresDB) {
        console.error('PostgreSQL Compat Layer 미초기화 상태입니다.');
        return null;
    }
    return window.postgresDB;
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
 * PostgreSQL Timestamp 또는 Date를 사람이 읽기 좋은 문자열로 변환
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
 * PostgreSQL에서 커뮤니티 게시글 목록을 불러와 렌더링
 */
async function loadCommunityPosts() {
    return window.CommunityEntryFlowHelpers.loadCommunityPosts(getCommunityEntryContext());
}

/**
 * 정렬 모드(최신순/인기순)에 따라 상단 정렬 버튼 스타일을 토글
 */
function updateCommunitySortButtons() {
    return window.CommunityUiHelpers.updateCommunitySortButtons(communitySortMode);
}

/**
 * 새 글 작성 폼 제출 처리
 */
async function handleCreatePostSubmit(event) {
    return window.CommunityEntryFlowHelpers.handleCreatePostSubmit(getCommunityEntryContext(), event);
}

/**
 * 특정 게시글 상세 + 댓글 로딩 후 모달 열기
 */
async function openCommunityPostDetail(postId) {
    return window.CommunityEntryFlowHelpers.openCommunityPostDetail(getCommunityEntryContext(), postId);
}

/**
 * 특정 게시글의 댓글 목록을 로딩하여 렌더링
 */
async function loadCommunityComments(postId) {
    return window.CommunityEntryFlowHelpers.loadCommunityComments(getCommunityEntryContext(), postId);
}

/**
 * 댓글 작성 폼 처리
 */
async function handleCommentFormSubmit(event) {
    return window.CommunityEntryFlowHelpers.handleCommentFormSubmit(getCommunityEntryContext(), event);
}

/**
 * 커뮤니티 페이지 초기화
 */
function initCommunityPage() {
    return window.CommunityEntryFlowHelpers.initCommunityPage(getCommunityEntryContext());
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
            loadMyTrees: window.CommunityComposeHelpers.loadMyTreesForCommunity
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
