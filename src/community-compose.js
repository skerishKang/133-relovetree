(function () {
    function getRuntime() {
        return (typeof window !== 'undefined' && window.__communityRuntime) ? window.__communityRuntime : null;
    }

    function getDb() {
        const runtime = getRuntime();
        return runtime && typeof runtime.getFirestoreForCommunity === 'function'
            ? runtime.getFirestoreForCommunity()
            : null;
    }

    function getCurrentUser() {
        const runtime = getRuntime();
        return runtime && typeof runtime.getCurrentUserForCommunity === 'function'
            ? runtime.getCurrentUserForCommunity()
            : null;
    }

    function escapeHtmlSafe(text) {
        const runtime = getRuntime();
        if (runtime && typeof runtime.escapeHtml === 'function') {
            return runtime.escapeHtml(text);
        }
        if (text == null) return '';
        return String(text).replace(/[&<>"']/g, function (ch) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[ch] || ch;
        });
    }

    function parseYouTubeVideoIdFromUrl(url) {
        try {
            const raw = String(url || '').trim();
            if (!raw) return '';

            if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

            const parsed = new URL(raw);
            const host = String(parsed.hostname || '').replace(/^www\./, '');

            if (host === 'youtu.be') {
                const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
                return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
            }

            if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
                const v = parsed.searchParams.get('v');
                if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

                const parts = parsed.pathname.split('/').filter(Boolean);
                const idx = parts[0];
                if ((idx === 'embed' || idx === 'shorts' || idx === 'live') && /^[a-zA-Z0-9_-]{11}$/.test(parts[1] || '')) {
                    return parts[1];
                }
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    function normalizeCommunityMediaUrl(value) {
        try {
            const raw = String(value || '').trim();
            if (!raw) return '';
            if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
                return 'https://youtu.be/' + raw;
            }
            return raw;
        } catch (e) {
            return '';
        }
    }

    function isLikelyImageUrl(url) {
        try {
            const raw = String(url || '').trim().toLowerCase();
            if (!raw) return false;
            return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(raw);
        } catch (e) {
            return false;
        }
    }

    function renderCommunityCreateMediaPreview(url) {
        const preview = document.getElementById('community-media-preview');
        if (!preview) return;

        const normalized = normalizeCommunityMediaUrl(url);
        if (!normalized) {
            preview.innerHTML = '';
            preview.classList.add('is-hidden');
            return;
        }

        const safeUrl = escapeHtmlSafe(normalized);
        const ytId = parseYouTubeVideoIdFromUrl(normalized);
        if (ytId) {
            const embedUrl = 'https://www.youtube.com/embed/' + encodeURIComponent(ytId);
            preview.innerHTML = '\
                <div class="community-media-frame community-media-frame-video">\
                    <iframe class="community-media-image" src="' + embedUrl + '" title="유튜브 미리보기" allowfullscreen loading="lazy"></iframe>\
                </div>\
            ';
            preview.classList.remove('is-hidden');
            return;
        }

        if (isLikelyImageUrl(normalized)) {
            preview.innerHTML = '\
                <div class="community-media-frame community-media-frame-image">\
                    <img src="' + safeUrl + '" alt="미리보기 이미지" class="community-media-image community-media-image-tall" loading="lazy" />\
                </div>\
            ';
            preview.classList.remove('is-hidden');
            return;
        }

        preview.innerHTML = '\
            <a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" class="community-preview-link">\
                링크 미리보기 열기\
            </a>\
        ';
        preview.classList.remove('is-hidden');
    }

    function resetCommunityMediaPicker() {
        const runtime = getRuntime();
        const input = document.getElementById('community-media-url');
        if (input) input.value = '';
        if (runtime && typeof runtime.setCreateMediaUrl === 'function') {
            runtime.setCreateMediaUrl('');
        }
        renderCommunityCreateMediaPreview('');
    }

    function bindCommunityMediaPicker() {
        const input = document.getElementById('community-media-url');
        if (!input || input.dataset.communityMediaBound === 'true') return;
        input.dataset.communityMediaBound = 'true';

        const sync = function () {
            const normalized = normalizeCommunityMediaUrl(input.value);
            const runtime = getRuntime();
            if (runtime && typeof runtime.setCreateMediaUrl === 'function') {
                runtime.setCreateMediaUrl(normalized);
            }
            renderCommunityCreateMediaPreview(normalized);
        };

        input.addEventListener('input', sync);
        input.addEventListener('change', sync);
    }

    async function fetchTreeSummaryForCommunity(treeIdRaw) {
        try {
            if (!treeIdRaw) return null;
            const db = getDb();
            if (!db) return null;

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
                treeId: treeId,
                nodeCount: nodeCount,
                lastUpdatedIso: lastUpdatedIso
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
            id: id,
            name: name,
            lastUpdated: lastUpdated,
            nodeCount: typeof data.nodeCount === 'number' ? data.nodeCount : (Array.isArray(data.nodes) ? data.nodes.length : 0)
        };
    }

    function renderCommunityTreeSelectOptions(queryText) {
        const runtime = getRuntime();
        const selectEl = document.getElementById('community-tree-select');
        if (!selectEl || !runtime) return;

        const treeIdInput = document.getElementById('community-tree-id');
        const qRaw = String(queryText || '').trim().toLowerCase();

        const items = Array.isArray(runtime.getMyTreesCache && runtime.getMyTreesCache())
            ? runtime.getMyTreesCache().slice()
            : [];
        const filtered = qRaw
            ? items.filter(function (t) {
                const id = String(t.id || '').toLowerCase();
                const name = String(t.name || '').toLowerCase();
                return id.includes(qRaw) || name.includes(qRaw);
            })
            : items;

        const currentUser = getCurrentUser();
        if (!currentUser) {
            selectEl.innerHTML = '<option value="">(로그인 후 내 트리를 선택할 수 있어요)</option>';
            return;
        }

        if (!(runtime.isMyTreesLoaded && runtime.isMyTreesLoaded())) {
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
            .concat(filtered.map(function (t) {
                const id = String(t.id || '');
                const name = String(t.name || id || '내 트리');
                const label = name + ' (' + id + ')';
                return '<option value="' + escapeHtmlSafe(id) + '">' + escapeHtmlSafe(label) + '</option>';
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
        const runtime = getRuntime();
        if (!runtime) return;
        if (runtime.isTreePickerBound && runtime.isTreePickerBound()) return;
        if (runtime.setTreePickerBound) runtime.setTreePickerBound(true);

        const searchEl = document.getElementById('community-tree-search');
        const selectEl = document.getElementById('community-tree-select');
        const treeIdInput = document.getElementById('community-tree-id');

        if (searchEl) {
            searchEl.addEventListener('input', function () {
                renderCommunityTreeSelectOptions(searchEl.value);
            });
        }

        if (selectEl && treeIdInput) {
            selectEl.addEventListener('change', function () {
                const v = String(selectEl.value || '').trim();
                treeIdInput.value = v || '';
            });
        }

        if (treeIdInput && selectEl) {
            treeIdInput.addEventListener('input', function () {
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
        const runtime = getRuntime();
        const db = getDb();
        if (!db || !runtime) return;

        const selectEl = document.getElementById('community-tree-select');
        if (!selectEl) return;

        if (!user) {
            runtime.setMyTreesCache && runtime.setMyTreesCache([]);
            runtime.setMyTreesLoaded && runtime.setMyTreesLoaded(false);
            renderCommunityTreeSelectOptions('');
            return;
        }

        selectEl.innerHTML = '<option value="">내 트리를 불러오는 중...</option>';
        runtime.setMyTreesLoaded && runtime.setMyTreesLoaded(false);

        try {
            const snapshot = await db.collection('trees')
                .where('ownerId', '==', user.uid)
                .limit(100)
                .get();

            const items = [];
            snapshot.forEach(function (doc) {
                items.push(normalizeCommunityTreeItem(doc));
            });

            items.sort(function (a, b) {
                return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
            });

            runtime.setMyTreesCache && runtime.setMyTreesCache(items);
            runtime.setMyTreesLoaded && runtime.setMyTreesLoaded(true);

            renderCommunityTreeSelectOptions('');
        } catch (e) {
            console.error('내 트리 목록 로딩 실패:', e);
            runtime.setMyTreesCache && runtime.setMyTreesCache([]);
            runtime.setMyTreesLoaded && runtime.setMyTreesLoaded(false);
            selectEl.innerHTML = '<option value="">내 트리를 불러오지 못했습니다</option>';
        }
    }

    function openCreatePostModal() {
        const runtime = getRuntime();
        const user = getCurrentUser();
        if (!user) {
            showError('로그인이 필요합니다. 상단의 로그인 버튼을 눌러 주세요.', 4000);
            return;
        }

        if (runtime && typeof runtime.setCurrentUser === 'function') {
            runtime.setCurrentUser(user);
        }

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
        if (!(runtime && runtime.isMyTreesLoaded && runtime.isMyTreesLoaded())) {
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

    window.parseYouTubeVideoIdFromUrl = parseYouTubeVideoIdFromUrl;
    window.normalizeCommunityMediaUrl = normalizeCommunityMediaUrl;
    window.isLikelyImageUrl = isLikelyImageUrl;
    window.resetCommunityMediaPicker = resetCommunityMediaPicker;
    window.bindCommunityMediaPicker = bindCommunityMediaPicker;

    window.CommunityComposeHelpers = {
        fetchTreeSummaryForCommunity: fetchTreeSummaryForCommunity,
        normalizeCommunityTreeItem: normalizeCommunityTreeItem,
        renderCommunityTreeSelectOptions: renderCommunityTreeSelectOptions,
        bindCommunityTreePicker: bindCommunityTreePicker,
        loadMyTreesForCommunity: loadMyTreesForCommunity,
        openCreatePostModal: openCreatePostModal,
        normalizeCommunityMediaUrl: normalizeCommunityMediaUrl,
        parseYouTubeVideoIdFromUrl: parseYouTubeVideoIdFromUrl,
        resetCommunityMediaPicker: resetCommunityMediaPicker,
        bindCommunityMediaPicker: bindCommunityMediaPicker
    };
})();
