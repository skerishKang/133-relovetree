(function () {
    function normalizeSearchText(value) {
        try {
            return String(value || '').toLowerCase().trim();
        } catch (e) {
            return '';
        }
    }

    function filterCommunityPosts(posts, query) {
        const q = normalizeSearchText(query);
        if (!q) return posts;

        return (posts || []).filter(function (item) {
            try {
                const data = item && item.data ? item.data : {};
                const title = normalizeSearchText(data && data.title);
                const author = normalizeSearchText(data && data.authorDisplayName);
                const treeId = normalizeSearchText(data && data.treeId);
                return title.includes(q) || author.includes(q) || treeId.includes(q);
            } catch (e) {
                return false;
            }
        });
    }

    function getTemplateFn(name) {
        const templates = window.CommunityRenderTemplates;
        return (templates && typeof templates[name] === 'function') ? templates[name] : null;
    }

    function renderCommunityPostCard(id, data) {
        const title = escapeHtml(data.title || '제목 없음');
        const rawContent = data.content || '';
        const snippet = escapeHtml(rawContent.length > 120 ? rawContent.slice(0, 120) + '…' : rawContent);
        const author = escapeHtml(data.authorDisplayName || '익명');
        const created = formatCommunityDate(data.createdAt);
        const commentCount = data.commentCount || 0;

        const treeIdRaw = data && data.treeId ? String(data.treeId || '').trim() : '';
        const treeIdForOpen = typeof extractTreeIdFromMaybeUrl === 'function'
            ? extractTreeIdFromMaybeUrl(treeIdRaw)
            : treeIdRaw;

        const buildTreeBadge = getTemplateFn('buildCommunityTreeBadgeHtml');
        const buildThumb = getTemplateFn('buildCommunityThumbnailHTML');
        const buildMeta = getTemplateFn('buildCommunityPostMetaHtml');
        const buildCard = getTemplateFn('buildCommunityPostCardTemplate');

        const treeBadge = buildTreeBadge ? buildTreeBadge(treeIdRaw, treeIdForOpen) : '';
        const thumb = buildThumb ? buildThumb(data) : '';
        const meta = buildMeta ? buildMeta(author, created, commentCount) : '';

        const cardFn = buildCard || function(o) { return ''; };
        return cardFn({
            id: id,
            title: title,
            snippet: snippet,
            thumb: thumb,
            treeBadge: treeBadge,
            meta: meta
        });
    }

    async function handleForkTree(treeIdRaw) {
        try {
            const treeId = treeIdRaw ? decodeURIComponent(treeIdRaw) : '';
            if (!treeId) return;

            const ok = confirm('이 트리를 내 트리로 가져올까요? 가져온 뒤에는 내 트리에서 자유롭게 수정할 수 있습니다.');
            if (!ok) return;

            if (typeof forkTreeToMyAccountBySourceTreeId !== 'function') {
                showError('가져오기 기능을 사용할 수 없습니다.', 4000);
                return;
            }

            const res = await forkTreeToMyAccountBySourceTreeId(treeId);
            if (!res || !res.ok) {
                showError(res && res.error ? res.error : '가져오기 실패', 4000);
                return;
            }

            window.location.href = '/pages/editor.html?id=' + encodeURIComponent(res.newTreeId);
        } catch (err) {
            console.error('커뮤니티 카드 포크 실패:', err);
            showError('가져오기 실패', 4000);
        }
    }

    function renderCommunityPostList(options) {
        const listEl = document.getElementById('community-post-list');
        const emptyEl = document.getElementById('community-empty-state');
        if (!listEl) return;

        const filtered = filterCommunityPosts(options.posts, options.query);
        if (!filtered.length) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.classList.remove('is-hidden');
            return;
        }

        if (emptyEl) emptyEl.classList.add('is-hidden');
        listEl.innerHTML = filtered.map(function (item) {
            return renderCommunityPostCard(item.id, item.data);
        }).join('');

        listEl.querySelectorAll('[data-post-id]').forEach(function (el) {
            const postId = el.getAttribute('data-post-id');
            if (!postId) return;
            el.addEventListener('click', function () {
                options.onOpenPost(postId);
            });
        });

        listEl.querySelectorAll('a[href^="/pages/editor.html?id="]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.stopPropagation();
            });
        });

        listEl.querySelectorAll('button[data-action="fork-tree"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                handleForkTree(btn.getAttribute('data-tree') || '');
            });
        });
    }

    function setCommunityPostActionUiVisible(canEditOrDelete) {
        const wrap = document.getElementById('detail-post-actions');
        if (!wrap) return;
        if (canEditOrDelete) wrap.classList.remove('is-hidden');
        else wrap.classList.add('is-hidden');
    }

    function setCommunityPostEditMode(isEditMode) {
        const titleEl = document.getElementById('detail-title');
        const contentEl = document.getElementById('detail-content');
        const editBtn = document.getElementById('detail-post-edit');
        const delBtn = document.getElementById('detail-post-delete');
        if (!titleEl || !contentEl || !editBtn || !delBtn) return;

        const buildLabels = getTemplateFn('buildCommunityDetailActionLabels');
        const labels = buildLabels ? buildLabels(isEditMode) : { editText: '수정', deleteText: '삭제' };

        if (!isEditMode) {
            titleEl.setAttribute('contenteditable', 'false');
            contentEl.setAttribute('contenteditable', 'false');
            titleEl.classList.remove('outline', 'outline-2', 'outline-brand-400', 'rounded');
            contentEl.classList.remove('outline', 'outline-2', 'outline-brand-400', 'rounded');
            editBtn.textContent = labels.editText;
            delBtn.textContent = labels.deleteText;
            return;
        }

        titleEl.setAttribute('contenteditable', 'true');
        contentEl.setAttribute('contenteditable', 'true');
        titleEl.classList.add('outline', 'outline-2', 'outline-brand-400', 'rounded');
        contentEl.classList.add('outline', 'outline-2', 'outline-brand-400', 'rounded');
        editBtn.textContent = labels.editText;
        delBtn.textContent = labels.deleteText;

        try {
            titleEl.focus();
        } catch (e) {
        }
    }

    function fillCommunityPostDetail(data, options) {
        const titleEl = document.getElementById('detail-title');
        const metaEl = document.getElementById('detail-meta');
        const contentEl = document.getElementById('detail-content');
        if (!titleEl || !metaEl || !contentEl) return;

        const created = formatCommunityDate(data.createdAt);
        const author = data.authorDisplayName || '익명';

        titleEl.textContent = data.title || '제목 없음';
        contentEl.textContent = data.content || '';

        const buildMeta = getTemplateFn('buildCommunityDetailMetaHtml');
        if (buildMeta) {
            metaEl.innerHTML = buildMeta({
                author: author,
                created: created,
                deletedInfoHtml: options && options.isAdmin && data && data.isDeleted === true
                    ? buildDeletedInfoHtmlForAdmin(data)
                    : ''
            });
        }
    }

    function renderCommunityDetailMedia(data) {
        const imagesWrap = document.getElementById('detail-images');
        if (!imagesWrap) return;

        const legacyUrls = data && Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [];
        const mediaUrl = data && data.mediaUrl ? String(data.mediaUrl || '').trim() : '';
        const items = [];

        const buildImg = getTemplateFn('buildCommunityDetailImageHtml');
        const buildYt = getTemplateFn('buildCommunityDetailYoutubeHtml');
        const buildLink = getTemplateFn('buildCommunityDetailLinkHtml');

        legacyUrls.forEach(function (u) {
            if (buildImg) {
                const imageHtml = buildImg(u);
                if (imageHtml) items.push(imageHtml);
            }
        });

        if (mediaUrl) {
            const url = normalizeCommunityMediaUrl(mediaUrl);
            const ytId = parseYouTubeVideoIdFromUrl(url);
            if (ytId && buildYt) {
                const youtubeHtml = buildYt(ytId);
                if (youtubeHtml) items.push(youtubeHtml);
            } else if (isLikelyImageUrl(url) && buildImg) {
                const imageHtml = buildImg(url);
                if (imageHtml) items.push(imageHtml);
            } else if (buildLink) {
                const linkHtml = buildLink(url);
                if (linkHtml) items.push(linkHtml);
            }
        }

        if (!items.length) {
            imagesWrap.classList.add('is-hidden');
            imagesWrap.innerHTML = '';
            return;
        }

        imagesWrap.classList.remove('is-hidden');
        imagesWrap.innerHTML = items.join('');
    }

    function setupCommunityTreeActions(options) {
        const treeActionsEl = document.getElementById('detail-tree-actions');
        const treeOpenEl = document.getElementById('detail-tree-open');
        const treeForkBtn = document.getElementById('detail-tree-fork');
        const treeSummaryEl = document.getElementById('detail-tree-summary');
        if (!treeActionsEl || !treeOpenEl || !treeForkBtn) return;

        const treeIdForOpen = typeof extractTreeIdFromMaybeUrl === 'function'
            ? extractTreeIdFromMaybeUrl(options.treeId)
            : options.treeId;

        if (!treeIdForOpen) {
            treeOpenEl.href = '#';
            treeActionsEl.classList.add('is-hidden');
            treeForkBtn.disabled = true;
            if (treeSummaryEl) {
                treeSummaryEl.classList.add('is-hidden');
                treeSummaryEl.textContent = '';
            }
            return;
        }

        treeOpenEl.href = '/pages/editor.html?id=' + encodeURIComponent(treeIdForOpen);
        treeActionsEl.classList.remove('is-hidden');
        treeForkBtn.disabled = false;

        if (treeSummaryEl) {
            const buildSummary = getTemplateFn('buildCommunityTreeSummaryText');
            const summaryFn = buildSummary || function() { return ''; };

            treeSummaryEl.classList.remove('is-hidden');
            treeSummaryEl.textContent = summaryFn({ status: 'loading' });
            options.fetchTreeSummary(treeIdForOpen).then(function (summary) {
                try {
                    if (options.getCurrentPostId() !== options.postId) return;
                    if (!summary) {
                        treeSummaryEl.textContent = summaryFn({ status: 'error' });
                        return;
                    }

                    treeSummaryEl.textContent = summaryFn({
                        status: 'loaded',
                        summary: summary
                    });
                } catch (e) {
                }
            });
        }

        treeForkBtn.onclick = function () {
            handleForkTree(options.treeId);
        };
    }

    window.CommunityRenderHelpers = {
        normalizeSearchText: normalizeSearchText,
        filterCommunityPosts: filterCommunityPosts,
        renderCommunityPostCard: renderCommunityPostCard,
        renderCommunityPostList: renderCommunityPostList,
        setCommunityPostActionUiVisible: setCommunityPostActionUiVisible,
        setCommunityPostEditMode: setCommunityPostEditMode,
        fillCommunityPostDetail: fillCommunityPostDetail,
        renderCommunityDetailMedia: renderCommunityDetailMedia,
        setupCommunityTreeActions: setupCommunityTreeActions
    };

    window.normalizeSearchText = normalizeSearchText;
    window.filterCommunityPosts = filterCommunityPosts;
    window.renderCommunityPostCard = renderCommunityPostCard;
    window.setCommunityPostActionUiVisible = setCommunityPostActionUiVisible;
    window.setCommunityPostEditMode = setCommunityPostEditMode;
})();