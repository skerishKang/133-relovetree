(function () {
    function formatServerTimestamp(value) {
        if (!value) return '-';

        if (typeof value.toDate === 'function') {
            const d = value.toDate();
            return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        }

        if (typeof value === 'string' || value instanceof Date) {
            const d = new Date(value);
            if (!Number.isNaN(d.getTime())) {
                return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
            }
        }

        const seconds = value._seconds || value.seconds;
        if (typeof seconds === 'number') {
            const d = new Date(seconds * 1000);
            return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        }

        return '-';
    }

    function renderTreeListItem(item) {
        const demoBadge = item.isDemo ? ' <span class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">DEMO</span>' : '';
        const aiBadge = item.isAiBot ? ' <span class="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-semibold">AI</span>' : '';

        return `
        <td class="px-4 py-2">
            <div class="flex flex-col">
                <span class="text-xs font-semibold text-slate-900 truncate">${item.name || '(이름 없음)'}</span>
                <span class="text-[11px] text-slate-400 truncate">${item.id || ''}${demoBadge}${aiBadge}</span>
            </div>
        </td>
        <td class="px-4 py-2 text-[11px] text-slate-500">${item.ownerId || '—'}</td>
        <td class="px-4 py-2 text-[11px] text-slate-500">${item.nodeCount || 0}</td>
        <td class="px-4 py-2 text-[11px] text-slate-500">${item.viewCount || 0} / ${item.likeCount || 0} / ${item.shareCount || 0}</td>
        `;
    }

    function renderTreeListEmpty() {
        return '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">조건에 맞는 트리가 없습니다.</td></tr>';
    }

    function renderTreeListLoading() {
        return '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">트리 목록을 불러오는 중...</td></tr>';
    }

    function renderTreeListError(message) {
        return '<tr><td colspan="4" class="px-4 py-4 text-center text-red-500">' + (message || '오류가 발생했습니다.') + '</td></tr>';
    }

    function renderTreeNodesItem(node, index) {
        const momentsCount = Array.isArray(node.moments) ? node.moments.length : 0;
        const videoText = node.videoId ? `영상: ${node.videoId}` : '영상 없음';
        const momentsText = `모먼트 ${momentsCount}개`;

        return `
        <td class="px-4 py-2 text-[11px] text-slate-500">${node.id != null ? node.id : ''}</td>
        <td class="px-4 py-2 text-[11px] text-slate-900 truncate">${node.title || '(제목 없음)'}</td>
        <td class="px-4 py-2 text-[11px] text-slate-500">${node.date || ''}</td>
        <td class="px-4 py-2 text-[11px] text-slate-500">${videoText} · ${momentsText}</td>
        `;
    }

    function renderTreeNodesEmpty() {
        return '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">이 트리에 등록된 노드가 없습니다.</td></tr>';
    }

    function renderTreeNodesLoading() {
        return '<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400">트리 정보를 불러오는 중...</td></tr>';
    }

    function renderTreeNodesError(message) {
        return '<tr><td colspan="4" class="px-4 py-4 text-center text-red-500">' + (message || '오류가 발생했습니다.') + '</td></tr>';
    }

    function renderTreeDetail(tree) {
        const titleEl = document.getElementById('treeDetailTitle');
        const subtitleEl = document.getElementById('treeDetailSubtitle');
        const statsEl = document.getElementById('treeDetailStats');
        const metaEl = document.getElementById('treeMetaSummary');

        if (titleEl) {
            titleEl.textContent = tree.name || tree.id || '이름 없는 트리';
        }
        if (subtitleEl) {
            subtitleEl.textContent = tree.id ? `트리 ID: ${tree.id}` : '트리 ID 없음';
        }
        if (statsEl) {
            const nodeCount = typeof tree.nodeCount === 'number'
                ? tree.nodeCount
                : (Array.isArray(tree.nodes) ? tree.nodes.length : 0);
            const viewCount = typeof tree.viewCount === 'number' ? tree.viewCount : 0;
            const likeCount = typeof tree.likeCount === 'number'
                ? tree.likeCount
                : (Array.isArray(tree.likes) ? tree.likes.length : 0);
            const shareCount = typeof tree.shareCount === 'number' ? tree.shareCount : 0;

            statsEl.innerHTML =
                `<span>노드 ${nodeCount}</span>` +
                `<span> · 조회 ${viewCount}</span>` +
                `<span> · 좋아요 ${likeCount}</span>` +
                `<span> · 공유 ${shareCount}</span>`;
        }

        if (metaEl) {
            const owner = tree.ownerId || '—';
            const lastUpdatedText = formatServerTimestamp(tree.lastUpdated);
            const lastOpenedText = formatServerTimestamp(tree.lastOpened);
            metaEl.textContent = `소유자: ${owner} · 마지막 수정: ${lastUpdatedText} · 마지막 열람: ${lastOpenedText}`;
        }
    }

    window.AdminTreeRender = {
        formatServerTimestamp,
        renderTreeListItem,
        renderTreeListEmpty,
        renderTreeListLoading,
        renderTreeListError,
        renderTreeNodesItem,
        renderTreeNodesEmpty,
        renderTreeNodesLoading,
        renderTreeNodesError,
        renderTreeDetail
    };
})();