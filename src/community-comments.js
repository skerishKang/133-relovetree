(function () {
    function renderCommunityComments(options) {
        const listEl = options.listEl;
        if (!listEl) return;

        const comments = Array.isArray(options.comments) ? options.comments : [];
        if (!comments.length) {
            listEl.innerHTML = '<div class="text-xs text-slate-400">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>';
            return;
        }

        const currentUser = options.currentUser || null;
        const isAdmin = !!options.isAdmin;

        listEl.innerHTML = comments.map(function (item) {
            const id = item.id;
            const data = item.data || {};
            const author = escapeHtml(data.authorDisplayName || '익명');
            const created = formatCommunityDate(data.createdAt);
            const isAi = !!data.isAiBot;
            const isDeleted = data && data.isDeleted === true;
            const canDelete = !isDeleted && !!currentUser && (String(data.authorId || '') === String(currentUser.uid || '') || isAdmin);

            const text = isDeleted
                ? '<span class="text-slate-400">(삭제된 댓글입니다)</span>'
                : escapeHtml(data.content || '');

            const deletedInfo = isAdmin && isDeleted
                ? buildDeletedInfoHtmlForAdmin(data)
                : '';

            const deleteBtn = canDelete
                ? '<button type="button" class="text-[10px] font-bold text-red-600 hover:text-red-700" data-action="delete-comment" data-comment-id="' + escapeHtml(id) + '">삭제</button>'
                : '';

            return '\
                <div class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" data-comment-row="' + escapeHtml(id) + '">\
                    <div class="flex items-center justify-between mb-1 gap-2">\
                        <span class="text-xs font-semibold text-slate-700 flex items-center gap-1 min-w-0">\
                            <span class="truncate">' + author + '</span>\
                            ' + (isAi ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">AI</span>' : '') + '\
                        </span>\
                        <div class="shrink-0 flex items-center gap-2">\
                            <span class="text-[10px] text-slate-400">' + created + '</span>\
                            ' + deleteBtn + '\
                        </div>\
                    </div>\
                    <p class="text-xs text-slate-700 whitespace-pre-wrap">' + text + '</p>\
                    ' + deletedInfo + '\
                </div>\
            ';
        }).join('');

        listEl.querySelectorAll('button[data-action="delete-comment"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                options.onDelete(btn.getAttribute('data-comment-id') || '');
            });
        });
    }

    window.CommunityCommentsHelpers = {
        renderCommunityComments: renderCommunityComments
    };
})();
