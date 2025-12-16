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

let communityMyTreesCache = [];
let communityMyTreesLoaded = false;
let communityTreePickerBound = false;

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

function normalizeSearchText(value) {
    try {
        return String(value || '').toLowerCase().trim();
    } catch (e) {
        return '';
    }
}

function buildCommunityThumbnailHTML(data) {
    try {
        const mediaUrl = data && data.mediaUrl ? String(data.mediaUrl || '').trim() : '';
        if (!mediaUrl) return '';

        const url = normalizeCommunityMediaUrl(mediaUrl);
        if (!url) return '';

        const ytId = parseYouTubeVideoIdFromUrl(url);
        if (ytId) {
            const thumb = `https://i.ytimg.com/vi/${encodeURIComponent(ytId)}/hqdefault.jpg`;
            const safeThumb = escapeHtml(thumb);
            return `
                <div class="mt-3 w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                    <img src="${safeThumb}" alt="유튜브 썸네일" class="w-full h-full object-cover" loading="lazy" />
                </div>
            `;
        }

        if (isLikelyImageUrl(url)) {
            const safe = escapeHtml(url);
            return `
                <div class="mt-3 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src="${safe}" alt="미디어 이미지" class="w-full max-h-56 object-cover" loading="lazy" />
                </div>
            `;
        }

        return '';
    } catch (e) {
        return '';
    }
}

function filterCommunityPosts(posts, query) {
    const q = normalizeSearchText(query);
    if (!q) return posts;

    return (posts || []).filter(({ data }) => {
        try {
            const title = normalizeSearchText(data && data.title);
            const author = normalizeSearchText(data && data.authorDisplayName);
            const treeId = normalizeSearchText(data && data.treeId);
            return title.includes(q) || author.includes(q) || treeId.includes(q);
        } catch (e) {
            return false;
        }
    });
}

function renderCommunityPostList() {
    const listEl = document.getElementById('community-post-list');
    const emptyEl = document.getElementById('community-empty-state');
    if (!listEl) return;

    const filtered = filterCommunityPosts(communityPostsCache, communitySearchQuery);
    if (!filtered.length) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    listEl.innerHTML = filtered.map(p => renderCommunityPostCard(p.id, p.data)).join('');

    listEl.querySelectorAll('[data-post-id]').forEach(el => {
        const postId = el.getAttribute('data-post-id');
        if (!postId) return;
        el.addEventListener('click', () => openCommunityPostDetail(postId));
    });

    listEl.querySelectorAll('a[href^="editor.html?id="]').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    listEl.querySelectorAll('button[data-action="fork-tree"]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const raw = btn.getAttribute('data-tree') || '';
                const treeId = raw ? decodeURIComponent(raw) : '';
                if (!treeId) return;

                const ok = confirm('이 트리를 내 트리로 가져올까요? 가져온 뒤에는 내 트리에서 자유롭게 수정할 수 있습니다.');
                if (!ok) return;

                if (typeof forkTreeToMyAccountBySourceTreeId !== 'function') {
                    showError('가져오기 기능을 사용할 수 없습니다.', 4000);
                    return;
                }

                const res = await forkTreeToMyAccountBySourceTreeId(treeId);
                if (!res || !res.ok) {
                    showError((res && res.error) ? res.error : '가져오기 실패', 4000);
                    return;
                }

                window.location.href = 'editor.html?id=' + encodeURIComponent(res.newTreeId);
            } catch (err) {
                console.error('커뮤니티 카드 포크 실패:', err);
                showError('가져오기 실패', 4000);
            }
        });
    });
}

async function updateCommunityCommentById(postId, commentId, patch) {
    const db = getFirestoreForCommunity();
    if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
    if (!postId || !commentId) return { ok: false, error: '댓글을 찾을 수 없습니다.' };

    try {
        await db.collection(COMMUNITY_COLLECTION)
            .doc(postId)
            .collection('comments')
            .doc(commentId)
            .update({
                ...patch
            });
        return { ok: true };
    } catch (e) {
        console.error('댓글 업데이트 실패:', e);
        return { ok: false, error: '댓글 업데이트 실패' };
    }
}

