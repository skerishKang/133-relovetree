/**
 * 커뮤니티 페이지 전용 스크립트
 * Firestore의 community_posts 컬렉션을 사용하여 글/댓글을 관리한다.
 */

const COMMUNITY_COLLECTION = 'community_posts';
let communityCurrentUser = null;
let communityCurrentPostId = null;

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
    const title = escapeHtml(data.title || '제목 없음');
    const rawContent = data.content || '';
    const snippet = escapeHtml(rawContent.length > 120 ? rawContent.slice(0, 120) + '…' : rawContent);
    const author = escapeHtml(data.authorDisplayName || '익명');
    const created = formatCommunityDate(data.createdAt);

    return `
        <article data-post-id="${id}"
            class="cursor-pointer bg-white/90 border border-slate-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition-shadow">
            <h2 class="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1">${title}</h2>
            <p class="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">${snippet}</p>
            <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>${author}</span>
                <span>${created}</span>
            </div>
        </article>
    `;
}

/**
 * Firestore에서 커뮤니티 게시글 목록을 불러와 렌더링
 */
async function loadCommunityPosts() {
    const db = getFirestoreForCommunity();
    if (!db) return;

    const listEl = document.getElementById('community-post-list');
    const emptyEl = document.getElementById('community-empty-state');
    if (!listEl) return;

    listEl.innerHTML = '<div class="text-sm text-slate-400">불러오는 중...</div>';
    if (emptyEl) emptyEl.classList.add('hidden');

    try {
        const snapshot = await db.collection(COMMUNITY_COLLECTION)
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();

        if (snapshot.empty) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }

        const posts = [];
        snapshot.forEach(doc => {
            posts.push({ id: doc.id, data: doc.data() || {} });
        });

        listEl.innerHTML = posts.map(p => renderCommunityPostCard(p.id, p.data)).join('');

        // 카드 클릭 이벤트 바인딩
        listEl.querySelectorAll('[data-post-id]').forEach(el => {
            const postId = el.getAttribute('data-post-id');
            if (!postId) return;
            el.addEventListener('click', () => openCommunityPostDetail(postId));
        });
    } catch (e) {
        console.error('커뮤니티 글 로딩 실패:', e);
        listEl.innerHTML = '<div class="text-sm text-red-500">글을 불러오는 중 오류가 발생했습니다.</div>';
    }
}

/**
 * 새 글 작성 모달 열기
 */
function openCreatePostModal() {
    const user = getCurrentUserForCommunity();
    if (!user) {
        // 커뮤니티에서는 한국어 메시지만 사용
        showError('로그인이 필요합니다. 상단의 로그인 버튼을 눌러 주세요.', 4000);
        return;
    }

    const dialog = document.getElementById('create-post-modal');
    const titleInput = document.getElementById('community-title');
    const contentInput = document.getElementById('community-content');

    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';

    if (dialog) {
        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', 'open');
        }
    }
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
    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!title) {
        showError('제목을 입력해 주세요.', 3000);
        titleInput && titleInput.focus();
        return;
    }
    if (!content) {
        showError('내용을 입력해 주세요.', 3000);
        contentInput && contentInput.focus();
        return;
    }

    try {
        await db.collection(COMMUNITY_COLLECTION).add({
            title,
            content,
            authorId: user.uid,
            authorDisplayName: user.displayName || user.email || '익명',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likeCount: 0,
            commentCount: 0,
            isDeleted: false
        });

        closeModal('create-post-modal');
        await loadCommunityPosts();
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

    const dialog = document.getElementById('post-detail-modal');
    const titleEl = document.getElementById('detail-title');
    const metaEl = document.getElementById('detail-meta');
    const contentEl = document.getElementById('detail-content');

    if (!dialog || !titleEl || !metaEl || !contentEl) return;

    try {
        const doc = await db.collection(COMMUNITY_COLLECTION).doc(postId).get();
        if (!doc.exists) {
            showError('게시글을 찾을 수 없습니다.', 3000);
            return;
        }

        const data = doc.data() || {};
        communityCurrentPostId = doc.id;

        titleEl.textContent = data.title || '제목 없음';
        const created = formatCommunityDate(data.createdAt);
        const author = data.authorDisplayName || '익명';
        metaEl.textContent = `${author} · ${created}`;
        contentEl.textContent = data.content || '';

        await loadCommunityComments(doc.id);

        if (typeof dialog.showModal === 'function') {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', 'open');
        }
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

    listEl.innerHTML = '<div class="text-xs text-slate-400">댓글을 불러오는 중...</div>';

    try {
        const snapshot = await db.collection(COMMUNITY_COLLECTION)
            .doc(postId)
            .collection('comments')
            .orderBy('createdAt', 'asc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            listEl.innerHTML = '<div class="text-xs text-slate-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>';
            return;
        }

        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, data: doc.data() || {} });
        });

        listEl.innerHTML = comments.map(({ data }) => {
            const author = escapeHtml(data.authorDisplayName || '익명');
            const text = escapeHtml(data.content || '');
            const created = formatCommunityDate(data.createdAt);
            return `
                <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold text-slate-700">${author}</span>
                        <span class="text-[10px] text-slate-400">${created}</span>
                    </div>
                    <p class="text-xs text-slate-700 whitespace-pre-wrap">${text}</p>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('댓글 로딩 실패:', e);
        listEl.innerHTML = '<div class="text-xs text-red-500">댓글을 불러오는 중 오류가 발생했습니다.</div>';
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
    const createBtn = document.getElementById('btn-open-create-post');
    const createForm = document.getElementById('create-post-form');
    const commentForm = document.getElementById('comment-form');

    if (createBtn) {
        createBtn.addEventListener('click', openCreatePostModal);
    }
    if (createForm) {
        createForm.addEventListener('submit', handleCreatePostSubmit);
    }
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentFormSubmit);
    }

    // 인증 상태를 기다렸다가 현재 사용자 캐시 후 글 목록 로딩
    if (typeof waitForAuth === 'function') {
        waitForAuth().then((user) => {
            communityCurrentUser = user;
            loadCommunityPosts();
        }).catch((e) => {
            console.error('waitForAuth 실패:', e);
            loadCommunityPosts();
        });
    } else {
        // 혹시 waitForAuth가 없더라도 최소한 리스트는 로딩
        loadCommunityPosts();
    }
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommunityPage);
} else {
    initCommunityPage();
}
