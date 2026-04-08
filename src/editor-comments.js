(function () {
    function loadComments(runtime) {
        if (!runtime.db) return;
        if (runtime.commentsUnsubscribe) runtime.commentsUnsubscribe();

        runtime.commentsUnsubscribe = runtime.db.collection('trees').doc(runtime.treeId).collection('comments')
            .orderBy('createdAt', 'asc')
            .onSnapshot(function (snapshot) {
                runtime.state.comments = [];
                snapshot.forEach(function (doc) {
                    runtime.state.comments.push({ id: doc.id, ...doc.data() });
                });
                updateCommentUI(runtime);
            });
    }

    function updateCommentUI(runtime) {
        const countEl = document.getElementById('comment-count');
        const modalCountEl = document.getElementById('modal-comment-count');
        const listEl = document.getElementById('comments-list');
        if (!countEl || !modalCountEl || !listEl) return;

        countEl.innerText = runtime.state.comments.length;
        modalCountEl.innerText = runtime.state.comments.length;

        if (runtime.state.comments.length === 0) {
            listEl.innerHTML = '<div class="editor-comments-empty">첫 번째 댓글을 남겨보세요!</div>';
            return;
        }

        listEl.innerHTML = runtime.state.comments.map(function (comment) {
            return '\n' +
                '                <div class="editor-comment-row">\n' +
                '                    <div class="editor-comment-avatar">\n' +
                '                        ' + (comment.userName ? comment.userName[0].toUpperCase() : '?') + '\n' +
                '                    </div>\n' +
                '                    <div class="editor-comment-content">\n' +
                '                        <div class="editor-comment-bubble">\n' +
                '                            <div class="editor-comment-head">\n' +
                '                                <span class="editor-comment-author">\n' +
                '                                    <span>' + (comment.userName || '익명') + '</span>\n' +
                '                                    ' + (comment.isAiBot ? '<span class="editor-comment-ai-badge">AI</span>' : '') + '\n' +
                '                                </span>\n' +
                '                                <span class="editor-comment-date">' + new Date(comment.createdAt?.toDate()).toLocaleDateString() + '</span>\n' +
                '                            </div>\n' +
                '                            <p class="editor-comment-copy">' + comment.text + '</p>\n' +
                '                        </div>\n' +
                '                    </div>\n' +
                '                </div>\n';
        }).join('');

        listEl.scrollTop = listEl.scrollHeight;
    }

    function openCommentsModal(runtime) {
        const modal = document.getElementById('comments-modal');
        if (!modal) return;
        modal.showModal();
        if (!runtime.commentsUnsubscribe && runtime.db) {
            loadComments(runtime);
        }
    }

    async function addComment(runtime, e) {
        e.preventDefault();
        if (!runtime.currentUser) {
            runtime.showToast('로그인이 필요합니다.');
            return;
        }

        const input = document.getElementById('new-comment-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        input.value = '';

        let userName = '익명';
        if (runtime.currentUser.displayName) {
            userName = runtime.currentUser.displayName;
        } else if (runtime.currentUser.email) {
            userName = runtime.currentUser.email.split('@')[0];
        } else if (runtime.currentUser.isAnonymous) {
            userName = 'Guest';
        }

        try {
            await runtime.db.collection('trees').doc(runtime.treeId).collection('comments').add({
                text: text,
                userId: runtime.currentUser.uid,
                userName: userName,
                createdAt: runtime.firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error adding comment:', error);
            runtime.showToast('댓글 등록 실패');
            input.value = text;
        }
    }

    window.EditorCommentHelpers = {
        loadComments: loadComments,
        updateCommentUI: updateCommentUI,
        openCommentsModal: openCommentsModal,
        addComment: addComment
    };
})();
