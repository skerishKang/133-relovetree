(function () {
    function renderCommunityComments(options) {
        const listEl = options.listEl;
        if (!listEl) return;

        const comments = Array.isArray(options.comments) ? options.comments : [];
        if (!comments.length) {
            listEl.innerHTML = '<div class="community-comment-state">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>';
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
                ? '<button type="button" class="community-comment-delete" data-action="delete-comment" data-comment-id="' + escapeHtml(id) + '">삭제</button>'
                : '';

            return '\
                <div class="community-comment-row" data-comment-row="' + escapeHtml(id) + '">\
                    <div class="community-comment-head">\
                        <span class="community-comment-author">\
                            <span class="community-comment-author-name">' + author + '</span>\
                            ' + (isAi ? '<span class="community-comment-ai-badge">AI</span>' : '') + '\
                        </span>\
                        <div class="community-comment-meta">\
                            <span class="community-comment-date">' + created + '</span>\
                            ' + deleteBtn + '\
                        </div>\
                    </div>\
                    <p class="community-comment-copy">' + text + '</p>\
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
