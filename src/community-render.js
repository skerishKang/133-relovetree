(function () {
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
                const thumb = 'https://i.ytimg.com/vi/' + encodeURIComponent(ytId) + '/hqdefault.jpg';
                const safeThumb = escapeHtml(thumb);
                return '\
                <div class="mt-3 w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900">\
                    <img src="' + safeThumb + '" alt="유튜브 썸네일" class="w-full h-full object-cover" loading="lazy" />\
                </div>\
            ';
            }

            if (isLikelyImageUrl(url)) {
                const safe = escapeHtml(url);
                return '\
                <div class="mt-3 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">\
                    <img src="' + safe + '" alt="미디어 이미지" class="w-full max-h-56 object-cover" loading="lazy" />\
                </div>\
            ';
            }

            return '';
        } catch (e) {
            return '';
        }
    }

    function buildCommunityTreeBadgeHtml(treeIdRaw, treeIdForOpen) {
        if (!treeIdForOpen) return '';

        return '\
            <div class="mt-2 flex flex-wrap gap-2 items-center text-[11px]">\
                <a class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50" href="editor.html?id=' + encodeURIComponent(treeIdForOpen) + '" target="_blank">트리 보기</a>\
                <button type="button" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" data-action="fork-tree" data-tree="' + encodeURIComponent(treeIdRaw) + '">내 트리로 가져오기</button>\
           </div>\
        ';
    }

    function buildCommunityPostMetaHtml(author, created, commentCount) {
        return '\
            <div class="flex items-center justify-between text-[11px] text-slate-400">\
                <span>' + author + '</span>\
                <div class="flex items-center gap-2">\
                    <span>' + created + '</span>\
                    <span class="flex items-center gap-1 text-[10px] text-slate-400">\
                        <span>💬</span>\
                        <span>' + commentCount + '</span>\
                    </span>\
                </div>\
            </div>\
        ';
    }

    function buildCommunityPostCardTemplate(options) {
        const opts = options || {};
        return '\
        <article data-post-id="' + opts.id + '"\
            class="cursor-pointer bg-white/90 border border-slate-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition-shadow">\
            <h2 class="text-sm sm:text-base font-bold text-slate-900 mb-1 line-clamp-1">' + (opts.title || '') + '</h2>\
            <p class="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">' + (opts.snippet || '') + '</p>\
            ' + (opts.thumb || '') + '\
            ' + (opts.treeBadge || '') + '\
            ' + (opts.meta || '') + '\
        </article>\
    ';
    }

    function buildCommunityDetailImageHtml(url) {
        const safe = escapeHtml(String(url || '').trim());
        if (!safe) return '';
        return '<img src="' + safe + '" alt="첨부 이미지" class="w-full rounded-xl border border-slate-200" />';
    }

    function buildCommunityDetailYoutubeHtml(videoId) {
        const safeId = escapeHtml(String(videoId || '').trim());
        if (!safeId) return '';
        return '\
            <div class="w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black">\
                <iframe class="w-full h-full" src="https://www.youtube.com/embed/' + safeId + '" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\
            </div>\
        ';
    }

    function buildCommunityDetailLinkHtml(url) {
        const safe = escapeHtml(String(url || '').trim());
        if (!safe) return '';
        return '<a href="' + safe + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">링크 열기</a>';
    }

    function buildCommunityDetailMetaHtml(options) {
        const opts = options || {};
        const author = escapeHtml(opts.author || '익명');
        const created = escapeHtml(opts.created || '');
        const deletedInfoHtml = opts.deletedInfoHtml || '';
        return author + ' · ' + created + deletedInfoHtml;
    }

    function buildCommunityDetailActionLabels(isEditMode) {
        if (isEditMode) {
            return {
                editText: '저장',
                deleteText: '취소'
            };
        }

        return {
            editText: '수정',
            deleteText: '삭제'
        };
    }

    function buildCommunityTreeSummaryText(options) {
        const opts = options || {};
        const status = opts.status || 'loaded';

        if (status === 'loading') {
            return '트리 정보를 불러오는 중...';
        }

        if (status === 'error') {
            return '트리 정보를 불러오지 못했습니다.';
        }

        const summary = opts.summary || {};
        const dateText = summary.lastUpdatedIso ? String(summary.lastUpdatedIso).slice(0, 10) : '';
        const parts = ['노드 ' + (summary.nodeCount || 0) + '개'];
        if (dateText) parts.push('최근 업데이트 ' + dateText);
        return parts.join(' · ');
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

        const treeBadge = buildCommunityTreeBadgeHtml(treeIdRaw, treeIdForOpen);
        const thumb = buildCommunityThumbnailHTML(data);
        const meta = buildCommunityPostMetaHtml(author, created, commentCount);

        return buildCommunityPostCardTemplate({
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

            window.location.href = 'editor.html?id=' + encodeURIComponent(res.newTreeId);
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
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }

        if (emptyEl) emptyEl.classList.add('hidden');
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

        listEl.querySelectorAll('a[href^="editor.html?id="]').forEach(function (a) {
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
        if (canEditOrDelete) wrap.classList.remove('hidden');
        else wrap.classList.add('hidden');
    }

    function setCommunityPostEditMode(isEditMode) {
        const titleEl = document.getElementById('detail-title');
        const contentEl = document.getElementById('detail-content');
        const editBtn = document.getElementById('detail-post-edit');
        const delBtn = document.getElementById('detail-post-delete');
        if (!titleEl || !contentEl || !editBtn || !delBtn) return;
        const labels = buildCommunityDetailActionLabels(isEditMode);

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
        metaEl.innerHTML = buildCommunityDetailMetaHtml({
            author: author,
            created: created,
            deletedInfoHtml: options && options.isAdmin && data && data.isDeleted === true
                ? buildDeletedInfoHtmlForAdmin(data)
                : ''
        });
    }

    function renderCommunityDetailMedia(data) {
        const imagesWrap = document.getElementById('detail-images');
        if (!imagesWrap) return;

        const legacyUrls = data && Array.isArray(data.imageUrls) ? data.imageUrls.filter(Boolean) : [];
        const mediaUrl = data && data.mediaUrl ? String(data.mediaUrl || '').trim() : '';
        const items = [];

        legacyUrls.forEach(function (u) {
            const imageHtml = buildCommunityDetailImageHtml(u);
            if (imageHtml) items.push(imageHtml);
        });

        if (mediaUrl) {
            const url = normalizeCommunityMediaUrl(mediaUrl);
            const ytId = parseYouTubeVideoIdFromUrl(url);
            if (ytId) {
                const youtubeHtml = buildCommunityDetailYoutubeHtml(ytId);
                if (youtubeHtml) items.push(youtubeHtml);
            } else if (isLikelyImageUrl(url)) {
                const imageHtml = buildCommunityDetailImageHtml(url);
                if (imageHtml) items.push(imageHtml);
            } else {
                const linkHtml = buildCommunityDetailLinkHtml(url);
                if (linkHtml) items.push(linkHtml);
            }
        }

        if (!items.length) {
            imagesWrap.classList.add('hidden');
            imagesWrap.innerHTML = '';
            return;
        }

        imagesWrap.classList.remove('hidden');
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
            treeActionsEl.classList.add('hidden');
            treeForkBtn.disabled = true;
            if (treeSummaryEl) {
                treeSummaryEl.classList.add('hidden');
                treeSummaryEl.textContent = '';
            }
            return;
        }

        treeOpenEl.href = 'editor.html?id=' + encodeURIComponent(treeIdForOpen);
        treeActionsEl.classList.remove('hidden');
        treeForkBtn.disabled = false;

        if (treeSummaryEl) {
            treeSummaryEl.classList.remove('hidden');
            treeSummaryEl.textContent = buildCommunityTreeSummaryText({
                status: 'loading'
            });
            options.fetchTreeSummary(treeIdForOpen).then(function (summary) {
                try {
                    if (options.getCurrentPostId() !== options.postId) return;
                    if (!summary) {
                        treeSummaryEl.textContent = buildCommunityTreeSummaryText({
                            status: 'error'
                        });
                        return;
                    }

                    treeSummaryEl.textContent = buildCommunityTreeSummaryText({
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
        buildCommunityThumbnailHTML: buildCommunityThumbnailHTML,
        buildCommunityTreeBadgeHtml: buildCommunityTreeBadgeHtml,
        buildCommunityPostMetaHtml: buildCommunityPostMetaHtml,
        buildCommunityPostCardTemplate: buildCommunityPostCardTemplate,
        buildCommunityDetailImageHtml: buildCommunityDetailImageHtml,
        buildCommunityDetailYoutubeHtml: buildCommunityDetailYoutubeHtml,
        buildCommunityDetailLinkHtml: buildCommunityDetailLinkHtml,
        buildCommunityDetailMetaHtml: buildCommunityDetailMetaHtml,
        buildCommunityDetailActionLabels: buildCommunityDetailActionLabels,
        buildCommunityTreeSummaryText: buildCommunityTreeSummaryText,
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
    window.buildCommunityThumbnailHTML = buildCommunityThumbnailHTML;
    window.buildCommunityTreeBadgeHtml = buildCommunityTreeBadgeHtml;
    window.buildCommunityPostCardTemplate = buildCommunityPostCardTemplate;
    window.filterCommunityPosts = filterCommunityPosts;
    window.renderCommunityPostCard = renderCommunityPostCard;
    window.setCommunityPostActionUiVisible = setCommunityPostActionUiVisible;
    window.setCommunityPostEditMode = setCommunityPostEditMode;
})();
