(function () {
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

    window.CommunityRenderTemplates = {
        buildCommunityThumbnailHTML,
        buildCommunityTreeBadgeHtml,
        buildCommunityPostMetaHtml,
        buildCommunityPostCardTemplate,
        buildCommunityDetailImageHtml,
        buildCommunityDetailYoutubeHtml,
        buildCommunityDetailLinkHtml,
        buildCommunityDetailMetaHtml,
        buildCommunityDetailActionLabels,
        buildCommunityTreeSummaryText
    };
})();