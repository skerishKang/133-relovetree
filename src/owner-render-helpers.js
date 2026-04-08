(function () {
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDateTimeFull(value) {
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleString('ko-KR');
        } catch (e) {
            return '';
        }
    }

    function formatRelativeTime(value) {
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return '';
            const diffMs = Date.now() - d.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            if (diffSec < 60) return diffSec + '초 전';
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return diffMin + '분 전';
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) return diffHour + '시간 전';
            const diffDay = Math.floor(diffHour / 24);
            if (diffDay < 30) return diffDay + '일 전';
            const diffMonth = Math.floor(diffDay / 30);
            if (diffMonth < 12) return diffMonth + '개월 전';
            const diffYear = Math.floor(diffMonth / 12);
            return diffYear + '년 전';
        } catch (e) {
            return '';
        }
    }

    function applyOwnerSort(items, sortKey) {
        const list = Array.isArray(items) ? items.slice() : [];

        function byUpdatedDesc(a, b) { return new Date(b.lastUpdated) - new Date(a.lastUpdated); }
        function byUpdatedAsc(a, b) { return new Date(a.lastUpdated) - new Date(b.lastUpdated); }
        function byNameAsc(a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'ko'); }
        function byNameDesc(a, b) { return String(b.name || '').localeCompare(String(a.name || ''), 'ko'); }
        function byNodesDesc(a, b) { return (b.nodeCount || 0) - (a.nodeCount || 0); }
        function byLikesDesc(a, b) { return (b.likeCount || 0) - (a.likeCount || 0); }
        function byViewsDesc(a, b) { return (b.viewCount || 0) - (a.viewCount || 0); }

        if (sortKey === 'updated_asc') list.sort(byUpdatedAsc);
        else if (sortKey === 'name_asc') list.sort(byNameAsc);
        else if (sortKey === 'name_desc') list.sort(byNameDesc);
        else if (sortKey === 'nodes_desc') list.sort(byNodesDesc);
        else if (sortKey === 'likes_desc') list.sort(byLikesDesc);
        else if (sortKey === 'views_desc') list.sort(byViewsDesc);
        else list.sort(byUpdatedDesc);

        return list;
    }

    function filterOwnerTrees(items, query) {
        const q = String(query || '').trim().toLowerCase();
        let next = Array.isArray(items) ? items.slice() : [];
        if (!q) return next;

        return next.filter(function (t) {
            const id = (t.id || '').toLowerCase();
            const name = (t.name || '').toLowerCase();
            return id.includes(q) || name.includes(q);
        });
    }

    function computeOwnerRenderSlice(options) {
        const allItems = Array.isArray(options.items) ? options.items.slice() : [];
        const totalCount = allItems.length;
        const filteredItems = filterOwnerTrees(allItems, options.query);
        const sortedItems = applyOwnerSort(filteredItems, options.sortKey);
        const filteredCount = sortedItems.length;

        const pageSize = options.pageSize > 0 ? options.pageSize : 20;
        const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
        let pageIndex = typeof options.pageIndex === 'number' ? options.pageIndex : 0;
        if (pageIndex < 0) pageIndex = 0;
        if (pageIndex > totalPages - 1) pageIndex = totalPages - 1;

        const start = pageIndex * pageSize;
        const end = start + pageSize;
        const pageItems = sortedItems.slice(start, end);

        return {
            totalCount: totalCount,
            filteredCount: filteredCount,
            totalPages: totalPages,
            pageIndex: pageIndex,
            pageItems: pageItems
        };
    }

    function computeLastPageIndex(options) {
        const total = Array.isArray(options.items) ? options.items.length : 0;
        const pageSize = options.pageSize > 0 ? options.pageSize : 20;
        const filtered = filterOwnerTrees(options.items, options.query).length || total;
        const totalPages = Math.max(1, Math.ceil(filtered / pageSize));
        return totalPages - 1;
    }

    function buildOwnerTreeRowHtml(options) {
        const tree = options.tree;
        const forkStatus = options.forkStatus || null;

        const editorUrl = '/pages/editor.html?id=' + encodeURIComponent(tree.id);
        const viewText = (tree.viewCount || 0) + ' / ' + (tree.likeCount || 0) + ' / ' + (tree.shareCount || 0);
        const updatedFull = formatDateTimeFull(tree.lastUpdated);
        const updatedRel = formatRelativeTime(tree.lastUpdated);

        const forkedFrom = tree.forkedFrom && tree.forkedFrom.treeId ? tree.forkedFrom : null;
        const sourceId = forkedFrom ? String(forkedFrom.treeId) : '';
        const sourceUrl = sourceId ? ('/pages/editor.html?id=' + encodeURIComponent(sourceId)) : '';
        const forkedAtIso = forkedFrom ? options.normalizeToIsoString(forkedFrom.forkedAt) : '';
        const syncedAtIso = forkedFrom ? options.normalizeToIsoString(forkedFrom.syncedAt) : '';
        const forkedRel = forkedAtIso ? formatRelativeTime(forkedAtIso) : '';
        const syncedRel = syncedAtIso ? formatRelativeTime(syncedAtIso) : '';
        const forkedFull = forkedAtIso ? formatDateTimeFull(forkedAtIso) : '';
        const syncedFull = syncedAtIso ? formatDateTimeFull(syncedAtIso) : '';

        const forkTimeBadge = forkedRel
            ? '<div class="mt-1 text-[10px] text-slate-400" title="' + escapeHtml(forkedFull) + '">포크: ' + escapeHtml(forkedRel) + '</div>'
            : '';
        const syncTimeBadge = syncedRel
            ? '<div class="mt-1 text-[10px] text-slate-400" title="' + escapeHtml(syncedFull) + '">동기화: ' + escapeHtml(syncedRel) + '</div>'
            : '';

        const forkBadge = forkedFrom
            ? '<div class="mt-1 text-[10px] text-slate-400">원본: <a class="text-brand-600 hover:underline" href="' + sourceUrl + '" target="_blank">' + escapeHtml(sourceId) + '</a></div>' + forkTimeBadge + syncTimeBadge
            : '';
        const updateBadge = forkStatus
            ? '<div class="mt-1 text-[10px] ' + (forkStatus.hasUpdate ? 'text-amber-600' : 'text-emerald-600') + '">' + (forkStatus.hasUpdate ? '업데이트 있음' : '최신') + '</div>'
            : '';

        const forkButtons = forkedFrom
            ? '\
                <a href="' + sourceUrl + '" target="_blank" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">원본 열기</a>\
                <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" data-action="fork-check" data-id="' + escapeHtml(String(tree.id || '')) + '">업데이트 확인</button>\
                <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50" data-action="fork-sync" data-id="' + escapeHtml(String(tree.id || '')) + '">동기화</button>\
            '
            : '';

        return '\
            <td class="px-5 py-3">\
                <div class="flex flex-col">\
                    <span class="text-sm font-black text-slate-900 truncate">' + escapeHtml(String(tree.name || '')) + '</span>\
                    <div class="flex items-center gap-2 min-w-0">\
                        <a class="text-[11px] text-slate-400 truncate hover:underline" href="' + editorUrl + '">' + escapeHtml(String(tree.id || '')) + '</a>\
                        <button type="button" class="px-2 py-1 rounded-lg text-[10px] font-black bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0" data-action="copy-id" data-id="' + escapeHtml(String(tree.id || '')) + '">ID 복사</button>\
                    </div>\
                    ' + forkBadge + '\
                    ' + updateBadge + '\
                </div>\
            </td>\
            <td class="px-5 py-3 text-[11px] text-slate-600" title="' + escapeHtml(updatedFull) + '">' + escapeHtml(updatedRel) + '</td>\
            <td class="px-5 py-3 text-[11px] text-slate-600">' + (tree.nodeCount || 0) + '</td>\
            <td class="px-5 py-3 text-[11px] text-slate-600">' + viewText + '</td>\
            <td class="px-5 py-3">\
                <div class="flex flex-wrap gap-2">\
                    <a href="' + editorUrl + '" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-brand-500 text-white hover:bg-brand-600">열기</a>\
                    <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50" data-action="rename" data-id="' + escapeHtml(String(tree.id || '')) + '">이름 변경</button>\
                    ' + forkButtons + '\
                    <button type="button" class="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white border border-slate-200 text-red-600 hover:bg-red-50" data-action="delete" data-id="' + escapeHtml(String(tree.id || '')) + '">삭제</button>\
                </div>\
            </td>\
        ';
    }

    window.OwnerRenderHelpers = {
        escapeHtml: escapeHtml,
        formatDateTimeFull: formatDateTimeFull,
        formatRelativeTime: formatRelativeTime,
        applyOwnerSort: applyOwnerSort,
        filterOwnerTrees: filterOwnerTrees,
        computeOwnerRenderSlice: computeOwnerRenderSlice,
        computeLastPageIndex: computeLastPageIndex,
        buildOwnerTreeRowHtml: buildOwnerTreeRowHtml
    };
})();
