/**
 * 커뮤니티 페이지 전용 스크립트
 * Firestore의 community_posts 컬렉션을 사용하여 글/댓글을 관리한다.
 */

const COMMUNITY_COLLECTION = 'community_posts';
let communityCurrentUser = null;
let communityCurrentPostId = null;
let communitySortMode = 'latest'; // 'latest' | 'popular'
let communityCurrentTreeId = '';

let communityCreateImageFile = null;

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

function getStorageForCommunity() {
    try {
        if (typeof firebase === 'undefined' || !firebase.storage) {
            console.error('Firebase Storage 미초기화 상태입니다.');
            return null;
        }
        return firebase.storage();
    } catch (e) {
        console.error('Firebase Storage 초기화 실패:', e);
        return null;
    }
}

function resetCommunityImagePicker() {
    communityCreateImageFile = null;
    const input = document.getElementById('community-image');
    const wrap = document.getElementById('community-image-preview');
    const img = document.getElementById('community-image-preview-img');

    if (input) input.value = '';
    if (img) img.src = '';
    if (wrap) wrap.classList.add('hidden');
}

function bindCommunityImagePicker() {
    const input = document.getElementById('community-image');
    const wrap = document.getElementById('community-image-preview');
    const img = document.getElementById('community-image-preview-img');

    if (!input) return;

    input.onchange = function () {
        const file = input.files && input.files[0];
        if (!file) {
            communityCreateImageFile = null;
            if (img) img.src = '';
            if (wrap) wrap.classList.add('hidden');
            return;
        }

        if (file && file.type && !String(file.type).startsWith('image/')) {
            showError('이미지 파일만 첨부할 수 있어요.', 3000);
            resetCommunityImagePicker();
            return;
        }

        if (file && typeof file.size === 'number' && file.size > 5 * 1024 * 1024) {
            showError('이미지는 5MB 이하만 첨부할 수 있어요.', 3000);
            resetCommunityImagePicker();
            return;
        }

        communityCreateImageFile = file;

        try {
            if (!img || !wrap) return;
            const url = URL.createObjectURL(file);
            img.src = url;
            wrap.classList.remove('hidden');
        } catch (e) {
        }
    };
}

async function uploadCommunityImageOrNull(user, file) {
    if (!file) return null;
    const storage = getStorageForCommunity();
    if (!storage) return null;

    try {
        const ext = (file && file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'jpg';
        const path = `community_uploads/${user.uid}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const ref = storage.ref().child(path);
        await ref.put(file, { contentType: file.type || 'image/jpeg' });
        const url = await ref.getDownloadURL();
        return url;
    } catch (e) {
        console.error('커뮤니티 이미지 업로드 실패:', e);
        return null;
    }
}
        return firebase.auth().currentUser;
    } catch (e) {
        console.warn('getCurrentUserForCommunity 실패:', e);
        return null;
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

    return `
        <article data-post-id="${id}"
            class="cursor-pointer bg-white/90 border border-slate-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition-shadow">
            <h2 class="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1">${title}</h2>
            <p class="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">${snippet}</p>
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
    const emptyEl = document.getElementById('community-empty-state');
    if (!listEl) return;

    listEl.innerHTML = '<div class="text-sm text-slate-400">불러오는 중...</div>';
    if (emptyEl) emptyEl.classList.add('hidden');

    try {
        let query = db.collection(COMMUNITY_COLLECTION);
        if (communitySortMode === 'popular') {
            query = query.orderBy('commentCount', 'desc');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }

        const snapshot = await query
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

    resetCommunityImagePicker();

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
        let imageUrls = [];
        if (communityCreateImageFile) {
            const imageUrl = await uploadCommunityImageOrNull(user, communityCreateImageFile);
            if (imageUrl) imageUrls = [imageUrl];
        }

        await db.collection(COMMUNITY_COLLECTION).add({
            title,
            content,
            treeId: treeId || '',
            imageUrls: imageUrls,
            authorId: user.uid,
            authorDisplayName: user.displayName || user.email || '익명',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likeCount: 0,
            commentCount: 0,
            isDeleted: false
        });

        closeModal('create-post-modal');
        resetCommunityImagePicker();
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

        titleEl.textContent = data.title || '제목 없음';
        const created = formatCommunityDate(data.createdAt);
        const author = data.authorDisplayName || '익명';
        metaEl.textContent = `${author} · ${created}`;
        contentEl.textContent = data.content || '';

        try {
            if (imagesWrap) {
                const urls = data && Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [];
                if (!urls.length) {
                    imagesWrap.classList.add('hidden');
                    imagesWrap.innerHTML = '';
                } else {
                    imagesWrap.classList.remove('hidden');
                    imagesWrap.innerHTML = urls.map((url) => {
                        const safe = escapeHtml(String(url || ''));
                        return `<img src="${safe}" alt="첨부 이미지" class="w-full rounded-xl border border-slate-200" />`;
                    }).join('');
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

        listEl.innerHTML = comments.map(({ data }) => {
            const author = escapeHtml(data.authorDisplayName || '익명');
            const text = escapeHtml(data.content || '');
            const created = formatCommunityDate(data.createdAt);
            const isAi = !!data.isAiBot;
            return `
                <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <span>${author}</span>
                            ${isAi ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">AI</span>' : ''}
                        </span>
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

    if (createBtn) {
        createBtn.addEventListener('click', openCreatePostModal);
    }
    if (createForm) {
        createForm.addEventListener('submit', handleCreatePostSubmit);
    }

    bindCommunityImagePicker();
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
