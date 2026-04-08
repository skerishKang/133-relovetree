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
                <div class="community-media-frame community-media-frame-video">\
                    <img src="' + safeThumb + '" alt="유튜브 썸네일" class="community-media-image" loading="lazy" />\
                </div>\
            ';
            }

            if (isLikelyImageUrl(url)) {
                const safe = escapeHtml(url);
                return '\
                <div class="community-media-frame community-media-frame-image">\
                    <img src="' + safe + '" alt="미디어 이미지" class="community-media-image community-media-image-tall" loading="lazy" />\
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
            <div class="community-meta-actions">\
                <a class="community-meta-btn" href="/pages/editor.html?id=' + encodeURIComponent(treeIdForOpen) + '" target="_blank">트리 보기</a>\
                <button type="button" class="community-meta-btn community-meta-btn-emerald" data-action="fork-tree" data-tree="' + encodeURIComponent(treeIdRaw) + '">내 트리로 가져오기</button>\
           </div>\
        ';
    }

    function buildCommunityPostMetaHtml(author, created, commentCount) {
        return '\
            <div class="community-meta-row">\
                <span>' + author + '</span>\
                <div class="community-meta-inline">\
                    <span>' + created + '</span>\
                    <span class="community-meta-chip">\
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
            class="community-post-card">\
            <h2 class="community-post-title">' + (opts.title || '') + '</h2>\
            <p class="community-post-copy">' + (opts.snippet || '') + '</p>\
            ' + (opts.thumb || '') + '\
            ' + (opts.treeBadge || '') + '\
            ' + (opts.meta || '') + '\
        </article>\
    ';
    }

    function buildCommunityDetailImageHtml(url) {
        const safe = escapeHtml(String(url || '').trim());
        if (!safe) return '';
        return '<img src="' + safe + '" alt="첨부 이미지" class="community-media-image community-media-frame" />';
    }

    function buildCommunityDetailYoutubeHtml(videoId) {
        const safeId = escapeHtml(String(videoId || '').trim());
        if (!safeId) return '';
        return '\
            <div class="community-media-frame community-media-frame-video">\
                <iframe class="community-media-image" src="https://www.youtube.com/embed/' + safeId + '" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\
            </div>\
        ';
    }

    function buildCommunityDetailLinkHtml(url) {
        const safe = escapeHtml(String(url || '').trim());
        if (!safe) return '';
        return '<a href="' + safe + '" target="_blank" rel="noopener" class="community-meta-btn">링크 열기</a>';
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
