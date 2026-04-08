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
            listEl.innerHTML = '<div class="text-center text-slate-400 text-sm py-10">첫 번째 댓글을 남겨보세요!</div>';
            return;
        }

        listEl.innerHTML = runtime.state.comments.map(function (comment) {
            return '\n' +
                '                <div class="flex gap-3">\n' +
                '                    <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">\n' +
                '                        ' + (comment.userName ? comment.userName[0].toUpperCase() : '?') + '\n' +
                '                    </div>\n' +
                '                    <div class="flex-1">\n' +
                '                        <div class="bg-white p-3 rounded-r-xl rounded-bl-xl border border-slate-100 shadow-sm">\n' +
                '                            <div class="flex justify-between items-center mb-1">\n' +
                '                                <span class="text-xs font-bold text-slate-700 flex items-center gap-1">\n' +
                '                                    <span>' + (comment.userName || '익명') + '</span>\n' +
                '                                    ' + (comment.isAiBot ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold">AI</span>' : '') + '\n' +
                '                                </span>\n' +
                '                                <span class="text-[10px] text-slate-400">' + new Date(comment.createdAt?.toDate()).toLocaleDateString() + '</span>\n' +
                '                            </div>\n' +
                '                            <p class="text-sm text-slate-800">' + comment.text + '</p>\n' +
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