async function softDeleteCommunityComment(postId, commentId, options) {
    const db = getFirestoreForCommunity();
    if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
    if (!postId || !commentId) return { ok: false, error: '댓글을 찾을 수 없습니다.' };

    try {
        const deletedByUid = options && options.deletedByUid ? String(options.deletedByUid || '') : '';
        const deletedByEmail = options && options.deletedByEmail ? String(options.deletedByEmail || '') : '';
        const deletedReason = options && options.deletedReason ? String(options.deletedReason || '') : '';

        await db.runTransaction(async (tx) => {
            const postRef = db.collection(COMMUNITY_COLLECTION).doc(postId);
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

function setCommunityPostActionUiVisible(canEditOrDelete) {
    const wrap = document.getElementById('detail-post-actions');
    if (!wrap) return;
    if (canEditOrDelete) wrap.classList.remove('hidden');
    else wrap.classList.add('hidden');
}

function setCommunityPostEditMode(isEditMode, postData) {
    const titleEl = document.getElementById('detail-title');
    const contentEl = document.getElementById('detail-content');
    const editBtn = document.getElementById('detail-post-edit');
    const delBtn = document.getElementById('detail-post-delete');
    if (!titleEl || !contentEl || !editBtn || !delBtn) return;

    if (!isEditMode) {
        titleEl.setAttribute('contenteditable', 'false');
        contentEl.setAttribute('contenteditable', 'false');
        titleEl.classList.remove('outline', 'outline-2', 'outline-brand-400', 'rounded');
        contentEl.classList.remove('outline', 'outline-2', 'outline-brand-400', 'rounded');
        editBtn.textContent = '수정';
        delBtn.textContent = '삭제';
        return;
    }

    titleEl.setAttribute('contenteditable', 'true');
    contentEl.setAttribute('contenteditable', 'true');
    titleEl.classList.add('outline', 'outline-2', 'outline-brand-400', 'rounded');
    contentEl.classList.add('outline', 'outline-2', 'outline-brand-400', 'rounded');
    editBtn.textContent = '저장';
    delBtn.textContent = '취소';

    try {
        titleEl.focus();
    } catch (e) {
    }
}

async function updateCommunityPostById(postId, patch) {
    const db = getFirestoreForCommunity();
    if (!db) return { ok: false, error: 'DB를 사용할 수 없습니다.' };
    if (!postId) return { ok: false, error: '게시글이 선택되지 않았습니다.' };

    try {
        await db.collection(COMMUNITY_COLLECTION)
            .doc(postId)
            .update({
                ...patch,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        return { ok: true };
    } catch (e) {
        console.error('게시글 업데이트 실패:', e);
        return { ok: false, error: '업데이트 실패' };
    }
}

async function fetchTreeSummaryForCommunity(treeIdRaw) {
    try {
        if (!treeIdRaw) return null;
        if (typeof firebase === 'undefined' || !firebase.firestore) return null;
        const db = firebase.firestore();

        const treeId = (typeof extractTreeIdFromMaybeUrl === 'function')
            ? extractTreeIdFromMaybeUrl(treeIdRaw)
            : String(treeIdRaw || '').trim();

        if (!treeId) return null;

        const snap = await db.collection('trees').doc(treeId).get();
        if (!snap.exists) return null;
        const data = snap.data() || {};

        const nodeCount = typeof data.nodeCount === 'number'
            ? data.nodeCount
            : (Array.isArray(data.nodes) ? data.nodes.length : 0);

        let lastUpdatedIso = '';
        const lastUpdated = data.lastUpdated;
        if (lastUpdated && typeof lastUpdated.toDate === 'function') {
            lastUpdatedIso = lastUpdated.toDate().toISOString();
        } else if (lastUpdated) {
            try {
                lastUpdatedIso = new Date(lastUpdated).toISOString();
            } catch (e) {
                lastUpdatedIso = String(lastUpdated);
            }
        }

        return {
            treeId,
            nodeCount,
            lastUpdatedIso
        };
    } catch (e) {
        console.error('트리 요약 조회 실패:', e);
        return null;
    }
}

function normalizeCommunityTreeItem(doc) {
    const data = doc && typeof doc.data === 'function' ? (doc.data() || {}) : {};

    let lastUpdated = data.lastUpdated;
    if (lastUpdated && typeof lastUpdated.toDate === 'function') {
        lastUpdated = lastUpdated.toDate().toISOString();
    } else if (!lastUpdated) {
        lastUpdated = '';
    } else {
        try {
            lastUpdated = new Date(lastUpdated).toISOString();
        } catch (e) {
            lastUpdated = String(lastUpdated);
        }
    }

    const id = doc && doc.id ? String(doc.id) : '';
    const name = data && data.name ? String(data.name) : (id || '내 트리');

    return {
        id,
        name,
        lastUpdated,
        nodeCount: typeof data.nodeCount === 'number' ? data.nodeCount : (Array.isArray(data.nodes) ? data.nodes.length : 0)
    };
}

function renderCommunityTreeSelectOptions(queryText) {
    const selectEl = document.getElementById('community-tree-select');
    if (!selectEl) return;

    const treeIdInput = document.getElementById('community-tree-id');
    const qRaw = String(queryText || '').trim().toLowerCase();

    const items = Array.isArray(communityMyTreesCache) ? communityMyTreesCache.slice() : [];
    const filtered = qRaw
        ? items.filter((t) => {
            const id = String(t.id || '').toLowerCase();
            const name = String(t.name || '').toLowerCase();
            return id.includes(qRaw) || name.includes(qRaw);
        })
        : items;

    const currentUser = getCurrentUserForCommunity();
    if (!currentUser) {
        selectEl.innerHTML = '<option value="">(로그인 후 내 트리를 선택할 수 있어요)</option>';
        return;
    }

    if (!communityMyTreesLoaded) {
        selectEl.innerHTML = '<option value="">내 트리를 불러오는 중...</option>';
        return;
    }

    if (!filtered.length) {
        selectEl.innerHTML = '<option value="">(표시할 내 트리가 없습니다)</option>';
        return;
    }

    const currentRaw = treeIdInput ? String(treeIdInput.value || '').trim() : '';
    const currentNormalized = (typeof extractTreeIdFromMaybeUrl === 'function')
        ? extractTreeIdFromMaybeUrl(currentRaw)
        : currentRaw;

    selectEl.innerHTML = ['<option value="">(내 트리 선택 안함)</option>']
        .concat(filtered.map((t) => {
            const id = String(t.id || '');
            const name = String(t.name || id || '내 트리');
            const label = name + ' (' + id + ')';
            return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
        }))
        .join('');

    if (currentNormalized) {
        selectEl.value = currentNormalized;
        if (selectEl.value !== currentNormalized) {
            selectEl.value = '';
        }
    }
}

function bindCommunityTreePicker() {
    if (communityTreePickerBound) return;
    communityTreePickerBound = true;

    const searchEl = document.getElementById('community-tree-search');
    const selectEl = document.getElementById('community-tree-select');
    const treeIdInput = document.getElementById('community-tree-id');

    if (searchEl) {
        searchEl.addEventListener('input', () => {
            renderCommunityTreeSelectOptions(searchEl.value);
        });
    }

    if (selectEl && treeIdInput) {
        selectEl.addEventListener('change', () => {
            const v = String(selectEl.value || '').trim();
            if (!v) {
                treeIdInput.value = '';
                return;
            }
            treeIdInput.value = v;
        });
    }

    if (treeIdInput && selectEl) {
        treeIdInput.addEventListener('input', () => {
            const raw = String(treeIdInput.value || '').trim();
            const normalized = (typeof extractTreeIdFromMaybeUrl === 'function')
                ? extractTreeIdFromMaybeUrl(raw)
                : raw;

            if (!normalized) {
                selectEl.value = '';
                return;
            }

            selectEl.value = normalized;
            if (selectEl.value !== normalized) {
                selectEl.value = '';
            }
        });
    }
}

async function loadMyTreesForCommunity(user) {
    const db = getFirestoreForCommunity();
    if (!db) return;

    const selectEl = document.getElementById('community-tree-select');
    if (!selectEl) return;

    if (!user) {
        communityMyTreesCache = [];
        communityMyTreesLoaded = false;
        renderCommunityTreeSelectOptions('');
        return;
    }

    selectEl.innerHTML = '<option value="">내 트리를 불러오는 중...</option>';
    communityMyTreesLoaded = false;

    try {
        const snapshot = await db.collection('trees')
            .where('ownerId', '==', user.uid)
            .limit(100)
            .get();

        const items = [];
        snapshot.forEach((doc) => {
            items.push(normalizeCommunityTreeItem(doc));
        });

        items.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
        communityMyTreesCache = items;
        communityMyTreesLoaded = true;

        renderCommunityTreeSelectOptions('');
    } catch (e) {
        console.error('내 트리 목록 로딩 실패:', e);
        communityMyTreesCache = [];
        communityMyTreesLoaded = false;
        selectEl.innerHTML = '<option value="">내 트리를 불러오지 못했습니다</option>';
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
    const likeCount = data.likeCount || 0;
    const commentCount = data.commentCount || 0;

    const treeIdRaw = (data && data.treeId) ? String(data.treeId || '').trim() : '';
    const treeIdForOpen = (typeof extractTreeIdFromMaybeUrl === 'function')
        ? extractTreeIdFromMaybeUrl(treeIdRaw)
        : treeIdRaw;

    const treeBadge = treeIdForOpen
        ? `<div class="mt-2 flex flex-wrap gap-2 items-center text-[11px]">
                <a class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50" href="editor.html?id=${encodeURIComponent(treeIdForOpen)}" target="_blank">트리 보기</a>
                <button type="button" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" data-action="fork-tree" data-tree="${encodeURIComponent(treeIdRaw)}">내 트리로 가져오기</button>
           </div>`
        : '';

    const thumb = buildCommunityThumbnailHTML(data);

    return `
        <article data-post-id="${id}"
            class="cursor-pointer bg-white/90 border border-slate-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition-shadow">
            <h2 class="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1">${title}</h2>
            <p class="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">${snippet}</p>
            ${thumb}
            ${treeBadge}
            <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>${author}</span>
                <div class="flex items-center gap-2">
                    <span>${created}</span>
                    <span class="flex items-center gap-1 text-[10px] text-slate-400">
                        <span>💬</span>
                        <span>${commentCount}</span>
                    </span>
                </div>
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
    const latestBtn = document.getElementById('community-sort-latest');
    const popularBtn = document.getElementById('community-sort-popular');

    if (!latestBtn || !popularBtn) return;

    const activeClass = 'px-3 py-1 rounded-full bg-white text-slate-800 font-semibold shadow-sm';
    const inactiveClass = 'px-3 py-1 rounded-full text-slate-500 hover:text-slate-800';

    if (communitySortMode === 'popular') {
        popularBtn.className = activeClass;
        latestBtn.className = inactiveClass;
    } else {
        latestBtn.className = activeClass;
        popularBtn.className = inactiveClass;
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

    communityCurrentUser = user;

    const dialog = document.getElementById('create-post-modal');
    const titleInput = document.getElementById('community-title');
    const contentInput = document.getElementById('community-content');
    const treeSearchInput = document.getElementById('community-tree-search');
    const treeIdInput = document.getElementById('community-tree-id');
    const treeSelect = document.getElementById('community-tree-select');

    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    if (treeSearchInput) treeSearchInput.value = '';
    if (treeIdInput) treeIdInput.value = '';
    if (treeSelect) treeSelect.value = '';

    resetCommunityMediaPicker();

    bindCommunityTreePicker();
    if (!communityMyTreesLoaded) {
        loadMyTreesForCommunity(user);
    } else {
        renderCommunityTreeSelectOptions('');
    }

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
    const treeIdInput = document.getElementById('community-tree-id');
    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';
    const treeId = treeIdInput ? treeIdInput.value.trim() : '';

    const mediaInput = document.getElementById('community-media-url');
    const mediaUrl = normalizeCommunityMediaUrl(mediaInput ? mediaInput.value : communityCreateMediaUrl);

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

    if (title.length > 80) {
        showError('제목은 80자 이하로 입력해 주세요.', 3000);
        return;
    }
    if (content.length > 2000) {
        showError('내용은 2000자 이하로 입력해 주세요.', 3000);
        return;
    }

    const nowMs = Date.now();
    if (nowMs - communityLastPostSubmitAtMs < 8000) {
        showError('잠시 후 다시 시도해 주세요.', 2000);
        return;
    }
    communityLastPostSubmitAtMs = nowMs;

    try {
        const ytId = mediaUrl ? parseYouTubeVideoIdFromUrl(mediaUrl) : '';

        await db.collection(COMMUNITY_COLLECTION).add({
            title,
            content,
            treeId: treeId || '',
            mediaUrl: mediaUrl || '',
            mediaType: ytId ? 'youtube' : (mediaUrl ? 'link' : ''),
            authorId: user.uid,
            authorDisplayName: user.displayName || user.email || '익명',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likeCount: 0,
            commentCount: 0,
            isDeleted: false
        });

        closeModal('create-post-modal');
        resetCommunityMediaPicker();
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

    const treeActionsEl = document.getElementById('detail-tree-actions');
    const treeOpenEl = document.getElementById('detail-tree-open');
    const treeForkBtn = document.getElementById('detail-tree-fork');
    const treeSummaryEl = document.getElementById('detail-tree-summary');

    const imagesWrap = document.getElementById('detail-images');

    const postActionsWrap = document.getElementById('detail-post-actions');
    const postEditBtn = document.getElementById('detail-post-edit');
    const postDeleteBtn = document.getElementById('detail-post-delete');

    if (!dialog || !titleEl || !metaEl || !contentEl) return;

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

        titleEl.textContent = data.title || '제목 없음';
        const created = formatCommunityDate(data.createdAt);
        const author = data.authorDisplayName || '익명';
        metaEl.textContent = `${author} · ${created}`;
        contentEl.textContent = data.content || '';

        setCommunityPostEditMode(false);
        setCommunityPostActionUiVisible(false);

        try {
            const user = getCurrentUserForCommunity();
            const isOwner = isOwnerOfPost(user, data);
            const isAdmin = await isAdminUserForCommunity(user);
            const canEditOrDelete = !!(isOwner || isAdmin);

            setCommunityPostActionUiVisible(canEditOrDelete);

            if (postEditBtn && postDeleteBtn) {
                let editing = false;

                postEditBtn.onclick = async () => {
                    try {
                        const currentUser = getCurrentUserForCommunity();
                        if (!currentUser) {
                            showError('로그인이 필요합니다.', 3000);
                            return;
                        }

                        const latestIsOwner = isOwnerOfPost(currentUser, communityCurrentPostData);
                        const latestIsAdmin = await isAdminUserForCommunity(currentUser);
                        if (!latestIsOwner && !latestIsAdmin) {
                            showError('권한이 없습니다.', 3000);
                            return;
                        }

                        if (!editing) {
                            editing = true;
                            setCommunityPostEditMode(true, communityCurrentPostData);
                            return;
                        }

                        const newTitle = (titleEl.textContent || '').trim();
                        const newContent = (contentEl.textContent || '').trim();

                        if (!newTitle) {
                            showError('제목을 입력해 주세요.', 3000);
                            return;
                        }
                        if (!newContent) {
                            showError('내용을 입력해 주세요.', 3000);
                            return;
                        }

                        const res = await updateCommunityPostById(communityCurrentPostId, {
                            title: newTitle,
                            content: newContent
                        });
                        if (!res || !res.ok) {
                            showError((res && res.error) ? res.error : '저장 실패', 4000);
                            return;
                        }

                        communityCurrentPostData = {
                            ...(communityCurrentPostData || {}),
                            title: newTitle,
                            content: newContent
                        };

                        editing = false;
                        setCommunityPostEditMode(false);
                        showError('저장되었습니다.', 2000);
                        await loadCommunityPosts();
                    } catch (e) {
                        console.error('게시글 수정 실패:', e);
                        showError('수정 실패', 4000);
                    }
                };

                postDeleteBtn.onclick = async () => {
                    try {
                        if (editing) {
                            editing = false;
                            titleEl.textContent = (communityCurrentPostData && communityCurrentPostData.title) ? communityCurrentPostData.title : '';
                            contentEl.textContent = (communityCurrentPostData && communityCurrentPostData.content) ? communityCurrentPostData.content : '';
                            setCommunityPostEditMode(false);
                            return;
                        }

                        const currentUser = getCurrentUserForCommunity();
                        if (!currentUser) {
                            showError('로그인이 필요합니다.', 3000);
                            return;
                        }

                        const latestIsOwner = isOwnerOfPost(currentUser, communityCurrentPostData);
                        const latestIsAdmin = await isAdminUserForCommunity(currentUser);
                        if (!latestIsOwner && !latestIsAdmin) {
                            showError('권한이 없습니다.', 3000);
                            return;
                        }

                        const ok = confirm('이 게시글을 삭제할까요?');
                        if (!ok) return;

                        const reason = (prompt('삭제 사유를 입력해 주세요. (선택)', '') || '').trim();

                        const res = await updateCommunityPostById(communityCurrentPostId, {
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

                        closeModal('post-detail-modal');
                        await loadCommunityPosts();
                    } catch (e) {
                        console.error('게시글 삭제 실패:', e);
                        showError('삭제 실패', 4000);
                    }
                };
            }

            if (!canEditOrDelete && postActionsWrap) {
                postActionsWrap.classList.add('hidden');
            }
        } catch (e) {
            setCommunityPostActionUiVisible(false);
        }

        try {
            if (imagesWrap) {
                const legacyUrls = data && Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [];
                const mediaUrl = data && data.mediaUrl ? String(data.mediaUrl || '').trim() : '';
                const items = [];

                legacyUrls.forEach((u) => {
                    const safe = escapeHtml(String(u || ''));
                    if (safe) items.push(`<img src="${safe}" alt="첨부 이미지" class="w-full rounded-xl border border-slate-200" />`);
                });

                if (mediaUrl) {
                    const url = normalizeCommunityMediaUrl(mediaUrl);
                    const ytId = parseYouTubeVideoIdFromUrl(url);
                    if (ytId) {
                        const safeId = escapeHtml(ytId);
                        items.push(`
                            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">
                                <iframe class="w-full h-full" src="https://www.youtube.com/embed/${safeId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                            </div>
                        `);
                    } else if (isLikelyImageUrl(url)) {
                        const safe = escapeHtml(url);
                        items.push(`<img src="${safe}" alt="첨부 이미지" class="w-full rounded-xl border border-slate-200" />`);
                    } else {
                        const safe = escapeHtml(url);
                        items.push(`<a href="${safe}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">링크 열기</a>`);
                    }
                }

                if (!items.length) {
                    imagesWrap.classList.add('hidden');
                    imagesWrap.innerHTML = '';
                } else {
                    imagesWrap.classList.remove('hidden');
                    imagesWrap.innerHTML = items.join('');
                }
            }
        } catch (e) {
        }

        try {
            if (treeActionsEl && treeOpenEl && treeForkBtn) {
                const treeIdForOpen = (typeof extractTreeIdFromMaybeUrl === 'function')
                    ? extractTreeIdFromMaybeUrl(communityCurrentTreeId)
                    : communityCurrentTreeId;

                const openedPostId = communityCurrentPostId;

                if (treeIdForOpen) {
                    treeOpenEl.href = 'editor.html?id=' + encodeURIComponent(treeIdForOpen);
                    treeActionsEl.classList.remove('hidden');
                    treeForkBtn.disabled = false;

                    if (treeSummaryEl) {
                        treeSummaryEl.classList.remove('hidden');
                        treeSummaryEl.textContent = '트리 정보를 불러오는 중...';
                        fetchTreeSummaryForCommunity(treeIdForOpen).then((summary) => {
                            try {
                                if (communityCurrentPostId !== openedPostId) return;
                                if (!treeSummaryEl) return;
                                if (!summary) {
                                    treeSummaryEl.textContent = '트리 정보를 불러오지 못했습니다.';
                                    return;
                                }

                                const dateText = summary.lastUpdatedIso ? String(summary.lastUpdatedIso).slice(0, 10) : '';
                                const parts = [];
                                parts.push('노드 ' + (summary.nodeCount || 0) + '개');
                                if (dateText) parts.push('최근 업데이트 ' + dateText);
                                treeSummaryEl.textContent = parts.join(' · ');
                            } catch (e) {
                            }
                        });
                    }
                } else {
                    treeOpenEl.href = '#';
                    treeActionsEl.classList.add('hidden');
                    treeForkBtn.disabled = true;

                    if (treeSummaryEl) {
                        treeSummaryEl.classList.add('hidden');
                        treeSummaryEl.textContent = '';
                    }
                }

                treeForkBtn.onclick = async () => {
                    try {
                        if (!communityCurrentTreeId) return;
                        const ok = confirm('이 트리를 내 트리로 가져올까요? 가져온 뒤에는 내 트리에서 자유롭게 수정할 수 있습니다.');
                        if (!ok) return;

                        if (typeof forkTreeToMyAccountBySourceTreeId !== 'function') {
                            showError('가져오기 기능을 사용할 수 없습니다.', 4000);
                            return;
                        }

                        const res = await forkTreeToMyAccountBySourceTreeId(communityCurrentTreeId);
                        if (!res || !res.ok) {
                            showError((res && res.error) ? res.error : '가져오기 실패', 4000);
                            return;
                        }

                        window.location.href = 'editor.html?id=' + encodeURIComponent(res.newTreeId);
                    } catch (e) {
                        console.error('커뮤니티 포크 실패:', e);
                        showError('가져오기 실패', 4000);
                    }
                };
            }
        } catch (e) {
        }

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

        const currentUser = getCurrentUserForCommunity();
        const isAdmin = await isAdminUserForCommunity(currentUser);

        listEl.innerHTML = comments.map(({ id, data }) => {
            const author = escapeHtml(data.authorDisplayName || '익명');
            const created = formatCommunityDate(data.createdAt);
            const isAi = !!data.isAiBot;
            const isDeleted = data && data.isDeleted === true;

            const canDelete = !isDeleted && !!currentUser && (String(data.authorId || '') === String(currentUser.uid || '') || isAdmin);

            const text = isDeleted
                ? '<span class="text-slate-400">(삭제된 댓글입니다)</span>'
                : escapeHtml(data.content || '');

            const deleteBtn = canDelete
                ? `<button type="button" class="text-[10px] font-bold text-red-600 hover:text-red-700" data-action="delete-comment" data-comment-id="${escapeHtml(id)}">삭제</button>`
                : '';

            return `
                <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" data-comment-row="${escapeHtml(id)}">
                    <div class="flex items-center justify-between mb-1 gap-2">
                        <span class="text-xs font-semibold text-slate-700 flex items-center gap-1 min-w-0">
                            <span class="truncate">${author}</span>
                            ${isAi ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">AI</span>' : ''}
                        </span>
                        <div class="shrink-0 flex items-center gap-2">
                            <span class="text-[10px] text-slate-400">${created}</span>
                            ${deleteBtn}
                        </div>
                    </div>
                    <p class="text-xs text-slate-700 whitespace-pre-wrap">${text}</p>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('button[data-action="delete-comment"]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const currentUser2 = getCurrentUserForCommunity();
                    if (!currentUser2) {
                        showError('로그인이 필요합니다.', 3000);
                        return;
                    }

                    const commentId = btn.getAttribute('data-comment-id') || '';
                    if (!commentId) return;

                    const ok = confirm('이 댓글을 삭제할까요?');
                    if (!ok) return;

                    const reason = (prompt('삭제 사유를 입력해 주세요. (선택)', '') || '').trim();

                    const res = await softDeleteCommunityComment(postId, commentId, {
                        deletedByUid: String(currentUser2.uid || ''),
                        deletedByEmail: String(currentUser2.email || ''),
                        deletedReason: reason
                    });
                    if (!res || !res.ok) {
                        showError((res && res.error) ? res.error : '삭제 실패', 4000);
                        return;
                    }

                    await loadCommunityComments(postId);
                    await loadCommunityPosts();
                } catch (err) {
                    console.error('댓글 삭제 실패:', err);
                    showError('댓글 삭제 실패', 4000);
                }
            });
        });
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
    const createBtn = document.getElementById('btn-open-create-post');
    const createForm = document.getElementById('create-post-form');
    const commentForm = document.getElementById('comment-form');
    const sortLatestBtn = document.getElementById('community-sort-latest');
    const sortPopularBtn = document.getElementById('community-sort-popular');
    const searchInput = document.getElementById('community-search');
    const searchClearBtn = document.getElementById('community-search-clear');

    if (createBtn) {
        createBtn.addEventListener('click', openCreatePostModal);
    }
    if (createForm) {
        createForm.addEventListener('submit', handleCreatePostSubmit);
    }

    bindCommunityMediaPicker();
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentFormSubmit);
    }

    if (sortLatestBtn && sortPopularBtn) {
        sortLatestBtn.addEventListener('click', () => {
            communitySortMode = 'latest';
            updateCommunitySortButtons();
            loadCommunityPosts();
        });
        sortPopularBtn.addEventListener('click', () => {
            communitySortMode = 'popular';
            updateCommunitySortButtons();
            loadCommunityPosts();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            communitySearchQuery = searchInput.value || '';
            renderCommunityPostList();
        });
    }
    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            communitySearchQuery = '';
            if (searchInput) searchInput.value = '';
            renderCommunityPostList();
        });
    }

    // 인증 상태를 기다렸다가 현재 사용자 캐시 후 글 목록 로딩
    if (typeof waitForAuth === 'function') {
        waitForAuth().then((user) => {
            communityCurrentUser = user;
            updateCommunitySortButtons();
            loadCommunityPosts();
            bindCommunityTreePicker();
            loadMyTreesForCommunity(user);
        }).catch((e) => {
            console.error('waitForAuth 실패:', e);
            updateCommunitySortButtons();
            loadCommunityPosts();
            bindCommunityTreePicker();
            loadMyTreesForCommunity(null);
        });
    } else {
        // 혹시 waitForAuth가 없더라도 최소한 리스트는 로딩
        updateCommunitySortButtons();
        loadCommunityPosts();
        bindCommunityTreePicker();
        const u = getCurrentUserForCommunity();
        communityCurrentUser = u;
        loadMyTreesForCommunity(u);
    }
}

try {
    window.onAuthReady = function (user) {
        communityCurrentUser = user;
        communityMyTreesCache = [];
        communityMyTreesLoaded = false;
        loadMyTreesForCommunity(user);
    };
} catch (e) {
}

// DOM 준비 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommunityPage);
} else {
    initCommunityPage();
}
